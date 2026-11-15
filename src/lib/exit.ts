import {calculateInvestment} from './investment';
import type {InvestmentInput} from './investment';
import type {AnnualProjection} from './projection';

export type ExitAssumptions = {
    capRatePercent: number;
    stampTaxMan: number;
    loanPayoffFeeMan: number;
    otherSaleCostMan: number;
    useLowPriceVacantPropertySpecial: boolean;
};

export type ExitValidationError = {
    field: keyof ExitAssumptions;
    message: string;
};

export type ExitScenario = {
    year: number;
    cumulativeOperatingCashFlowMan: number;
    noiMan: number;
    salePriceMan: number | null;
    brokerageFeeMan: number | null;
    stampTaxMan: number;
    loanPayoffFeeMan: number;
    otherSaleCostMan: number;
    remainingLoanBalanceMan: number;
    netSaleProceedsMan: number | null;
    totalProfitMan: number | null;
    simpleReturnPercent: number | null;
};

function isOneDecimalPlace(value: number): boolean {
    const scaledValue = value * 10;
    return Number.isFinite(scaledValue) &&
        Math.abs(scaledValue - Math.round(scaledValue)) <= 1e-8;
}

export function validateExitAssumptions(assumptions: ExitAssumptions): ExitValidationError[] {
    const errors: ExitValidationError[] = [];

    if (!Number.isFinite(assumptions.capRatePercent) ||
        assumptions.capRatePercent <= 0 ||
        assumptions.capRatePercent > 100
    ) {
        errors.push({
            field: 'capRatePercent',
            message: '想定売却利回りは0%より大きく100%以下で入力してください。',
        });
    } else if (Math.abs(assumptions.capRatePercent * 100 -
        Math.round(assumptions.capRatePercent * 100)) > 1e-8
    ) {
        errors.push({
            field: 'capRatePercent',
            message: '想定売却利回りは小数第2位まで入力してください。',
        });
    }

    const monetaryFields: (keyof Pick<
        ExitAssumptions,
        'stampTaxMan' | 'loanPayoffFeeMan' | 'otherSaleCostMan'
    >)[] = ['stampTaxMan', 'loanPayoffFeeMan', 'otherSaleCostMan'];

    monetaryFields.forEach((field) => {
        const value = assumptions[field];
        if (!Number.isFinite(value) || value < 0) {
            errors.push({field, message: '売却費用は0以上の数値を入力してください。'});
        } else if (!isOneDecimalPlace(value)) {
            errors.push({field, message: '売却費用は0.1万円単位で入力してください。'});
        }
    });

    return errors;
}

export function calculateStandardBrokerageFeeCapMan(salePriceMan: number): number {
    if (!Number.isFinite(salePriceMan) || salePriceMan < 0) {
        throw new Error('売却価格は0以上の有限値で指定してください。');
    }

    const firstTierMan = Math.min(salePriceMan, 200);
    const secondTierMan = Math.max(Math.min(salePriceMan - 200, 200), 0);
    const thirdTierMan = Math.max(salePriceMan - 400, 0);

    return firstTierMan * 0.055 + secondTierMan * 0.044 + thirdTierMan * 0.033;
}

export function calculateExitScenarios(
    input: InvestmentInput,
    projections: AnnualProjection[],
    assumptions: ExitAssumptions
): ExitScenario[] {
    const errors = validateExitAssumptions(assumptions);
    if (errors.length > 0) {
        throw new Error(errors.map(({message}) => message).join(' '));
    }

    const totalProjectCostMan = calculateInvestment(input).totalProjectCostMan;
    const initialEquityMan = totalProjectCostMan - input.loanAmountMan;
    const capRate = assumptions.capRatePercent / 100;

    return projections.map((projection) => {
        const sharedCosts = {
            year: projection.year,
            cumulativeOperatingCashFlowMan: projection.cumulativeCashFlowMan,
            noiMan: projection.noiMan,
            stampTaxMan: assumptions.stampTaxMan,
            loanPayoffFeeMan: assumptions.loanPayoffFeeMan,
            otherSaleCostMan: assumptions.otherSaleCostMan,
            remainingLoanBalanceMan: projection.remainingLoanBalanceMan,
        };

        if (projection.noiMan <= 0) {
            return {
                ...sharedCosts,
                salePriceMan: null,
                brokerageFeeMan: null,
                netSaleProceedsMan: null,
                totalProfitMan: null,
                simpleReturnPercent: null,
            };
        }

        const salePriceMan = projection.noiMan / capRate;
        const useSpecial =
            assumptions.useLowPriceVacantPropertySpecial && salePriceMan <= 800;
        const brokerageFeeMan = useSpecial
            ? 33
            : calculateStandardBrokerageFeeCapMan(salePriceMan);
        const netSaleProceedsMan =
            salePriceMan -
            brokerageFeeMan -
            assumptions.stampTaxMan -
            assumptions.loanPayoffFeeMan -
            assumptions.otherSaleCostMan -
            projection.remainingLoanBalanceMan;
        const totalProfitMan =
            projection.cumulativeCashFlowMan + netSaleProceedsMan - initialEquityMan;

        return {
            ...sharedCosts,
            salePriceMan,
            brokerageFeeMan,
            netSaleProceedsMan,
            totalProfitMan,
            simpleReturnPercent: initialEquityMan <= 0
                ? null
                : totalProfitMan / initialEquityMan * 100,
        };
    });
}
