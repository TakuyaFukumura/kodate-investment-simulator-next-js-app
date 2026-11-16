'use client';

import {useMemo, useRef, useState} from 'react';
import type {InvestmentInput} from '../../lib/investment';
import type {ProjectionAssumptions, ProjectionValidationError,} from '../../lib/projection';
import {calculateProjection, validateProjectionAssumptions,} from '../../lib/projection';
import ExitPanel from './ExitPanel';
import ProjectionCharts from './ProjectionCharts';

type RepairEventValues = {
    id: string;
    year: string;
    label: string;
    amountMan: string;
};

type ProjectionPanelProps = Readonly<{
    baseInput: InvestmentInput;
    baseInputIsValid: boolean;
}>;

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-800';

function parseNumber(value: string): number {
    return value.trim() === '' ? Number.NaN : Number(value);
}

function formatMan(amount: number): string {
    return amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function formatRatio(amount: number | null): string {
    return amount === null
        ? '—'
        : `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}倍`;
}

export default function ProjectionPanel({baseInput, baseInputIsValid}: ProjectionPanelProps) {
    const [holdingYears, setHoldingYears] = useState('30');
    const [annualRentChangePercent, setAnnualRentChangePercent] = useState('0');
    const [annualOperatingCostChangePercent, setAnnualOperatingCostChangePercent] = useState('0');
    const [repairEvents, setRepairEvents] = useState<RepairEventValues[]>([]);
    const nextEventId = useRef(0);

    const assumptions = useMemo<ProjectionAssumptions>(() => ({
        holdingYears: parseNumber(holdingYears),
        annualRentChangePercent: parseNumber(annualRentChangePercent),
        annualOperatingCostChangePercent: parseNumber(annualOperatingCostChangePercent),
        repairEvents: repairEvents.map((event) => ({
            ...event,
            year: parseNumber(event.year),
            amountMan: parseNumber(event.amountMan),
        })),
    }), [annualOperatingCostChangePercent, annualRentChangePercent, holdingYears, repairEvents]);
    const errors = useMemo(
        () => validateProjectionAssumptions(assumptions),
        [assumptions]
    );
    const projections = useMemo(
        () => baseInputIsValid && errors.length === 0
            ? calculateProjection(baseInput, assumptions)
            : null,
        [assumptions, baseInput, baseInputIsValid, errors.length]
    );

    const getFieldError = (field: ProjectionValidationError['field'], eventId?: string) =>
        errors.find((error) => error.field === field && error.eventId === eventId)?.message;
    const updateRepairEvent = (
        id: string,
        field: keyof Omit<RepairEventValues, 'id'>,
        value: string
    ) => {
        setRepairEvents((current) => current.map((event) => (
            event.id === id ? {...event, [field]: value} : event
        )));
    };

    const finalProjection = projections?.at(-1) ?? null;

    return (
        <>
            <section
                aria-labelledby="projection-heading"
                className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
            >
                <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">購入後の長期予測</p>
                    <h2 id="projection-heading" className="mt-1 text-xl font-bold">運用収支とキャッシュフロー</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        1年目は基本試算の条件を使い、2年目以降に変化率を毎年反映します。空室月数は一定です。
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)]">
                    <div className="space-y-5">
                        <fieldset className="space-y-4">
                            <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">予測条件
                            </legend>
                            <div>
                                <label htmlFor="projection-holding-years" className="mb-1.5 block text-sm font-medium">
                                    保有期間（年）
                                </label>
                                <input
                                    id="projection-holding-years"
                                    type="number"
                                    min="1"
                                    max="50"
                                    step="1"
                                    value={holdingYears}
                                    onChange={(event) => setHoldingYears(event.target.value)}
                                    aria-invalid={Boolean(getFieldError('holdingYears'))}
                                    className={inputClassName}
                                />
                                {getFieldError('holdingYears') && (
                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{getFieldError('holdingYears')}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="projection-rent-change" className="mb-1.5 block text-sm font-medium">
                                    家賃の年間変化率（%）
                                </label>
                                <input
                                    id="projection-rent-change"
                                    type="number"
                                    min="-50"
                                    max="50"
                                    step="0.1"
                                    value={annualRentChangePercent}
                                    onChange={(event) => setAnnualRentChangePercent(event.target.value)}
                                    aria-invalid={Boolean(getFieldError('annualRentChangePercent'))}
                                    className={inputClassName}
                                />
                                {getFieldError('annualRentChangePercent') && (
                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{getFieldError('annualRentChangePercent')}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="projection-cost-change" className="mb-1.5 block text-sm font-medium">
                                    運営費の年間変化率（%）
                                </label>
                                <input
                                    id="projection-cost-change"
                                    type="number"
                                    min="-50"
                                    max="50"
                                    step="0.1"
                                    value={annualOperatingCostChangePercent}
                                    onChange={(event) => setAnnualOperatingCostChangePercent(event.target.value)}
                                    aria-invalid={Boolean(getFieldError('annualOperatingCostChangePercent'))}
                                    className={inputClassName}
                                />
                                {getFieldError('annualOperatingCostChangePercent') && (
                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{getFieldError('annualOperatingCostChangePercent')}</p>
                                )}
                            </div>
                        </fieldset>

                        <fieldset className="space-y-4">
                            <legend
                                className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">単発の修繕・設備交換
                            </legend>
                            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                                通常修繕費とは別に、発生年と費用を登録します。同じ年に複数登録できます。
                            </p>
                            {repairEvents.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">修繕予定はありません。</p>
                            ) : (
                                repairEvents.map((event, index) => {
                                    const eventNumber = index + 1;
                                    const yearError = getFieldError('repairYear', event.id);
                                    const labelError = getFieldError('repairLabel', event.id);
                                    const amountError = getFieldError('repairAmount', event.id);

                                    return (
                                        <div key={event.id}
                                             className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold">修繕予定 {eventNumber}</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setRepairEvents((current) => current.filter(({id}) => id !== event.id))}
                                                    className="text-sm font-medium text-red-700 underline underline-offset-2 dark:text-red-300"
                                                >
                                                    修繕予定 {eventNumber} を削除
                                                </button>
                                            </div>
                                            <div>
                                                <label htmlFor={`repair-year-${event.id}`}
                                                       className="mb-1 block text-xs font-medium">
                                                    発生年
                                                </label>
                                                <input
                                                    id={`repair-year-${event.id}`}
                                                    type="number"
                                                    min="1"
                                                    max={holdingYears}
                                                    step="1"
                                                    value={event.year}
                                                    onChange={(change) => updateRepairEvent(event.id, 'year', change.target.value)}
                                                    aria-invalid={Boolean(yearError)}
                                                    className={inputClassName}
                                                />
                                                {yearError &&
                                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{yearError}</p>}
                                            </div>
                                            <div>
                                                <label htmlFor={`repair-label-${event.id}`}
                                                       className="mb-1 block text-xs font-medium">
                                                    内容
                                                </label>
                                                <input
                                                    id={`repair-label-${event.id}`}
                                                    type="text"
                                                    value={event.label}
                                                    onChange={(change) => updateRepairEvent(event.id, 'label', change.target.value)}
                                                    aria-invalid={Boolean(labelError)}
                                                    className={inputClassName}
                                                />
                                                {labelError &&
                                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{labelError}</p>}
                                            </div>
                                            <div>
                                                <label htmlFor={`repair-amount-${event.id}`}
                                                       className="mb-1 block text-xs font-medium">
                                                    金額（万円）
                                                </label>
                                                <input
                                                    id={`repair-amount-${event.id}`}
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={event.amountMan}
                                                    onChange={(change) => updateRepairEvent(event.id, 'amountMan', change.target.value)}
                                                    aria-invalid={Boolean(amountError)}
                                                    className={inputClassName}
                                                />
                                                {amountError &&
                                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{amountError}</p>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    nextEventId.current += 1;
                                    setRepairEvents((current) => [
                                        ...current,
                                        {
                                            id: `repair-${nextEventId.current}`,
                                            year: '1',
                                            label: '修繕',
                                            amountMan: '',
                                        },
                                    ]);
                                }}
                                className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-950"
                            >
                                修繕予定を追加
                            </button>
                        </fieldset>
                    </div>

                    <div className="space-y-5">
                        {!baseInputIsValid && (
                            <output
                               className="block rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                                基本試算の入力が有効になると、長期予測を表示します。
                            </output>
                        )}
                        {projections && finalProjection && (
                            <>
                                <dl className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <dt className="text-xs text-slate-600 dark:text-slate-300">保有期間の累計運営CF</dt>
                                        <dd className="mt-1 font-bold tabular-nums">{formatMan(finalProjection.cumulativeCashFlowMan)} 万円</dd>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <dt className="text-xs text-slate-600 dark:text-slate-300">最終年の税引前CF</dt>
                                        <dd className="mt-1 font-bold tabular-nums">{formatMan(finalProjection.cashFlowMan)} 万円</dd>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <dt className="text-xs text-slate-600 dark:text-slate-300">最終年末のローン残債</dt>
                                        <dd className="mt-1 font-bold tabular-nums">{formatMan(finalProjection.remainingLoanBalanceMan)} 万円</dd>
                                    </div>
                                </dl>

                                <ProjectionCharts years={projections}/>

                                <div>
                                    <h3 className="mb-3 text-sm font-bold">年次収支・返済明細</h3>
                                    <div
                                        className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table
                                            className="min-w-[1500px] w-full border-collapse text-right text-xs tabular-nums">
                                            <caption className="sr-only">年次収支・返済明細（単位：万円）</caption>
                                            <thead
                                                className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            <tr>
                                                <th scope="col"
                                                    className="sticky left-0 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">年
                                                </th>
                                                <th scope="col" className="px-3 py-2">満室家賃</th>
                                                <th scope="col" className="px-3 py-2">空室損失</th>
                                                <th scope="col" className="px-3 py-2">有効家賃</th>
                                                <th scope="col" className="px-3 py-2">運営費</th>
                                                <th scope="col" className="px-3 py-2">NOI</th>
                                                <th scope="col" className="px-3 py-2">修繕費</th>
                                                <th scope="col" className="px-3 py-2">元本返済</th>
                                                <th scope="col" className="px-3 py-2">利息</th>
                                                <th scope="col" className="px-3 py-2">年間返済額</th>
                                                <th scope="col" className="px-3 py-2">年末残債</th>
                                                <th scope="col" className="px-3 py-2">税引前CF</th>
                                                <th scope="col" className="px-3 py-2">累計運営CF</th>
                                                <th scope="col" className="px-3 py-2">DSCR</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {projections.map((projection) => (
                                                <tr key={projection.year}
                                                    className="border-t border-slate-200 dark:border-slate-700">
                                                    <th scope="row"
                                                        className="sticky left-0 bg-white px-3 py-2 text-left font-semibold dark:bg-slate-900">
                                                        {projection.year}年目
                                                    </th>
                                                    <td className="px-3 py-2">{formatMan(projection.potentialAnnualRentMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.vacancyLossMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.effectiveAnnualRentMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.annualOperatingCostsMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.noiMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.repairCostsMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.principalRepaymentMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.interestRepaymentMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.loanRepaymentMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.remainingLoanBalanceMan)}</td>
                                                    <td className="px-3 py-2 font-semibold">{formatMan(projection.cashFlowMan)}</td>
                                                    <td className="px-3 py-2">{formatMan(projection.cumulativeCashFlowMan)}</td>
                                                    <td className="px-3 py-2">{formatRatio(projection.dscr)}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                    長期予測は入力した家賃・費用の変化率と修繕予定に基づく税引前の概算です。取得時支出・売却・税金は含まず、将来の収支や投資成果を保証しません。
                </p>
            </section>
            <ExitPanel baseInput={baseInput} projections={projections}/>
        </>
    );
}
