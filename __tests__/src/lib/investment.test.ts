import {
    calculateAnnualLoanSchedule,
    calculateInvestment,
    InvestmentInput,
    validateInvestmentInput,
} from '../../../src/lib/investment';

const baseInput: InvestmentInput = {
    purchasePriceMan: 800,
    monthlyRentMan: 8,
    brokerageFeeMan: 24,
    registrationFeeMan: 10,
    stampTaxMan: 1,
    acquisitionTaxMan: 8,
    loanFeeMan: 4,
    initialInsuranceMan: 2,
    otherAcquisitionCostMan: 1,
    renovationCostMan: 50,
    loanAmountMan: 500,
    annualInterestRatePercent: 0,
    loanTermYears: 20,
    vacancyMonths: 1,
    annualManagementFeeMan: 8,
    annualPropertyTaxMan: 6,
    annualInsuranceMan: 4,
    annualRoutineRepairsMan: 5,
    annualOtherOperatingCostMan: 2,
};

describe('calculateInvestment', () => {
    it('年次収支、利回り、ゼロ金利の元利均等返済を計算する', () => {
        const result = calculateInvestment(baseInput);

        expect(result.potentialAnnualRentMan).toBe(96);
        expect(result.vacancyLossMan).toBe(8);
        expect(result.effectiveAnnualRentMan).toBe(88);
        expect(result.annualOperatingCostsMan).toBe(25);
        expect(result.noiMan).toBe(63);
        expect(result.totalProjectCostMan).toBe(900);
        expect(result.grossYieldPercent).toBe(12);
        expect(result.netYieldPercent).toBeCloseTo(7);
        expect(result.annualLoanRepaymentMan).toBe(25);
        expect(result.annualCashFlowMan).toBe(38);
        expect(result.monthlyAverageCashFlowMan).toBeCloseTo(38 / 12);
        expect(result.dscr).toBe(2.52);
    });

    describe('calculateAnnualLoanSchedule', () => {
        it('月次返済を年単位に集計し、完済後は返済額と残債を0にする', () => {
            const schedule = calculateAnnualLoanSchedule(baseInput, 2);

            expect(schedule).toHaveLength(2);
            expect(schedule[0].principalMan).toBeCloseTo(25);
            expect(schedule[0].interestMan).toBe(0);
            expect(schedule[0].repaymentMan).toBeCloseTo(25);
            expect(schedule[0].remainingBalanceMan).toBeCloseTo(475);
            expect(schedule[1].repaymentMan).toBeCloseTo(25);
        });

        it('融資期間後の年は0を返し、最終回返済後の残債を0にする', () => {
            const schedule = calculateAnnualLoanSchedule({
                loanAmountMan: 120,
                annualInterestRatePercent: 2,
                loanTermYears: 1,
            }, 2);

            expect(schedule[0].repaymentMan).toBeGreaterThan(120);
            expect(schedule[0].remainingBalanceMan).toBe(0);
            expect(schedule[1]).toEqual({
                year: 2,
                principalMan: 0,
                interestMan: 0,
                repaymentMan: 0,
                remainingBalanceMan: 0,
            });
        });

        it('借入額0を全期間の返済なしとして扱う', () => {
            expect(calculateAnnualLoanSchedule({
                loanAmountMan: 0,
                annualInterestRatePercent: 0,
                loanTermYears: 0,
            }, 2).map(({repaymentMan, remainingBalanceMan}) => ({repaymentMan, remainingBalanceMan})))
                .toEqual([
                    {repaymentMan: 0, remainingBalanceMan: 0},
                    {repaymentMan: 0, remainingBalanceMan: 0},
                ]);
        });
    });

    it('利息ありの場合、月次元利均等返済を年額へ集計する', () => {
        const result = calculateInvestment({...baseInput, annualInterestRatePercent: 2});

        expect(result.annualLoanRepaymentMan).toBeCloseTo(30.36, 1);
        expect(result.annualCashFlowMan).toBeCloseTo(63 - result.annualLoanRepaymentMan);
    });

    it('借入額0では返済額を0、DSCRを算出不可にする', () => {
        const result = calculateInvestment({...baseInput, loanAmountMan: 0});

        expect(result.annualLoanRepaymentMan).toBe(0);
        expect(result.dscr).toBeNull();
    });

    it('空室12か月と大きな運営費による負のCFを計算する', () => {
        const result = calculateInvestment({
            ...baseInput,
            vacancyMonths: 12,
            annualManagementFeeMan: 20,
        });

        expect(result.effectiveAnnualRentMan).toBe(0);
        expect(result.annualCashFlowMan).toBeLessThan(0);
    });

    it('不正な入力では計算せず、項目と範囲のエラーを返す', () => {
        const errors = validateInvestmentInput({
            ...baseInput,
            purchasePriceMan: 0,
            annualInterestRatePercent: 31,
            vacancyMonths: 13,
        });

        expect(errors.map(({field}) => field)).toEqual([
            'purchasePriceMan',
            'annualInterestRatePercent',
            'vacancyMonths',
        ]);
        expect(() => calculateInvestment({...baseInput, purchasePriceMan: 0})).toThrow();
    });

    it('万円の金額は小数第1位までに制限し、入力金利の精度は維持する', () => {
        expect(validateInvestmentInput({...baseInput, monthlyRentMan: 8.15}))
            .toContainEqual({field: 'monthlyRentMan', message: '金額は0.1万円単位で入力してください。'});
        expect(validateInvestmentInput({...baseInput, monthlyRentMan: 8.1, annualInterestRatePercent: 2.123}))
            .toEqual([]);
    });
});
