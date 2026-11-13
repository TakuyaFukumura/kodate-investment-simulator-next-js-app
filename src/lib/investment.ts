export type InvestmentInput = {
    purchasePriceMan: number;
    monthlyRentMan: number;
    brokerageFeeMan: number;
    registrationFeeMan: number;
    stampTaxMan: number;
    acquisitionTaxMan: number;
    loanFeeMan: number;
    initialInsuranceMan: number;
    otherAcquisitionCostMan: number;
    renovationCostMan: number;
    loanAmountMan: number;
    annualInterestRatePercent: number;
    loanTermYears: number;
    vacancyMonths: number;
    annualManagementFeeMan: number;
    annualPropertyTaxMan: number;
    annualInsuranceMan: number;
    annualRoutineRepairsMan: number;
    annualOtherOperatingCostMan: number;
};

export type InvestmentInputField = keyof InvestmentInput;

export type InvestmentValidationError = {
    field: InvestmentInputField;
    message: string;
};

export type InvestmentResult = {
    potentialAnnualRentMan: number;
    vacancyLossMan: number;
    effectiveAnnualRentMan: number;
    annualOperatingCostsMan: number;
    noiMan: number;
    totalProjectCostMan: number;
    grossYieldPercent: number;
    netYieldPercent: number;
    annualLoanRepaymentMan: number;
    annualCashFlowMan: number;
    monthlyAverageCashFlowMan: number;
    dscr: number | null;
};

const monetaryFields: InvestmentInputField[] = [
    'purchasePriceMan',
    'monthlyRentMan',
    'brokerageFeeMan',
    'registrationFeeMan',
    'stampTaxMan',
    'acquisitionTaxMan',
    'loanFeeMan',
    'initialInsuranceMan',
    'otherAcquisitionCostMan',
    'renovationCostMan',
    'loanAmountMan',
    'annualManagementFeeMan',
    'annualPropertyTaxMan',
    'annualInsuranceMan',
    'annualRoutineRepairsMan',
    'annualOtherOperatingCostMan',
];

const annualOperatingCostFields: InvestmentInputField[] = [
    'annualManagementFeeMan',
    'annualPropertyTaxMan',
    'annualInsuranceMan',
    'annualRoutineRepairsMan',
    'annualOtherOperatingCostMan',
];

const acquisitionCostFields: InvestmentInputField[] = [
    'brokerageFeeMan',
    'registrationFeeMan',
    'stampTaxMan',
    'acquisitionTaxMan',
    'loanFeeMan',
    'initialInsuranceMan',
    'otherAcquisitionCostMan',
];

function exceedsDecimalPlaces(value: number, decimalPlaces: number): boolean {
    const scaledValue = value * 10 ** decimalPlaces;
    return !Number.isFinite(scaledValue) || Math.abs(scaledValue - Math.round(scaledValue)) > 1e-8;
}

export function validateInvestmentInput(input: InvestmentInput): InvestmentValidationError[] {
    const errors: InvestmentValidationError[] = [];

    for (const field of Object.keys(input) as InvestmentInputField[]) {
        if (!Number.isFinite(input[field])) {
            errors.push({field, message: '数値を入力してください。'});
        }
    }

    if (errors.length > 0) {
        return errors;
    }

    if (input.purchasePriceMan <= 0) {
        errors.push({field: 'purchasePriceMan', message: '物件価格は0より大きい値を入力してください。'});
    }

    for (const field of monetaryFields) {
        if (field !== 'purchasePriceMan' && input[field] < 0) {
            errors.push({field, message: '0以上の値を入力してください。'});
        }
        if (exceedsDecimalPlaces(input[field], 1)) {
            errors.push({field, message: '金額は0.1万円単位で入力してください。'});
        }
    }

    if (input.annualInterestRatePercent < 0 || input.annualInterestRatePercent > 30) {
        errors.push({field: 'annualInterestRatePercent', message: '年利は0〜30%の範囲で入力してください。'});
    }

    if (input.loanAmountMan > 0 && (
        !Number.isInteger(input.loanTermYears) ||
        input.loanTermYears < 1 ||
        input.loanTermYears > 50
    )) {
        errors.push({field: 'loanTermYears', message: '返済期間は1〜50年の整数で入力してください。'});
    }

    if (!Number.isInteger(input.vacancyMonths) || input.vacancyMonths < 0 || input.vacancyMonths > 12) {
        errors.push({field: 'vacancyMonths', message: '空室月数は0〜12か月の整数で入力してください。'});
    }

    return errors;
}

function sumFields(input: InvestmentInput, fields: InvestmentInputField[]): number {
    return fields.reduce((total, field) => total + input[field], 0);
}

export function calculateInvestment(input: InvestmentInput): InvestmentResult {
    const validationErrors = validateInvestmentInput(input);
    if (validationErrors.length > 0) {
        throw new Error(validationErrors.map(({message}) => message).join(' '));
    }

    const potentialAnnualRentMan = input.monthlyRentMan * 12;
    const vacancyLossMan = input.monthlyRentMan * input.vacancyMonths;
    const effectiveAnnualRentMan = potentialAnnualRentMan - vacancyLossMan;
    const annualOperatingCostsMan = sumFields(input, annualOperatingCostFields);
    const noiMan = effectiveAnnualRentMan - annualOperatingCostsMan;
    const totalProjectCostMan =
        input.purchasePriceMan +
        sumFields(input, acquisitionCostFields) +
        input.renovationCostMan;

    const repaymentCount = input.loanTermYears * 12;
    const monthlyInterestRate = input.annualInterestRatePercent / 1200;
    let annualLoanRepaymentMan = 0;
    if (input.loanAmountMan > 0) {
        const monthlyRepayment = monthlyInterestRate === 0
            ? input.loanAmountMan / repaymentCount
            : input.loanAmountMan * monthlyInterestRate /
            (1 - (1 + monthlyInterestRate) ** -repaymentCount);
        annualLoanRepaymentMan = monthlyRepayment * 12;
    }

    const annualCashFlowMan = noiMan - annualLoanRepaymentMan;

    return {
        potentialAnnualRentMan,
        vacancyLossMan,
        effectiveAnnualRentMan,
        annualOperatingCostsMan,
        noiMan,
        totalProjectCostMan,
        grossYieldPercent: potentialAnnualRentMan / input.purchasePriceMan * 100,
        netYieldPercent: noiMan / totalProjectCostMan * 100,
        annualLoanRepaymentMan,
        annualCashFlowMan,
        monthlyAverageCashFlowMan: annualCashFlowMan / 12,
        dscr: annualLoanRepaymentMan === 0 ? null : noiMan / annualLoanRepaymentMan,
    };
}
