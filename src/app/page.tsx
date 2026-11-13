'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import WaterfallChart from './components/WaterfallChart';
import {
    calculateInvestment,
    validateInvestmentInput,
} from '../lib/investment';
import type {InvestmentInput, InvestmentInputField, InvestmentResult} from '../lib/investment';
import {parsePropertyCsv} from '../lib/propertyCsv';
import type {PropertyScenario} from '../lib/propertyCsv';

type InputValues = Record<InvestmentInputField, string>;

const inputFieldOrder: InvestmentInputField[] = [
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
    'annualInterestRatePercent',
    'loanTermYears',
    'vacancyMonths',
    'annualManagementFeeMan',
    'annualPropertyTaxMan',
    'annualInsuranceMan',
    'annualRoutineRepairsMan',
    'annualOtherOperatingCostMan',
];

const inputDefinitions: Record<InvestmentInputField, {label: string; unit: string; step: string}> = {
    purchasePriceMan: {label: '物件価格', unit: '万円', step: '0.1'},
    monthlyRentMan: {label: '月額家賃', unit: '万円／月', step: '0.1'},
    brokerageFeeMan: {label: '仲介手数料', unit: '万円', step: '0.1'},
    registrationFeeMan: {label: '登記・司法書士費用', unit: '万円', step: '0.1'},
    stampTaxMan: {label: '印紙税', unit: '万円', step: '0.1'},
    acquisitionTaxMan: {label: '不動産取得税', unit: '万円', step: '0.1'},
    loanFeeMan: {label: '融資手数料', unit: '万円', step: '0.1'},
    initialInsuranceMan: {label: '火災・地震保険（初期費用）', unit: '万円', step: '0.1'},
    otherAcquisitionCostMan: {label: 'その他取得費用', unit: '万円', step: '0.1'},
    renovationCostMan: {label: '初回リフォーム費用', unit: '万円', step: '0.1'},
    loanAmountMan: {label: '借入額', unit: '万円', step: '0.1'},
    annualInterestRatePercent: {label: '年利', unit: '%／年', step: '0.01'},
    loanTermYears: {label: '返済期間', unit: '年', step: '1'},
    vacancyMonths: {label: '年間空室月数', unit: 'か月／年', step: '1'},
    annualManagementFeeMan: {label: '管理委託費', unit: '万円／年', step: '0.1'},
    annualPropertyTaxMan: {label: '固定資産税', unit: '万円／年', step: '0.1'},
    annualInsuranceMan: {label: '保険料', unit: '万円／年', step: '0.1'},
    annualRoutineRepairsMan: {label: '通常修繕費', unit: '万円／年', step: '0.1'},
    annualOtherOperatingCostMan: {label: 'その他', unit: '万円／年', step: '0.1'},
};

const fieldGroups: {title: string; fields: InvestmentInputField[]}[] = [
    {title: '物件・賃貸条件', fields: ['purchasePriceMan', 'monthlyRentMan', 'vacancyMonths']},
    {
        title: '取得費用・初回リフォーム',
        fields: [
            'brokerageFeeMan',
            'registrationFeeMan',
            'stampTaxMan',
            'acquisitionTaxMan',
            'loanFeeMan',
            'initialInsuranceMan',
            'otherAcquisitionCostMan',
            'renovationCostMan',
        ],
    },
    {
        title: '年間運営費',
        fields: [
            'annualManagementFeeMan',
            'annualPropertyTaxMan',
            'annualInsuranceMan',
            'annualRoutineRepairsMan',
            'annualOtherOperatingCostMan',
        ],
    },
    {title: '融資条件', fields: ['loanAmountMan', 'annualInterestRatePercent', 'loanTermYears']},
];

const initialInputValues = Object.fromEntries(inputFieldOrder.map((field) => [field, ''])) as InputValues;

async function fetchProperties(): Promise<PropertyScenario[]> {
    const response = await fetch('/data/sample-properties.csv');
    if (!response.ok) {
        throw new Error(`サンプルCSVを読み込めませんでした（HTTP ${response.status}）。`);
    }
    return parsePropertyCsv(await response.text());
}

function toInputValues(property: PropertyScenario): InputValues {
    return Object.fromEntries(
        inputFieldOrder.map((field) => [field, String(property[field])])
    ) as InputValues;
}

function parseInputValues(values: InputValues): InvestmentInput {
    return Object.fromEntries(
        inputFieldOrder.map((field) => [
            field,
            values[field].trim() === '' ? Number.NaN : Number(values[field]),
        ])
    ) as InvestmentInput;
}

function formatMan(amount: number): string {
    return amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function formatPercent(amount: number): string {
    return `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`;
}

function formatRatio(amount: number): string {
    return `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}倍`;
}

function readInvestmentResult(
    input: InvestmentInput,
    errors: ReturnType<typeof validateInvestmentInput>
): InvestmentResult | null {
    return errors.length === 0 ? calculateInvestment(input) : null;
}

export default function Home() {
    const [properties, setProperties] = useState<PropertyScenario[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [inputValues, setInputValues] = useState<InputValues>(initialInputValues);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let isCurrent = true;
        void fetchProperties()
            .then((loadedProperties) => {
                if (!isCurrent) {
                    return;
                }
                setProperties(loadedProperties);
                setSelectedPropertyId(loadedProperties[0].id);
                setInputValues(toInputValues(loadedProperties[0]));
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setLoadError(
                        error instanceof Error ? error.message : 'サンプルCSVの読み込みに失敗しました。'
                    );
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });
        return () => {
            isCurrent = false;
        };
    }, []);

    const retryLoadingProperties = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const loadedProperties = await fetchProperties();
            setProperties(loadedProperties);
            setSelectedPropertyId(loadedProperties[0].id);
            setInputValues(toInputValues(loadedProperties[0]));
        } catch (error) {
            setProperties([]);
            setSelectedPropertyId('');
            setLoadError(error instanceof Error ? error.message : 'サンプルCSVの読み込みに失敗しました。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const selectedProperty = properties.find(({id}) => id === selectedPropertyId) ?? null;
    const parsedInput = useMemo(() => parseInputValues(inputValues), [inputValues]);
    const validationErrors = useMemo(
        () => validateInvestmentInput(parsedInput),
        [parsedInput]
    );
    const result = useMemo(
        () => readInvestmentResult(parsedInput, validationErrors),
        [parsedInput, validationErrors]
    );
    const errorByField = new Map(
        validationErrors.map(({field, message}) => [field, message])
    );

    const updateField = (field: InvestmentInputField, value: string) => {
        setInputValues((current) => ({...current, [field]: value}));
    };

    const metrics = result ? [
        {label: '表面利回り', value: formatPercent(result.grossYieldPercent)},
        {label: '実質利回り', value: formatPercent(result.netYieldPercent)},
        {label: 'NOI', value: `${formatMan(result.noiMan)} 万円／年`},
        {label: '税引前年間CF', value: `${formatMan(result.annualCashFlowMan)} 万円／年`},
        {label: '税引前月平均CF', value: `${formatMan(result.monthlyAverageCashFlowMan)} 万円／月`},
        {label: '年間ローン返済額', value: `${formatMan(result.annualLoanRepaymentMan)} 万円／年`},
        {label: 'DSCR', value: result.dscr === null ? '—' : formatRatio(result.dscr)},
    ] : [];

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                        購入前の基本試算
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight">戸建て投資シミュレータ</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        同梱の架空サンプルを選び、条件を変更して年間収支を試算できます。入力値は保存されません。
                    </p>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <p role="status">サンプル物件を読み込んでいます...</p>
                    </div>
                ) : loadError ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                        <p role="alert">サンプルデータを利用できません：{loadError}</p>
                        <button
                            type="button"
                            onClick={() => void retryLoadingProperties()}
                            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                            再読み込み
                        </button>
                    </div>
                ) : selectedProperty ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <section
                            aria-labelledby="input-heading"
                            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                        >
                            <div className="mb-6">
                                <label htmlFor="property-select" className="mb-2 block text-sm font-semibold">
                                    サンプル物件
                                </label>
                                <select
                                    id="property-select"
                                    value={selectedProperty.id}
                                    onChange={(event) => {
                                        const property = properties.find(({id}) => id === event.target.value);
                                        if (property) {
                                            setSelectedPropertyId(property.id);
                                            setInputValues(toInputValues(property));
                                        }
                                    }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                                >
                                    {properties.map((property) => (
                                        <option key={property.id} value={property.id}>{property.name}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    {selectedProperty.description}
                                </p>
                            </div>

                            <h2 id="input-heading" className="mb-5 text-xl font-bold">試算条件</h2>
                            <div className="space-y-6">
                                {fieldGroups.map((group) => (
                                    <fieldset key={group.title}>
                                        <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {group.title}
                                        </legend>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {group.fields.map((field) => {
                                                const definition = inputDefinitions[field];
                                                const fieldError = errorByField.get(field);
                                                const inputId = `input-${field}`;
                                                const errorId = `${inputId}-error`;
                                                const min = field === 'purchasePriceMan' ? '0.1'
                                                    : field === 'annualInterestRatePercent' || field === 'vacancyMonths' ? '0'
                                                        : field === 'loanTermYears' ? '1' : '0';
                                                const max = field === 'annualInterestRatePercent' ? '30'
                                                    : field === 'vacancyMonths' ? '12'
                                                        : field === 'loanTermYears' ? '50' : undefined;

                                                return (
                                                    <div key={field}>
                                                        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
                                                            {definition.label}
                                                            <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                                                                （{definition.unit}）
                                                            </span>
                                                        </label>
                                                        <input
                                                            id={inputId}
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={min}
                                                            max={max}
                                                            step={definition.step}
                                                            value={inputValues[field]}
                                                            onChange={(event) => updateField(field, event.target.value)}
                                                            aria-invalid={Boolean(fieldError)}
                                                            aria-describedby={fieldError ? errorId : undefined}
                                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-800"
                                                        />
                                                        {fieldError && (
                                                            <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-300">
                                                                {fieldError}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                ))}
                            </div>
                        </section>

                        <section aria-labelledby="result-heading" className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                                <div className="mb-5 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 id="result-heading" className="text-xl font-bold">試算結果</h2>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">入力の変更に合わせて再計算します</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                        税引前
                                    </span>
                                </div>
                                {validationErrors.length > 0 ? (
                                    <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                                        入力内容を確認してください。有効な値になるまで試算結果を表示しません。
                                    </p>
                                ) : (
                                    <dl className="grid gap-3 sm:grid-cols-2">
                                        {metrics.map((metric) => (
                                            <div key={metric.label} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                                <dt className="text-sm text-slate-600 dark:text-slate-300">{metric.label}</dt>
                                                <dd className="mt-1 text-lg font-bold tabular-nums">{metric.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </div>

                            {result && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                                    <h2 className="mb-4 text-lg font-bold">年間収支の構成</h2>
                                    <WaterfallChart result={result}/>
                                </div>
                            )}

                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                                表示結果は入力条件に基づく税引前の概算です。税務・融資判断や実際の投資成果を保証するものではありません。
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </main>
    );
}
