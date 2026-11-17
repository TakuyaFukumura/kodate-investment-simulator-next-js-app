import {fireEvent, render, screen, within} from '@testing-library/react';
import ExitPanel from '../../../../src/app/components/ExitPanel';
import type {InvestmentInput} from '../../../../src/lib/investment';
import type {AnnualProjection} from '../../../../src/lib/projection';

const baseInput: InvestmentInput = {
    purchasePriceMan: 1000,
    monthlyRentMan: 10,
    brokerageFeeMan: 0,
    registrationFeeMan: 0,
    stampTaxMan: 0,
    acquisitionTaxMan: 0,
    loanFeeMan: 0,
    initialInsuranceMan: 0,
    otherAcquisitionCostMan: 0,
    renovationCostMan: 0,
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

const projections: AnnualProjection[] = [{
    year: 1,
    potentialAnnualRentMan: 60,
    vacancyLossMan: 0,
    effectiveAnnualRentMan: 60,
    annualOperatingCostsMan: 10,
    noiMan: 50,
    repairCostsMan: 0,
    principalRepaymentMan: 25,
    interestRepaymentMan: 0,
    loanRepaymentMan: 25,
    remainingLoanBalanceMan: 475,
    cashFlowMan: 25,
    cumulativeCashFlowMan: 25,
    dscr: 2,
}];

describe('ExitPanel', () => {
    it('想定利回り入力後に結果を表示し、費用変更と特例を即時反映する', () => {
        render(<ExitPanel baseInput={baseInput} projections={projections}/>);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('想定売却利回りは0%より大きく100%以下で入力してください。'))
            .toBeInTheDocument();
        expect(screen.getByLabelText('想定売却利回り（%）'))
            .toHaveAttribute('aria-describedby', 'exit-cap-rate-error');

        fireEvent.change(screen.getByLabelText('想定売却利回り（%）'), {target: {value: '10'}});
        fireEvent.change(screen.getByLabelText('印紙税（万円）'), {target: {value: '1'}});

        const row = screen.getByRole('row', {name: /1年/});
        expect(within(row).getByText('500.0')).toBeInTheDocument();
        expect(within(row).getByText('23.1')).toBeInTheDocument();
        expect(within(row).getByText('0.9')).toBeInTheDocument();
        expect(screen.getByRole('img', {name: '保有年数ごとの売却後総損益グラフ'}))
            .toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', {
            name: /800万円以下の低廉な空家等の媒介特例/,
        }));
        expect(within(row).getByText('33.0')).toBeInTheDocument();
    });

    it('無効な運用予測では出口計算を表示しない', () => {
        render(<ExitPanel baseInput={baseInput} projections={null}/>);

        expect(screen.getByText('基本試算と運用予測の入力が有効になると、売却結果を表示します。'))
            .toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
