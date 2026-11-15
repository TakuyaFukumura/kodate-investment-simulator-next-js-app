import {fireEvent, render, screen, within} from '@testing-library/react';
import ProjectionPanel from '../../../../src/app/components/ProjectionPanel';
import type {InvestmentInput} from '../../../../src/lib/investment';

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

describe('ProjectionPanel', () => {
    it('予測期間・修繕予定を編集し、年次表とグラフを更新する', () => {
        render(<ProjectionPanel baseInput={baseInput} baseInputIsValid/>);

        fireEvent.change(screen.getByLabelText('保有期間（年）'), {target: {value: '2'}});
        fireEvent.click(screen.getByRole('button', {name: '修繕予定を追加'}));
        fireEvent.change(screen.getByLabelText('発生年'), {target: {value: '2'}});
        fireEvent.change(screen.getByLabelText('内容'), {target: {value: '屋根修繕'}});
        fireEvent.change(screen.getByLabelText('金額（万円）'), {target: {value: '15'}});

        const yearTwoRow = screen.getByRole('row', {name: /2年目/});
        expect(within(yearTwoRow).getByText('15.0')).toBeInTheDocument();
        expect(within(yearTwoRow).getByText('75.0')).toBeInTheDocument();
        expect(screen.getByRole('img', {name: '年ごとの税引前キャッシュフロー推移グラフ'}))
            .toBeInTheDocument();
        expect(screen.getByRole('img', {name: '年ごとの年末ローン残債推移グラフ'}))
            .toBeInTheDocument();
    });

    it('無効な基本入力または修繕年では予測結果を表示しない', () => {
        const {rerender} = render(<ProjectionPanel baseInput={baseInput} baseInputIsValid={false}/>);
        expect(screen.getByText('基本試算の入力が有効になると、長期予測を表示します。')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();

        rerender(<ProjectionPanel baseInput={baseInput} baseInputIsValid/>);
        fireEvent.change(screen.getByLabelText('保有期間（年）'), {target: {value: '1'}});
        fireEvent.click(screen.getByRole('button', {name: '修繕予定を追加'}));
        fireEvent.change(screen.getByLabelText('発生年'), {target: {value: '2'}});

        expect(screen.getByText('修繕年は1〜1年の整数で入力してください。')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
