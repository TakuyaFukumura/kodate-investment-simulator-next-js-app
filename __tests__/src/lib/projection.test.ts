import {calculateProjection, validateProjectionAssumptions} from '../../../src/lib/projection';
import type {InvestmentInput} from '../../../src/lib/investment';
import type {ProjectionAssumptions} from '../../../src/lib/projection';

const baseInput: InvestmentInput = {
    purchasePriceMan: 800,
    monthlyRentMan: 10,
    brokerageFeeMan: 0,
    registrationFeeMan: 0,
    stampTaxMan: 0,
    acquisitionTaxMan: 0,
    loanFeeMan: 0,
    initialInsuranceMan: 0,
    otherAcquisitionCostMan: 0,
    renovationCostMan: 0,
    loanAmountMan: 100,
    annualInterestRatePercent: 0,
    loanTermYears: 1,
    vacancyMonths: 1,
    annualManagementFeeMan: 5,
    annualPropertyTaxMan: 5,
    annualInsuranceMan: 5,
    annualRoutineRepairsMan: 5,
    annualOtherOperatingCostMan: 0,
};

const baseAssumptions: ProjectionAssumptions = {
    holdingYears: 3,
    annualRentChangePercent: 10,
    annualOperatingCostChangePercent: 5,
    repairEvents: [{id: 'repair-1', year: 2, label: '屋根修繕', amountMan: 15}],
};

describe('calculateProjection', () => {
    it('年1を基本試算に合わせ、家賃・運営費の変化と修繕を年次CFに反映する', () => {
        const projection = calculateProjection(baseInput, baseAssumptions);

        expect(projection).toHaveLength(3);
        expect(projection[0]).toMatchObject({
            effectiveAnnualRentMan: 110,
            annualOperatingCostsMan: 20,
            noiMan: 90,
            remainingLoanBalanceMan: 0,
        });
        expect(projection[0].loanRepaymentMan).toBeCloseTo(100);
        expect(projection[0].cashFlowMan).toBeCloseTo(-10);
        expect(projection[0].cumulativeCashFlowMan).toBeCloseTo(-10);
        expect(projection[0].dscr).toBeCloseTo(0.9);
        expect(projection[1]).toMatchObject({
            effectiveAnnualRentMan: 121,
            annualOperatingCostsMan: 21,
            repairCostsMan: 15,
            loanRepaymentMan: 0,
            cashFlowMan: 85,
            dscr: null,
        });
        expect(projection[1].cumulativeCashFlowMan).toBeCloseTo(75);
        expect(projection[2].effectiveAnnualRentMan).toBeCloseTo(133.1);
        expect(projection[2].annualOperatingCostsMan).toBeCloseTo(22.05);
        expect(projection[2].repairCostsMan).toBe(0);
        expect(projection[2].cashFlowMan).toBeCloseTo(111.05);
        expect(projection[2].cumulativeCashFlowMan).toBeCloseTo(186.05);
    });

    it('家賃・費用の変化率0%、空室12か月、借入なしを処理する', () => {
        const projection = calculateProjection({
            ...baseInput,
            loanAmountMan: 0,
            vacancyMonths: 12,
        }, {
            holdingYears: 1,
            annualRentChangePercent: 0,
            annualOperatingCostChangePercent: 0,
            repairEvents: [],
        });

        expect(projection[0]).toMatchObject({
            potentialAnnualRentMan: 120,
            vacancyLossMan: 120,
            effectiveAnnualRentMan: 0,
            loanRepaymentMan: 0,
            remainingLoanBalanceMan: 0,
            dscr: null,
        });
    });

    it('無効な修繕年・金額・名称を拒否する', () => {
        const errors = validateProjectionAssumptions({
            ...baseAssumptions,
            holdingYears: 1,
            annualRentChangePercent: 51,
            repairEvents: [{id: 'repair-1', year: 2, label: ' ', amountMan: 0.15}],
        });

        expect(errors.map(({field}) => field)).toEqual([
            'annualRentChangePercent',
            'repairYear',
            'repairLabel',
            'repairAmount',
        ]);
        expect(() => calculateProjection(baseInput, {
            ...baseAssumptions,
            holdingYears: 1,
        })).toThrow();
    });
});
