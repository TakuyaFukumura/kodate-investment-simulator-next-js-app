'use client';

import {useMemo, useState} from 'react';
import type {InvestmentInput} from '../../lib/investment';
import type {ExitAssumptions, ExitScenario} from '../../lib/exit';
import {calculateExitScenarios, validateExitAssumptions,} from '../../lib/exit';
import type {AnnualProjection} from '../../lib/projection';
import ExitChart from './ExitChart';

type ExitPanelProps = Readonly<{
    baseInput: InvestmentInput;
    projections: AnnualProjection[] | null;
}>;

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-800';

function parseNumber(value: string): number {
    return value.trim() === '' ? Number.NaN : Number(value);
}

function formatMan(amount: number | null): string {
    return amount === null
        ? '算出不可'
        : amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function formatPercent(amount: number | null): string {
    return amount === null
        ? '—'
        : `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`;
}

function getErrorMessage(
    errors: ReturnType<typeof validateExitAssumptions>,
    field: keyof ExitAssumptions
): string | undefined {
    return errors.find((error) => error.field === field)?.message;
}

export default function ExitPanel({baseInput, projections}: ExitPanelProps) {
    const [capRatePercent, setCapRatePercent] = useState('');
    const [stampTaxMan, setStampTaxMan] = useState('0');
    const [loanPayoffFeeMan, setLoanPayoffFeeMan] = useState('0');
    const [otherSaleCostMan, setOtherSaleCostMan] = useState('0');
    const [useLowPriceVacantPropertySpecial, setUseLowPriceVacantPropertySpecial] = useState(false);

    const assumptions = useMemo<ExitAssumptions>(() => ({
        capRatePercent: parseNumber(capRatePercent),
        stampTaxMan: parseNumber(stampTaxMan),
        loanPayoffFeeMan: parseNumber(loanPayoffFeeMan),
        otherSaleCostMan: parseNumber(otherSaleCostMan),
        useLowPriceVacantPropertySpecial,
    }), [
        capRatePercent,
        loanPayoffFeeMan,
        otherSaleCostMan,
        stampTaxMan,
        useLowPriceVacantPropertySpecial,
    ]);
    const errors = useMemo(() => validateExitAssumptions(assumptions), [assumptions]);
    const scenarios = useMemo(
        () => projections && errors.length === 0
            ? calculateExitScenarios(baseInput, projections, assumptions)
            : null,
        [assumptions, baseInput, errors.length, projections]
    );
    const hasUnavailableSaleYear = scenarios?.some(({totalProfitMan}) => totalProfitMan === null) ?? false;

    const saleCostFields: {
        id: string;
        label: string;
        value: string;
        field: keyof ExitAssumptions;
        onChange: (value: string) => void;
    }[] = [
        {
            id: 'exit-stamp-tax',
            label: '印紙税（万円）',
            value: stampTaxMan,
            field: 'stampTaxMan',
            onChange: setStampTaxMan,
        },
        {
            id: 'exit-loan-payoff-fee',
            label: 'ローン完済手数料（万円）',
            value: loanPayoffFeeMan,
            field: 'loanPayoffFeeMan',
            onChange: setLoanPayoffFeeMan,
        },
        {
            id: 'exit-other-sale-cost',
            label: 'その他売却費用（万円）',
            value: otherSaleCostMan,
            field: 'otherSaleCostMan',
            onChange: setOtherSaleCostMan,
        },
    ];

    return (
        <section
            aria-labelledby="exit-heading"
            className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
        >
            <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">売却時の試算</p>
                <h2 id="exit-heading" className="mt-1 text-xl font-bold">売却後の手残りと投資全体の損益</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    各年末に売却する場合を試算します。想定売却利回りから売却価格を算出し、売却費用と年末残債を差し引きます。
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)]">
                <div className="space-y-5">
                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">売却条件</legend>
                        <div>
                            <label htmlFor="exit-cap-rate" className="mb-1.5 block text-sm font-medium">
                                想定売却利回り（%）
                            </label>
                            <input
                                id="exit-cap-rate"
                                type="number"
                                min="0.01"
                                max="100"
                                step="0.01"
                                value={capRatePercent}
                                onChange={(event) => setCapRatePercent(event.target.value)}
                                aria-invalid={Boolean(getErrorMessage(errors, 'capRatePercent'))}
                                className={inputClassName}
                            />
                            {getErrorMessage(errors, 'capRatePercent') && (
                                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                    {getErrorMessage(errors, 'capRatePercent')}
                                </p>
                            )}
                        </div>
                    </fieldset>

                    <fieldset className="space-y-4">
                        <legend className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">売却費用</legend>
                        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            仲介手数料は売却価格に応じた通常の法定上限額で計算します。以下3項目は全ての売却年で同じ金額を適用します。
                        </p>
                        {saleCostFields.map(({id, label, value, field, onChange}) => {
                            const error = getErrorMessage(errors, field);

                            return (
                                <div key={id}>
                                    <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
                                    <input
                                        id={id}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={value}
                                        onChange={(event) => onChange(event.target.value)}
                                        aria-invalid={Boolean(error)}
                                        className={inputClassName}
                                    />
                                    {error && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
                                </div>
                            );
                        })}
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <label className="flex items-start gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={useLowPriceVacantPropertySpecial}
                                    onChange={(event) => setUseLowPriceVacantPropertySpecial(event.target.checked)}
                                    className="mt-0.5 size-4 accent-emerald-700"
                                />
                                <span>800万円以下の低廉な空家等の媒介特例（上限33万円・税込）を適用する</span>
                            </label>
                            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                対象要件を満たし、売主の合意がある場合に選択してください。売却価格が800万円を超える年は通常の料率で計算します。
                            </p>
                        </div>
                    </fieldset>
                </div>

                <div className="space-y-5">
                    {!projections && (
                        <output
                           className="block rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            基本試算と運用予測の入力が有効になると、売却結果を表示します。
                        </output>
                    )}
                    {projections && errors.length > 0 && (
                        <output
                           className="block rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            売却条件を確認してください。有効な値になるまで売却結果を表示しません。
                        </output>
                    )}
                    {scenarios && (
                        <>
                            <ExitChart scenarios={scenarios}/>
                            <div>
                                <h3 className="mb-3 text-sm font-bold">保有年数別の売却・投資全体結果</h3>
                                <div
                                    className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table
                                        className="min-w-[1550px] w-full border-collapse text-right text-xs tabular-nums">
                                        <caption className="sr-only">保有年数別の売却・投資全体結果（単位：万円）</caption>
                                        <thead
                                            className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        <tr>
                                            <th scope="col"
                                                className="sticky left-0 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">売却年
                                            </th>
                                            <th scope="col" className="px-3 py-2">累計運営CF</th>
                                            <th scope="col" className="px-3 py-2">売却年NOI</th>
                                            <th scope="col" className="px-3 py-2">売却価格</th>
                                            <th scope="col" className="px-3 py-2">仲介手数料</th>
                                            <th scope="col" className="px-3 py-2">印紙税</th>
                                            <th scope="col" className="px-3 py-2">完済手数料</th>
                                            <th scope="col" className="px-3 py-2">その他費用</th>
                                            <th scope="col" className="px-3 py-2">売却時残債</th>
                                            <th scope="col" className="px-3 py-2">売却後手残り</th>
                                            <th scope="col" className="px-3 py-2">総損益</th>
                                            <th scope="col" className="px-3 py-2">単純損益率</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {scenarios.map((scenario: ExitScenario) => (
                                            <tr key={scenario.year}
                                                className="border-t border-slate-200 dark:border-slate-700">
                                                <th scope="row"
                                                    className="sticky left-0 bg-white px-3 py-2 text-left font-semibold dark:bg-slate-900">
                                                    {scenario.year}年
                                                </th>
                                                <td className="px-3 py-2">{formatMan(scenario.cumulativeOperatingCashFlowMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.noiMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.salePriceMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.brokerageFeeMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.stampTaxMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.loanPayoffFeeMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.otherSaleCostMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.remainingLoanBalanceMan)}</td>
                                                <td className="px-3 py-2">{formatMan(scenario.netSaleProceedsMan)}</td>
                                                <td className="px-3 py-2 font-semibold">{formatMan(scenario.totalProfitMan)}</td>
                                                <td className="px-3 py-2">{formatPercent(scenario.simpleReturnPercent)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {hasUnavailableSaleYear && (
                                <output className="block text-sm text-slate-600 dark:text-slate-300">
                                    NOIが0以下の年は売却価格を算出できないため、売却後手残りと総損益を表示していません。
                                </output>
                            )}
                        </>
                    )}
                </div>
            </div>

            <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                売却価格は想定利回りに基づく税引前概算です。譲渡税は含まず、仲介手数料も法定上限を用いた推定です。実際の売却価格・費用・損益を保証するものではありません。
            </p>
        </section>
    );
}
