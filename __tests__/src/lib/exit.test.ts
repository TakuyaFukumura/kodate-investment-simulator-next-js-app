import type {ExitAssumptions} from '../../../src/lib/exit';
import {
    calculateExitScenarios,
    calculateStandardBrokerageFeeCapMan,
    validateExitAssumptions
} from '../../../src/lib/exit';
import type {InvestmentInput} from '../../../src/lib/investment';
import type {AnnualProjection} from '../../../src/lib/projection';

const baseInput: InvestmentInput = {
    purchasePriceMan: 1000,
    monthlyRentMan: 10,
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
    vacancyMonths: 0,
    annualManagementFeeMan: 0,
    annualPropertyTaxMan: 0,
    annualInsuranceMan: 0,
    annualRoutineRepairsMan: 0,
    annualOtherOperatingCostMan: 0,
};

const assumptions: ExitAssumptions = {
    capRatePercent: 10,
    stampTaxMan: 1,
    loanPayoffFeeMan: 2,
    otherSaleCostMan: 3,
    useLowPriceVacantPropertySpecial: false,
};

const projections: AnnualProjection[] = [
    {
        year: 1,
        potentialAnnualRentMan: 120,
        vacancyLossMan: 0,
        effectiveAnnualRentMan: 120,
        annualOperatingCostsMan: 20,
        noiMan: 100,
        repairCostsMan: 0,
        principalRepaymentMan: 25,
        interestRepaymentMan: 0,
        loanRepaymentMan: 25,
        remainingLoanBalanceMan: 400,
        cashFlowMan: 30,
        cumulativeCashFlowMan: 30,
        dscr: 4,
    },
    {
        year: 2,
        potentialAnnualRentMan: 140,
        vacancyLossMan: 0,
        effectiveAnnualRentMan: 140,
        annualOperatingCostsMan: 20,
        noiMan: 120,
        repairCostsMan: 0,
        principalRepaymentMan: 25,
        interestRepaymentMan: 0,
        loanRepaymentMan: 25,
        remainingLoanBalanceMan: 300,
        cashFlowMan: 40,
        cumulativeCashFlowMan: 70,
        dscr: 5.6,
    },
];

describe('calculateStandardBrokerageFeeCapMan', () => {
    it.each([
        [0, 0],
        [200, 11],
        [400, 19.8],
        [800, 33],
        [1000, 39.6],
    ])('売却価格%s万円の通常上限を計算する', (salePriceMan, expectedFeeMan) => {
        expect(calculateStandardBrokerageFeeCapMan(salePriceMan)).toBeCloseTo(expectedFeeMan);
    });

    it('負の売却価格を拒否する', () => {
        expect(() => calculateStandardBrokerageFeeCapMan(-1)).toThrow();
    });
});

describe('calculateExitScenarios', () => {
    it('年ごとの売却価格・費用・残債・総損益・単純損益率を計算する', () => {
        const scenarios = calculateExitScenarios(baseInput, projections, assumptions);

        expect(scenarios[0]).toMatchObject({
            salePriceMan: 1000,
            stampTaxMan: 1,
            loanPayoffFeeMan: 2,
            otherSaleCostMan: 3,
            remainingLoanBalanceMan: 400,
            cumulativeOperatingCashFlowMan: 30,
        });
        expect(scenarios[0].brokerageFeeMan).toBeCloseTo(39.6);
        expect(scenarios[0].netSaleProceedsMan).toBeCloseTo(554.4);
        expect(scenarios[0].totalProfitMan).toBeCloseTo(-15.6);
        expect(scenarios[0].simpleReturnPercent).toBeCloseTo(-2.6);
        expect(scenarios[1].salePriceMan).toBe(1200);
        expect(scenarios[1].brokerageFeeMan).toBeCloseTo(46.2);
        expect(scenarios[1].netSaleProceedsMan).toBeCloseTo(847.8);
        expect(scenarios[1].totalProfitMan).toBeCloseTo(317.8);
        expect(scenarios[1].simpleReturnPercent).toBeCloseTo(317.8 / 600 * 100);
    });

    it('低廉な空家等の特例を選択した800万円以下の年だけ33万円を適用する', () => {
        const lowPriceYear = {...projections[0], noiMan: 50};
        const scenarios = calculateExitScenarios(baseInput, [lowPriceYear, projections[0]], {
            ...assumptions,
            useLowPriceVacantPropertySpecial: true,
        });

        expect(scenarios[0].salePriceMan).toBe(500);
        expect(scenarios[0].brokerageFeeMan).toBe(33);
        expect(scenarios[1].brokerageFeeMan).toBeCloseTo(39.6);
    });

    it('NOIが0以下の場合は売却価格と投資全体の出口指標を算出しない', () => {
        const scenario = calculateExitScenarios(
            baseInput,
            [{...projections[0], noiMan: 0}],
            assumptions
        )[0];

        expect(scenario.cumulativeOperatingCashFlowMan).toBe(30);
        expect(scenario.remainingLoanBalanceMan).toBe(400);
        expect(scenario.salePriceMan).toBeNull();
        expect(scenario.netSaleProceedsMan).toBeNull();
        expect(scenario.totalProfitMan).toBeNull();
        expect(scenario.simpleReturnPercent).toBeNull();
    });

    it('初期自己資金が0以下の場合は単純損益率だけを算出しない', () => {
        const scenario = calculateExitScenarios({
            ...baseInput,
            loanAmountMan: 1200,
        }, [projections[0]], assumptions)[0];

        expect(scenario.totalProfitMan).not.toBeNull();
        expect(scenario.simpleReturnPercent).toBeNull();
    });
});

describe('validateExitAssumptions', () => {
    it('利回りと費用の範囲・精度を検証する', () => {
        expect(validateExitAssumptions({...assumptions, capRatePercent: 0})).toContainEqual({
            field: 'capRatePercent',
            message: '想定売却利回りは0%より大きく100%以下で入力してください。',
        });
        expect(validateExitAssumptions({...assumptions, capRatePercent: 8.123})).toContainEqual({
            field: 'capRatePercent',
            message: '想定売却利回りは小数第2位まで入力してください。',
        });
        expect(validateExitAssumptions({...assumptions, otherSaleCostMan: 1.25})).toContainEqual({
            field: 'otherSaleCostMan',
            message: '売却費用は0.1万円単位で入力してください。',
        });
        expect(validateExitAssumptions({...assumptions, stampTaxMan: -1})).toContainEqual({
            field: 'stampTaxMan',
            message: '売却費用は0以上の数値を入力してください。',
        });
        expect(validateExitAssumptions(assumptions)).toEqual([]);
    });
});
