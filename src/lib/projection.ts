import {calculateAnnualLoanSchedule, calculateInvestment} from './investment';
import type {InvestmentInput} from './investment';

export type ProjectionRepairEvent = {
    id: string;
    year: number;
    label: string;
    amountMan: number;
};

export type ProjectionAssumptions = {
    holdingYears: number;
    annualRentChangePercent: number;
    annualOperatingCostChangePercent: number;
    repairEvents: ProjectionRepairEvent[];
};

export type ProjectionValidationError = {
    field:
        | 'holdingYears'
        | 'annualRentChangePercent'
        | 'annualOperatingCostChangePercent'
        | 'repairYear'
        | 'repairLabel'
        | 'repairAmount';
    eventId?: string;
    message: string;
};

export type AnnualProjection = {
    year: number;
    potentialAnnualRentMan: number;
    vacancyLossMan: number;
    effectiveAnnualRentMan: number;
    annualOperatingCostsMan: number;
    noiMan: number;
    repairCostsMan: number;
    principalRepaymentMan: number;
    interestRepaymentMan: number;
    loanRepaymentMan: number;
    remainingLoanBalanceMan: number;
    cashFlowMan: number;
    cumulativeCashFlowMan: number;
    dscr: number | null;
};

function isWithinRange(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
}

function isOneDecimalPlace(value: number): boolean {
    const scaledValue = value * 10;
    return Number.isFinite(scaledValue) &&
        Math.abs(scaledValue - Math.round(scaledValue)) <= 1e-8;
}

export function validateProjectionAssumptions(
    assumptions: ProjectionAssumptions
): ProjectionValidationError[] {
    const errors: ProjectionValidationError[] = [];
    const holdingYearsIsValid = Number.isInteger(assumptions.holdingYears) &&
        isWithinRange(assumptions.holdingYears, 1, 50);

    if (!holdingYearsIsValid) {
        errors.push({field: 'holdingYears', message: '保有期間は1〜50年の整数で入力してください。'});
    }

    if (!isWithinRange(assumptions.annualRentChangePercent, -50, 50)) {
        errors.push({
            field: 'annualRentChangePercent',
            message: '家賃の年間変化率は-50〜50%の範囲で入力してください。',
        });
    }

    if (!isWithinRange(assumptions.annualOperatingCostChangePercent, -50, 50)) {
        errors.push({
            field: 'annualOperatingCostChangePercent',
            message: '運営費の年間変化率は-50〜50%の範囲で入力してください。',
        });
    }

    const seenIds = new Set<string>();
    assumptions.repairEvents.forEach((event) => {
        if (!event.id || seenIds.has(event.id)) {
            errors.push({
                field: 'repairLabel',
                eventId: event.id,
                message: '修繕予定の識別情報が重複しています。',
            });
        }
        seenIds.add(event.id);

        const validYear = Number.isInteger(event.year) &&
            isWithinRange(event.year, 1, holdingYearsIsValid ? assumptions.holdingYears : 50);
        if (!validYear) {
            errors.push({
                field: 'repairYear',
                eventId: event.id,
                message: holdingYearsIsValid
                    ? `修繕年は1〜${assumptions.holdingYears}年の整数で入力してください。`
                    : '修繕年は1〜50年の整数で入力してください。',
            });
        }

        if (event.label.trim() === '') {
            errors.push({
                field: 'repairLabel',
                eventId: event.id,
                message: '修繕内容を入力してください。',
            });
        }

        if (!Number.isFinite(event.amountMan) || event.amountMan <= 0) {
            errors.push({
                field: 'repairAmount',
                eventId: event.id,
                message: '修繕費は0より大きい金額を入力してください。',
            });
        } else if (!isOneDecimalPlace(event.amountMan)) {
            errors.push({
                field: 'repairAmount',
                eventId: event.id,
                message: '修繕費は0.1万円単位で入力してください。',
            });
        }
    });

    return errors;
}

export function calculateProjection(
    input: InvestmentInput,
    assumptions: ProjectionAssumptions
): AnnualProjection[] {
    const assumptionErrors = validateProjectionAssumptions(assumptions);
    if (assumptionErrors.length > 0) {
        throw new Error(assumptionErrors.map(({message}) => message).join(' '));
    }

    const baseResult = calculateInvestment(input);
    const loanSchedule = calculateAnnualLoanSchedule(input, assumptions.holdingYears);
    let cumulativeCashFlowMan = 0;

    return loanSchedule.map((loanYear) => {
        const year = loanYear.year;
        const rentFactor = (1 + assumptions.annualRentChangePercent / 100) ** (year - 1);
        const operatingCostFactor =
            (1 + assumptions.annualOperatingCostChangePercent / 100) ** (year - 1);
        const monthlyRentMan = input.monthlyRentMan * rentFactor;
        const potentialAnnualRentMan = monthlyRentMan * 12;
        const vacancyLossMan = monthlyRentMan * input.vacancyMonths;
        const effectiveAnnualRentMan = potentialAnnualRentMan - vacancyLossMan;
        const annualOperatingCostsMan = baseResult.annualOperatingCostsMan * operatingCostFactor;
        const noiMan = effectiveAnnualRentMan - annualOperatingCostsMan;
        const repairCostsMan = assumptions.repairEvents
            .filter((event) => event.year === year)
            .reduce((total, event) => total + event.amountMan, 0);
        const cashFlowMan = noiMan - loanYear.repaymentMan - repairCostsMan;
        cumulativeCashFlowMan += cashFlowMan;

        return {
            year,
            potentialAnnualRentMan,
            vacancyLossMan,
            effectiveAnnualRentMan,
            annualOperatingCostsMan,
            noiMan,
            repairCostsMan,
            principalRepaymentMan: loanYear.principalMan,
            interestRepaymentMan: loanYear.interestMan,
            loanRepaymentMan: loanYear.repaymentMan,
            remainingLoanBalanceMan: loanYear.remainingBalanceMan,
            cashFlowMan,
            cumulativeCashFlowMan,
            dscr: loanYear.repaymentMan === 0 ? null : noiMan / loanYear.repaymentMan,
        };
    });
}
