'use client';

import type {ChangeEvent, KeyboardEvent} from 'react';
import {useMemo, useRef, useState} from 'react';
import type {InvestmentInput, InvestmentInputField} from '../../lib/investment';
import {calculateInvestment, validateInvestmentInput} from '../../lib/investment';
import type {ExitAssumptions, ExitValidationError} from '../../lib/exit';
import {validateExitAssumptions} from '../../lib/exit';
import type {ProjectionValidationError} from '../../lib/projection';
import {calculateProjection, validateProjectionAssumptions} from '../../lib/projection';
import type {PropertyScenario} from '../../lib/propertyCsv';
import type {
    ScenarioConditions,
    ScenarioConditionsById,
    ScenarioId,
    ScenarioResults,
} from '../../lib/scenarioComparison';
import {
    calculateScenarioResults,
    createScenarioFilename,
    parseScenarioBundle,
    SCENARIO_IDS,
    SCENARIO_LABELS,
    serializeScenarioBundle,
    serializeScenarioResultsCsv,
} from '../../lib/scenarioComparison';
import WaterfallChart from './WaterfallChart';
import ProjectionCharts from './ProjectionCharts';
import ScenarioComparisonChart from './ScenarioComparisonChart';

type InputValues = Record<InvestmentInputField, string>;
type RepairEventValues = {
    id: string;
    year: string;
    label: string;
    amountMan: string;
};
type ScenarioForm = {
    propertyName: string;
    samplePropertyId: string;
    inputValues: InputValues;
    annualRentChangePercent: string;
    annualOperatingCostChangePercent: string;
    repairEvents: RepairEventValues[];
    capRatePercent: string;
    stampTaxMan: string;
    loanPayoffFeeMan: string;
    otherSaleCostMan: string;
    useLowPriceVacantPropertySpecial: boolean;
};
type ScenarioFormErrors = {
    propertyName: string | null;
    investment: ReturnType<typeof validateInvestmentInput>;
    projection: ProjectionValidationError[];
    exit: ExitValidationError[];
};

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

const inputDefinitions: Record<InvestmentInputField, { label: string; unit: string; step: string }> = {
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

const fieldGroups: { title: string; fields: InvestmentInputField[] }[] = [
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

const inputMinimums: Partial<Record<InvestmentInputField, string>> = {
    purchasePriceMan: '0.1',
    loanTermYears: '1',
};

const inputMaximums: Partial<Record<InvestmentInputField, string>> = {
    annualInterestRatePercent: '30',
    vacancyMonths: '12',
    loanTermYears: '50',
};

const metricRows = ['NOI', '年間運営CF', '売却後手残り', '総損益', '単純損益率'] as const;

const annualTableHeadings = [
    '満室想定家賃',
    '空室損失',
    '実効家賃',
    '運営費',
    'NOI',
    '修繕費',
    '元金返済',
    '利息返済',
    '年間返済額',
    '年末残債',
    '年次運営CF',
    '累計運営CF',
    'DSCR',
    '売却価格',
    '仲介手数料',
    '印紙税',
    'ローン完済手数料',
    'その他売却費用',
    '売却後手残り',
    '総損益',
    '単純損益率',
] as const;

const annualTableViews = [
    {id: 'summary', label: '主要指標', columns: [4, 9, 10, 18, 19]},
    {id: 'operations', label: '運営', columns: [0, 1, 2, 3, 4, 5, 10, 11]},
    {id: 'financing', label: '融資', columns: [6, 7, 8, 9, 12]},
    {id: 'sale', label: '売却', columns: [13, 14, 15, 16, 17, 18, 19, 20]},
    {id: 'all', label: '全項目', columns: annualTableHeadings.map((_, index) => index)},
] as const;
type AnnualTableViewId = (typeof annualTableViews)[number]['id'];

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-800';
const cardClassName = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6';

function parseNumber(value: string): number {
    return value.trim() === '' ? Number.NaN : Number(value);
}

function toInputValues(input: InvestmentInput): InputValues {
    return Object.fromEntries(
        inputFieldOrder.map((field) => [field, String(input[field])])
    ) as InputValues;
}

function parseInputValues(values: InputValues): InvestmentInput {
    return Object.fromEntries(
        inputFieldOrder.map((field) => [field, parseNumber(values[field])])
    ) as InvestmentInput;
}

function createScenarioForm(property: PropertyScenario): ScenarioForm {
    return {
        propertyName: property.name,
        samplePropertyId: property.id,
        inputValues: toInputValues(property),
        annualRentChangePercent: '0',
        annualOperatingCostChangePercent: '0',
        repairEvents: [],
        capRatePercent: '',
        stampTaxMan: '0',
        loanPayoffFeeMan: '0',
        otherSaleCostMan: '0',
        useLowPriceVacantPropertySpecial: false,
    };
}

function cloneScenarioForm(form: ScenarioForm): ScenarioForm {
    return {
        ...form,
        inputValues: {...form.inputValues},
        repairEvents: form.repairEvents.map((event) => ({...event})),
    };
}

function createInitialScenarioForms(properties: PropertyScenario[]): Record<ScenarioId, ScenarioForm> {
    const baseline = createScenarioForm(properties[0]);
    return {
        baseline,
        optimistic: cloneScenarioForm(baseline),
        cautious: cloneScenarioForm(baseline),
    };
}

function toScenarioConditions(form: ScenarioForm): ScenarioConditions {
    return {
        propertyName: form.propertyName,
        investment: parseInputValues(form.inputValues),
        projection: {
            annualRentChangePercent: parseNumber(form.annualRentChangePercent),
            annualOperatingCostChangePercent: parseNumber(form.annualOperatingCostChangePercent),
            repairEvents: form.repairEvents.map((event) => ({
                id: event.id,
                year: parseNumber(event.year),
                label: event.label,
                amountMan: parseNumber(event.amountMan),
            })),
        },
        exit: {
            capRatePercent: parseNumber(form.capRatePercent),
            stampTaxMan: parseNumber(form.stampTaxMan),
            loanPayoffFeeMan: parseNumber(form.loanPayoffFeeMan),
            otherSaleCostMan: parseNumber(form.otherSaleCostMan),
            useLowPriceVacantPropertySpecial: form.useLowPriceVacantPropertySpecial,
        },
    };
}

function toScenarioForm(
    conditions: ScenarioConditions
): ScenarioForm {
    return {
        propertyName: conditions.propertyName,
        samplePropertyId: '',
        inputValues: toInputValues(conditions.investment),
        annualRentChangePercent: String(conditions.projection.annualRentChangePercent),
        annualOperatingCostChangePercent: String(conditions.projection.annualOperatingCostChangePercent),
        repairEvents: conditions.projection.repairEvents.map((event) => ({
            id: event.id,
            year: String(event.year),
            label: event.label,
            amountMan: String(event.amountMan),
        })),
        capRatePercent: String(conditions.exit.capRatePercent),
        stampTaxMan: String(conditions.exit.stampTaxMan),
        loanPayoffFeeMan: String(conditions.exit.loanPayoffFeeMan),
        otherSaleCostMan: String(conditions.exit.otherSaleCostMan),
        useLowPriceVacantPropertySpecial: conditions.exit.useLowPriceVacantPropertySpecial,
    };
}

function validateScenarioForm(
    form: ScenarioForm,
    holdingYears: number
): ScenarioFormErrors {
    const conditions = toScenarioConditions(form);
    const projectionErrors = validateProjectionAssumptions({
        ...conditions.projection,
        holdingYears,
    }).filter(({field}) => field !== 'holdingYears');
    return {
        propertyName: form.propertyName.trim() === '' ? '物件名を入力してください。' : null,
        investment: validateInvestmentInput(conditions.investment),
        projection: projectionErrors,
        exit: validateExitAssumptions(conditions.exit),
    };
}

function isScenarioFormValid(errors: ScenarioFormErrors): boolean {
    return !errors.propertyName &&
        errors.investment.length === 0 &&
        errors.projection.length === 0 &&
        errors.exit.length === 0;
}

function formatMan(amount: number | null): string {
    return amount === null
        ? '—'
        : amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function formatPercent(amount: number | null): string {
    return amount === null
        ? '—'
        : `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`;
}

function formatRatio(amount: number | null): string {
    return amount === null
        ? '—'
        : `${amount.toLocaleString('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2})}倍`;
}

function getInvestmentError(
    errors: ScenarioFormErrors,
    field: InvestmentInputField
): string | undefined {
    return errors.investment.find((error) => error.field === field)?.message;
}

function getProjectionError(
    errors: ScenarioFormErrors,
    field: ProjectionValidationError['field'],
    eventId?: string
): string | undefined {
    return errors.projection.find((error) =>
        error.field === field && error.eventId === eventId
    )?.message;
}

function getExitError(
    errors: ScenarioFormErrors,
    field: keyof ExitAssumptions
): string | undefined {
    return errors.exit.find((error) => error.field === field)?.message;
}

function getProjectionErrorLabel(
    field: ProjectionValidationError['field'],
    eventIndex: number
): string {
    switch (field) {
        case 'holdingYears':
            return '保有期間';
        case 'annualRentChangePercent':
            return '家賃の年間変化率';
        case 'annualOperatingCostChangePercent':
            return '運営費の年間変化率';
        case 'repairYear':
            return `修繕予定${eventIndex}の発生年`;
        case 'repairLabel':
            return `修繕予定${eventIndex}の内容`;
        case 'repairAmount':
            return `修繕予定${eventIndex}の金額`;
    }
}

function formatScenarioMetric(
    metricLabel: (typeof metricRows)[number],
    projection: ScenarioResults['projections'][number] | undefined,
    exit: ScenarioResults['exits'][number] | undefined
): string {
    switch (metricLabel) {
        case 'NOI':
            return formatMan(projection?.noiMan ?? null);
        case '年間運営CF':
            return formatMan(projection?.cashFlowMan ?? null);
        case '売却後手残り':
            return formatMan(exit?.netSaleProceedsMan ?? null);
        case '総損益':
            return formatMan(exit?.totalProfitMan ?? null);
        case '単純損益率':
            return formatPercent(exit?.simpleReturnPercent ?? null);
    }
}

function getScenarioErrorSummary(
    scenarioId: ScenarioId,
    form: ScenarioForm,
    errors: ScenarioFormErrors
): string[] {
    const messages = [
        ...(errors.propertyName ? [`物件名: ${errors.propertyName}`] : []),
        ...errors.investment.map(({field, message}) => `${inputDefinitions[field].label}: ${message}`),
        ...errors.projection.map(({field, eventId, message}) => {
            const eventIndex = Math.max(
                1,
                form.repairEvents.findIndex((event) => event.id === eventId) + 1
            );
            const label = getProjectionErrorLabel(field, eventIndex);
            return `${label}: ${message}`;
        }),
        ...errors.exit.map(({field, message}) => {
            const fieldLabel: Record<keyof ExitAssumptions, string> = {
                capRatePercent: '想定売却利回り',
                stampTaxMan: '売却時の印紙税',
                loanPayoffFeeMan: 'ローン完済手数料',
                otherSaleCostMan: 'その他売却費用',
                useLowPriceVacantPropertySpecial: '低廉な空家等の媒介特例',
            };
            return `${fieldLabel[field]}: ${message}`;
        }),
    ];
    return messages.map((message) => `${SCENARIO_LABELS[scenarioId]}ケース — ${message}`);
}

function downloadFile(filename: string, contents: string, mimeType: string): void {
    const blob = new Blob([contents], {type: `${mimeType};charset=utf-8`});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function bundleFromConditions(
    holdingYears: number,
    conditions: ScenarioConditionsById
) {
    return {
        formatVersion: 1 as const,
        holdingYears,
        cases: conditions,
    };
}

function formatTableMan(amount: number | null): string {
    return amount === null ? '—' : formatMan(amount);
}

export default function ScenarioWorkspace(
    {properties}: Readonly<{ properties: PropertyScenario[] }>
) {
    const [cases, setCases] = useState(() => createInitialScenarioForms(properties));
    const [holdingYears, setHoldingYears] = useState('30');
    const [selectedYear, setSelectedYear] = useState(30);
    const [activeCase, setActiveCase] = useState<ScenarioId>('baseline');
    const [annualTableView, setAnnualTableView] = useState<AnnualTableViewId>('summary');
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const nextRepairId = useRef(0);

    const parsedHoldingYears = parseNumber(holdingYears);
    const holdingYearsError = !Number.isInteger(parsedHoldingYears) ||
    parsedHoldingYears < 1 ||
    parsedHoldingYears > 50
        ? '保有期間は1〜50年の整数で入力してください。'
        : null;

    const conditions = useMemo(() => Object.fromEntries(
        SCENARIO_IDS.map((scenarioId) => [
            scenarioId,
            toScenarioConditions(cases[scenarioId]),
        ])
    ) as ScenarioConditionsById, [cases]);
    const errorsByCase = useMemo(() => Object.fromEntries(
        SCENARIO_IDS.map((scenarioId) => [
            scenarioId,
            validateScenarioForm(cases[scenarioId], parsedHoldingYears),
        ])
    ) as Record<ScenarioId, ScenarioFormErrors>, [cases, parsedHoldingYears]);
    const allCasesAreValid = !holdingYearsError &&
        SCENARIO_IDS.every((scenarioId) => isScenarioFormValid(errorsByCase[scenarioId]));
    const results = useMemo(
        () => allCasesAreValid
            ? calculateScenarioResults(conditions, parsedHoldingYears)
            : null,
        [allCasesAreValid, conditions, parsedHoldingYears]
    );
    const currentForm = cases[activeCase];
    const currentErrors = errorsByCase[activeCase];
    const annualRentChangeError = getProjectionError(currentErrors, 'annualRentChangePercent');
    const annualOperatingCostChangeError = getProjectionError(
        currentErrors,
        'annualOperatingCostChangePercent'
    );
    const visibleAnnualColumns = annualTableViews.find(({id}) => id === annualTableView)?.columns ??
        annualTableViews[0].columns;
    const annualTableMinWidth = {
        summary: 'min-w-[880px]',
        operations: 'min-w-[1500px]',
        financing: 'min-w-[1050px]',
        sale: 'min-w-[1500px]',
        all: 'min-w-[2200px]',
    }[annualTableView];
    const allErrors = SCENARIO_IDS.flatMap((scenarioId) =>
        getScenarioErrorSummary(scenarioId, cases[scenarioId], errorsByCase[scenarioId])
    );
    const activeInvestmentResult = useMemo(
        () => currentErrors.investment.length === 0
            ? calculateInvestment(conditions[activeCase].investment)
            : null,
        [activeCase, conditions, currentErrors.investment.length]
    );
    const activeProjections = useMemo(() => {
        if (!activeInvestmentResult || holdingYearsError || currentErrors.projection.length > 0) {
            return null;
        }
        return calculateProjection(conditions[activeCase].investment, {
            ...conditions[activeCase].projection,
            holdingYears: parsedHoldingYears,
        });
    }, [
        activeCase,
        activeInvestmentResult,
        conditions,
        currentErrors.projection.length,
        holdingYearsError,
        parsedHoldingYears,
    ]);
    const finalActiveProjection = activeProjections?.[activeProjections.length - 1];
    const updateCase = (scenarioId: ScenarioId, update: (form: ScenarioForm) => ScenarioForm) => {
        setCases((current) => ({
            ...current,
            [scenarioId]: update(current[scenarioId]),
        }));
    };

    const handleCaseTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const currentIndex = SCENARIO_IDS.indexOf(activeCase);
        let nextIndex: number;
        if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % SCENARIO_IDS.length;
        } else if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + SCENARIO_IDS.length) % SCENARIO_IDS.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = SCENARIO_IDS.length - 1;
        } else {
            return;
        }
        event.preventDefault();
        const nextScenario = SCENARIO_IDS[nextIndex];
        setActiveCase(nextScenario);
        document.getElementById(`scenario-tab-${nextScenario}`)?.focus();
    };

    const updateInputField = (field: InvestmentInputField, value: string) => {
        updateCase(activeCase, (form) => ({
            ...form,
            inputValues: {...form.inputValues, [field]: value},
        }));
    };

    const handleSamplePropertyChange = (propertyId: string) => {
        if (propertyId === '') {
            updateCase(activeCase, (form) => ({...form, samplePropertyId: ''}));
            return;
        }
        const property = properties.find(({id}) => id === propertyId);
        if (!property) {
            return;
        }
        updateCase(activeCase, (form) => ({
            ...form,
            propertyName: property.name,
            samplePropertyId: property.id,
            inputValues: toInputValues(property),
        }));
    };

    const handleHoldingYearsChange = (value: string) => {
        setHoldingYears(value);
        const nextHoldingYears = parseNumber(value);
        if (Number.isInteger(nextHoldingYears) && nextHoldingYears >= 1 &&
            nextHoldingYears <= 50 && selectedYear > nextHoldingYears
        ) {
            setSelectedYear(nextHoldingYears);
        }
    };

    const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        setImportErrors([]);
        setFileError(null);
        try {
            const parsedJson: unknown = JSON.parse(await file.text());
            const parsedBundle = parseScenarioBundle(parsedJson);
            if (!parsedBundle.success) {
                setImportErrors(parsedBundle.errors);
                return;
            }
            const nextCases = Object.fromEntries(
                SCENARIO_IDS.map((scenarioId) => [
                    scenarioId,
                    toScenarioForm(parsedBundle.bundle.cases[scenarioId]),
                ])
            ) as Record<ScenarioId, ScenarioForm>;
            setCases(nextCases);
            setHoldingYears(String(parsedBundle.bundle.holdingYears));
            setSelectedYear(parsedBundle.bundle.holdingYears);
        } catch (error) {
            setFileError(error instanceof Error
                ? `JSONファイルを読み込めませんでした: ${error.message}`
                : 'JSONファイルを読み込めませんでした。');
        } finally {
            event.target.value = '';
        }
    };

    const handleExportConditions = () => {
        if (!allCasesAreValid) {
            return;
        }
        try {
            const bundle = bundleFromConditions(parsedHoldingYears, conditions);
            downloadFile(
                createScenarioFilename('conditions'),
                serializeScenarioBundle(bundle),
                'application/json'
            );
            setFileError(null);
        } catch (error) {
            setFileError(error instanceof Error
                ? `JSONファイルを作成できませんでした: ${error.message}`
                : 'JSONファイルを作成できませんでした。');
        }
    };

    const handleExportResults = () => {
        if (!results) {
            return;
        }
        try {
            downloadFile(
                createScenarioFilename('results'),
                serializeScenarioResultsCsv(results),
                'text/csv'
            );
            setFileError(null);
        } catch (error) {
            setFileError(error instanceof Error
                ? `CSVファイルを作成できませんでした: ${error.message}`
                : 'CSVファイルを作成できませんでした。');
        }
    };

    const addRepairEvent = () => {
        const existingIds = new Set(cases[activeCase].repairEvents.map(({id}) => id));
        let eventId: string;
        do {
            nextRepairId.current += 1;
            eventId = `repair-${nextRepairId.current}`;
        } while (existingIds.has(eventId));
        updateCase(activeCase, (form) => ({
            ...form,
            repairEvents: [
                ...form.repairEvents,
                {
                    id: eventId,
                    year: '1',
                    label: '修繕',
                    amountMan: '',
                },
            ],
        }));
    };

    const updateRepairEvent = (
        eventId: string,
        field: keyof Omit<RepairEventValues, 'id'>,
        value: string
    ) => {
        updateCase(activeCase, (form) => ({
            ...form,
            repairEvents: form.repairEvents.map((event) =>
                event.id === eventId ? {...event, [field]: value} : event
            ),
        }));
    };

    const removeRepairEvent = (eventId: string) => {
        updateCase(activeCase, (form) => ({
            ...form,
            repairEvents: form.repairEvents.filter(({id}) => id !== eventId),
        }));
    };

    return (
        <div className="space-y-6">
            <nav
                aria-label="シミュレーションの手順"
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
                <ol className="flex flex-wrap gap-2">
                    <li>
                        <a
                            href="#scenario-input"
                            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        >
                            1. 条件を設定
                        </a>
                    </li>
                    <li>
                        <a
                            href="#comparison"
                            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:hover:bg-slate-800"
                        >
                            2. 結果を比較
                        </a>
                    </li>
                </ol>
            </nav>

            <section
                id="scenario-input"
                aria-labelledby="scenario-input-heading"
                className={`${cardClassName} scroll-mt-24`}
            >
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            3ケース比較
                        </p>
                        <h2 id="scenario-input-heading" className="mt-1 text-xl font-bold">
                            試算条件
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            ケースごとに条件を編集できます。入力値は保存されません。
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleExportConditions}
                            disabled={!allCasesAreValid}
                            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-950"
                        >
                            条件JSONを出力
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                        >
                            条件JSONを取り込む
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            aria-label="条件JSONファイルを選択"
                            className="sr-only"
                            onChange={(event) => void handleImport(event)}
                        />
                    </div>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="試算ケース">
                    {SCENARIO_IDS.map((scenarioId) => (
                        <button
                            key={scenarioId}
                            type="button"
                            role="tab"
                            id={`scenario-tab-${scenarioId}`}
                            aria-selected={activeCase === scenarioId}
                            aria-controls="scenario-panel"
                            onClick={() => setActiveCase(scenarioId)}
                            onKeyDown={handleCaseTabKeyDown}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                                activeCase === scenarioId
                                    ? 'bg-emerald-700 text-white'
                                    : 'border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800'
                            }`}
                        >
                            {SCENARIO_LABELS[scenarioId]}
                        </button>
                    ))}
                </div>

                <div className="mb-6 max-w-xs">
                    <label htmlFor="shared-holding-years" className="mb-1.5 block text-sm font-semibold">
                        共通の保有期間（年）
                    </label>
                    <input
                        id="shared-holding-years"
                        type="number"
                        min="1"
                        max="50"
                        step="1"
                        value={holdingYears}
                        onChange={(event) => handleHoldingYearsChange(event.target.value)}
                        aria-invalid={Boolean(holdingYearsError)}
                        aria-describedby={holdingYearsError ? 'shared-holding-years-error' : undefined}
                        className={inputClassName}
                    />
                    {holdingYearsError && (
                        <p id="shared-holding-years-error" className="mt-1 text-xs text-red-700 dark:text-red-300">
                            {holdingYearsError}
                        </p>
                    )}
                </div>

                <div
                    id="scenario-panel"
                    role="tabpanel"
                    aria-labelledby={`scenario-tab-${activeCase}`}
                    className="space-y-6"
                >
                    <section className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                        <h3 className="mb-4 text-sm font-bold">物件情報</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor={`sample-property-${activeCase}`}
                                       className="mb-1.5 block text-sm font-medium">
                                    サンプル物件から条件を読み込む
                                </label>
                                <select
                                    id={`sample-property-${activeCase}`}
                                    value={currentForm.samplePropertyId}
                                    onChange={(event) => handleSamplePropertyChange(event.target.value)}
                                    className={inputClassName}
                                >
                                    <option value="">選択してください</option>
                                    {properties.map((property) => (
                                        <option key={property.id} value={property.id}>{property.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`property-name-${activeCase}`}
                                       className="mb-1.5 block text-sm font-medium">
                                    物件名
                                </label>
                                <input
                                    id={`property-name-${activeCase}`}
                                    type="text"
                                    value={currentForm.propertyName}
                                    onChange={(event) => updateCase(activeCase, (form) => ({
                                        ...form,
                                        propertyName: event.target.value,
                                    }))}
                                    aria-invalid={Boolean(currentErrors.propertyName)}
                                    aria-describedby={
                                        currentErrors.propertyName ? `property-name-${activeCase}-error` : undefined
                                    }
                                    className={inputClassName}
                                />
                                {currentErrors.propertyName && (
                                    <p id={`property-name-${activeCase}-error`}
                                       className="mt-1 text-xs text-red-700 dark:text-red-300">
                                        {currentErrors.propertyName}
                                    </p>
                                )}
                            </div>
                        </div>
                        {currentForm.samplePropertyId && (
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                                {properties.find(({id}) => id === currentForm.samplePropertyId)?.description}
                            </p>
                        )}
                    </section>

                    {fieldGroups.map((group) => (
                        <fieldset key={group.title}>
                            <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                {group.title}
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {group.fields.map((field) => {
                                    const definition = inputDefinitions[field];
                                    const error = getInvestmentError(currentErrors, field);
                                    const inputId = `input-${activeCase}-${field}`;
                                    const min = inputMinimums[field] ?? '0';
                                    const max = inputMaximums[field];
                                    return (
                                        <div key={field}>
                                            <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
                                                {definition.label}
                                                <span
                                                    className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
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
                                                value={currentForm.inputValues[field]}
                                                onChange={(event) => updateInputField(field, event.target.value)}
                                                aria-invalid={Boolean(error)}
                                                aria-describedby={error ? `${inputId}-error` : undefined}
                                                className={inputClassName}
                                            />
                                            {error && (
                                                <p id={`${inputId}-error`}
                                                   className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}

                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                            運用条件
                        </legend>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor={`rent-change-${activeCase}`}
                                       className="mb-1.5 block text-sm font-medium">
                                    家賃の年間変化率（%）
                                </label>
                                <input
                                    id={`rent-change-${activeCase}`}
                                    type="number"
                                    min="-50"
                                    max="50"
                                    step="0.1"
                                    value={currentForm.annualRentChangePercent}
                                    onChange={(event) => updateCase(activeCase, (form) => ({
                                        ...form,
                                        annualRentChangePercent: event.target.value,
                                    }))}
                                    aria-invalid={Boolean(annualRentChangeError)}
                                    aria-describedby={
                                        annualRentChangeError ? `rent-change-${activeCase}-error` : undefined
                                    }
                                    className={inputClassName}
                                />
                                {annualRentChangeError && (
                                    <p id={`rent-change-${activeCase}-error`}
                                       className="mt-1 text-xs text-red-700 dark:text-red-300">
                                        {annualRentChangeError}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label htmlFor={`cost-change-${activeCase}`}
                                       className="mb-1.5 block text-sm font-medium">
                                    運営費の年間変化率（%）
                                </label>
                                <input
                                    id={`cost-change-${activeCase}`}
                                    type="number"
                                    min="-50"
                                    max="50"
                                    step="0.1"
                                    value={currentForm.annualOperatingCostChangePercent}
                                    onChange={(event) => updateCase(activeCase, (form) => ({
                                        ...form,
                                        annualOperatingCostChangePercent: event.target.value,
                                    }))}
                                    aria-invalid={Boolean(annualOperatingCostChangeError)}
                                    aria-describedby={
                                        annualOperatingCostChangeError ? `cost-change-${activeCase}-error` : undefined
                                    }
                                    className={inputClassName}
                                />
                                {annualOperatingCostChangeError && (
                                    <p id={`cost-change-${activeCase}-error`}
                                       className="mt-1 text-xs text-red-700 dark:text-red-300">
                                        {annualOperatingCostChangeError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-semibold">単発の修繕・設備交換</h3>
                            <p className="mb-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                通常修繕費とは別に発生年と費用を登録します。同じ年に複数登録できます。
                            </p>
                            {currentForm.repairEvents.length === 0 ? (
                                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">修繕予定はありません。</p>
                            ) : (
                                <div className="mb-3 grid gap-3 md:grid-cols-2">
                                    {currentForm.repairEvents.map((repairEvent, index) => {
                                        const eventNumber = index + 1;
                                        const yearError = getProjectionError(currentErrors, 'repairYear', repairEvent.id);
                                        const labelError = getProjectionError(currentErrors, 'repairLabel', repairEvent.id);
                                        const amountError = getProjectionError(currentErrors, 'repairAmount', repairEvent.id);
                                        return (
                                            <div
                                                key={repairEvent.id}
                                                className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <h4 className="text-sm font-semibold">修繕予定 {eventNumber}</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRepairEvent(repairEvent.id)}
                                                        className="text-sm font-medium text-red-700 underline dark:text-red-300"
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div>
                                                        <label
                                                            htmlFor={`repair-year-${activeCase}-${repairEvent.id}`}
                                                            className="mb-1 block text-xs font-medium"
                                                        >
                                                            発生年
                                                        </label>
                                                        <input
                                                            id={`repair-year-${activeCase}-${repairEvent.id}`}
                                                            type="number"
                                                            min="1"
                                                            max={holdingYears}
                                                            step="1"
                                                            value={repairEvent.year}
                                                            onChange={(event) => updateRepairEvent(
                                                                repairEvent.id,
                                                                'year',
                                                                event.target.value
                                                            )}
                                                            aria-invalid={Boolean(yearError)}
                                                            aria-describedby={
                                                                yearError ? `repair-year-${activeCase}-${repairEvent.id}-error` : undefined
                                                            }
                                                            className={inputClassName}
                                                        />
                                                        {yearError &&
                                                            <p id={`repair-year-${activeCase}-${repairEvent.id}-error`}
                                                               className="mt-1 text-xs text-red-700 dark:text-red-300">{yearError}</p>}
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor={`repair-label-${activeCase}-${repairEvent.id}`}
                                                            className="mb-1 block text-xs font-medium"
                                                        >
                                                            内容
                                                        </label>
                                                        <input
                                                            id={`repair-label-${activeCase}-${repairEvent.id}`}
                                                            type="text"
                                                            value={repairEvent.label}
                                                            onChange={(event) => updateRepairEvent(
                                                                repairEvent.id,
                                                                'label',
                                                                event.target.value
                                                            )}
                                                            aria-invalid={Boolean(labelError)}
                                                            aria-describedby={
                                                                labelError ? `repair-label-${activeCase}-${repairEvent.id}-error` : undefined
                                                            }
                                                            className={inputClassName}
                                                        />
                                                        {labelError &&
                                                            <p id={`repair-label-${activeCase}-${repairEvent.id}-error`}
                                                               className="mt-1 text-xs text-red-700 dark:text-red-300">{labelError}</p>}
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor={`repair-amount-${activeCase}-${repairEvent.id}`}
                                                            className="mb-1 block text-xs font-medium"
                                                        >
                                                            金額（万円）
                                                        </label>
                                                        <input
                                                            id={`repair-amount-${activeCase}-${repairEvent.id}`}
                                                            type="number"
                                                            min="0.1"
                                                            step="0.1"
                                                            value={repairEvent.amountMan}
                                                            onChange={(event) => updateRepairEvent(
                                                                repairEvent.id,
                                                                'amountMan',
                                                                event.target.value
                                                            )}
                                                            aria-invalid={Boolean(amountError)}
                                                            aria-describedby={
                                                                amountError ? `repair-amount-${activeCase}-${repairEvent.id}-error` : undefined
                                                            }
                                                            className={inputClassName}
                                                        />
                                                        {amountError &&
                                                            <p id={`repair-amount-${activeCase}-${repairEvent.id}-error`}
                                                               className="mt-1 text-xs text-red-700 dark:text-red-300">{amountError}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={addRepairEvent}
                                className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-950"
                            >
                                修繕予定を追加
                            </button>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                            売却条件
                        </legend>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {([
                                ['capRatePercent', '想定売却利回り（%）', currentForm.capRatePercent, '0.01', '100'],
                                ['stampTaxMan', '印紙税（万円）', currentForm.stampTaxMan, '0', undefined],
                                ['loanPayoffFeeMan', 'ローン完済手数料（万円）', currentForm.loanPayoffFeeMan, '0', undefined],
                                ['otherSaleCostMan', 'その他売却費用（万円）', currentForm.otherSaleCostMan, '0', undefined],
                            ] as const).map(([field, label, value, min, max]) => {
                                const error = getExitError(currentErrors, field);
                                const inputId = `exit-${activeCase}-${field}`;
                                return (
                                    <div key={field}>
                                        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
                                            {label}
                                        </label>
                                        <input
                                            id={inputId}
                                            type="number"
                                            min={min}
                                            max={max}
                                            step={field === 'capRatePercent' ? '0.01' : '0.1'}
                                            value={value}
                                            onChange={(event) => updateCase(activeCase, (form) => ({
                                                ...form,
                                                [field]: event.target.value,
                                            }))}
                                            aria-invalid={Boolean(error)}
                                            aria-describedby={error ? `${inputId}-error` : undefined}
                                            className={inputClassName}
                                        />
                                        {error &&
                                            <p id={`${inputId}-error`}
                                               className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <label className="flex items-start gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={currentForm.useLowPriceVacantPropertySpecial}
                                    onChange={(event) => updateCase(activeCase, (form) => ({
                                        ...form,
                                        useLowPriceVacantPropertySpecial: event.target.checked,
                                    }))}
                                    className="mt-0.5 size-4 accent-emerald-700"
                                />
                                <span>800万円以下の低廉な空家等の媒介特例（上限33万円・税込）を適用する</span>
                            </label>
                            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                対象要件を満たし、売主の合意がある場合に選択してください。売却価格が800万円を超える年は通常の料率で計算します。
                            </p>
                        </div>
                    </fieldset>

                    {activeInvestmentResult && (
                        <section
                            aria-labelledby="basic-result-heading"
                            className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                        >
                            <h3 id="basic-result-heading" className="mb-4 text-sm font-bold">
                                選択ケースの基本試算
                            </h3>
                            <dl className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    ['表面利回り', formatPercent(activeInvestmentResult.grossYieldPercent)],
                                    ['実質利回り', formatPercent(activeInvestmentResult.netYieldPercent)],
                                    ['NOI', `${formatMan(activeInvestmentResult.noiMan)} 万円／年`],
                                    ['税引前年間CF', `${formatMan(activeInvestmentResult.annualCashFlowMan)} 万円／年`],
                                    ['税引前月平均CF', `${formatMan(activeInvestmentResult.monthlyAverageCashFlowMan)} 万円／月`],
                                    ['年間ローン返済額', `${formatMan(activeInvestmentResult.annualLoanRepaymentMan)} 万円／年`],
                                    ['DSCR', formatRatio(activeInvestmentResult.dscr)],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                        <dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt>
                                        <dd className="mt-1 text-sm font-bold tabular-nums">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                            <div>
                                <h4 className="mb-2 text-sm font-semibold">年間収支の構成</h4>
                                <WaterfallChart result={activeInvestmentResult}/>
                            </div>
                        </section>
                    )}
                </div>

                {!allCasesAreValid && (
                    <div
                        className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                        <p className="font-semibold">
                            3ケースすべての条件が有効になると、比較結果とファイル出力を利用できます。
                        </p>
                        {holdingYearsError && <p className="mt-2">共通条件 — {holdingYearsError}</p>}
                        {allErrors.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-1">
                                {allErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
                            </ul>
                        )}
                    </div>
                )}
                {(importErrors.length > 0 || fileError) && (
                    <div role="alert"
                         className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                        <p className="font-semibold">ファイルを処理できませんでした。現在のケース条件は変更していません。</p>
                        {fileError && <p className="mt-2">{fileError}</p>}
                        {importErrors.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-1">
                                {importErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </section>

            <section
                id="comparison"
                aria-labelledby="comparison-heading"
                className={`${cardClassName} scroll-mt-24 space-y-6`}
            >
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">比較結果</p>
                        <h2 id="comparison-heading" className="mt-1 text-xl font-bold">保有年数ごとの投資結果</h2>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <a
                            href="#scenario-input"
                            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:hover:bg-slate-800"
                        >
                            条件を編集
                        </a>
                        <div>
                            <label htmlFor="comparison-year" className="mb-1 block text-sm font-medium">
                                比較する保有年
                            </label>
                            <select
                                id="comparison-year"
                                value={selectedYear}
                                onChange={(event) => setSelectedYear(Number(event.target.value))}
                                disabled={!results}
                                className={inputClassName}
                            >
                                {Array.from(
                                    {
                                        length: Number.isInteger(parsedHoldingYears) &&
                                        parsedHoldingYears >= 1 && parsedHoldingYears <= 50
                                            ? parsedHoldingYears : 0
                                    },
                                    (_, index) => index + 1
                                ).map((year) => (
                                    <option key={year} value={year}>{year}年</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleExportResults}
                            disabled={!results}
                            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-950"
                        >
                            年次結果CSVを出力
                        </button>
                    </div>
                </div>

                {results ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            {metricRows.map((metricLabel) => (
                                <div key={metricLabel} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                    <h3 className="text-sm font-semibold">{metricLabel}</h3>
                                    <dl className="mt-3 space-y-2">
                                        {results.map((result) => {
                                            const projection = result.projections.find(({year}) => year === selectedYear);
                                            const exit = result.exits.find(({year}) => year === selectedYear);
                                            const value = formatScenarioMetric(metricLabel, projection, exit);
                                            return (
                                                <div key={result.id} className="flex justify-between gap-2 text-sm">
                                                    <dt className="text-slate-600 dark:text-slate-300">
                                                        {SCENARIO_LABELS[result.id]}
                                                    </dt>
                                                    <dd className="font-bold tabular-nums">{value}</dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>
                            ))}
                        </div>

                        <ScenarioComparisonChart results={results}/>

                        <div>
                            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                                <h3 id="annual-detail-table-heading" className="text-sm font-bold">
                                    年次運用・融資・売却詳細
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    金額：万円、率・DSCR：小数第2位まで
                                </p>
                            </div>
                            <div
                                role="group"
                                aria-label="年次詳細表の表示項目"
                                className="mb-3 flex flex-wrap gap-2"
                            >
                                {annualTableViews.map(({id, label}) => (
                                    <button
                                        key={id}
                                        type="button"
                                        aria-pressed={annualTableView === id}
                                        onClick={() => setAnnualTableView(id)}
                                        className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                                            annualTableView === id
                                                ? 'bg-emerald-700 text-white'
                                                : 'border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                                表示項目を切り替えられます。表は左右にスクロールできます。
                            </p>
                            <div
                                tabIndex={0}
                                aria-label="年次詳細表。左右にスクロールできます"
                                className="overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-700"
                            >
                                <table
                                    className={`${annualTableMinWidth} w-full border-collapse text-right text-xs tabular-nums`}>
                                    <caption className="sr-only">
                                        基準・楽観・慎重ケースの年次運用・融資・売却詳細
                                    </caption>
                                    <thead
                                        className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    <tr>
                                        <th scope="col"
                                            className="sticky left-0 z-20 w-20 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">ケース
                                        </th>
                                        <th scope="col"
                                            className="sticky left-20 z-20 w-40 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">物件名
                                        </th>
                                        <th scope="col"
                                            className="sticky left-[15rem] z-20 w-20 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">年
                                        </th>
                                        {visibleAnnualColumns.map((columnIndex) => (
                                            <th
                                                key={annualTableHeadings[columnIndex]}
                                                scope="col"
                                                className="px-3 py-2"
                                            >
                                                {annualTableHeadings[columnIndex]}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {Array.from({length: parsedHoldingYears}, (_, index) => index + 1)
                                        .flatMap((year) => results.map((result) => {
                                            const projection = result.projections[year - 1];
                                            const exit = result.exits[year - 1];
                                            const cells = [
                                                formatTableMan(projection.potentialAnnualRentMan),
                                                formatTableMan(projection.vacancyLossMan),
                                                formatTableMan(projection.effectiveAnnualRentMan),
                                                formatTableMan(projection.annualOperatingCostsMan),
                                                formatTableMan(projection.noiMan),
                                                formatTableMan(projection.repairCostsMan),
                                                formatTableMan(projection.principalRepaymentMan),
                                                formatTableMan(projection.interestRepaymentMan),
                                                formatTableMan(projection.loanRepaymentMan),
                                                formatTableMan(projection.remainingLoanBalanceMan),
                                                formatTableMan(projection.cashFlowMan),
                                                formatTableMan(projection.cumulativeCashFlowMan),
                                                formatRatio(projection.dscr),
                                                formatTableMan(exit.salePriceMan),
                                                formatTableMan(exit.brokerageFeeMan),
                                                formatTableMan(exit.stampTaxMan),
                                                formatTableMan(exit.loanPayoffFeeMan),
                                                formatTableMan(exit.otherSaleCostMan),
                                                formatTableMan(exit.netSaleProceedsMan),
                                                formatTableMan(exit.totalProfitMan),
                                                formatPercent(exit.simpleReturnPercent),
                                            ];
                                            return (
                                                <tr
                                                    key={`${result.id}-${year}`}
                                                    className="border-t border-slate-200 dark:border-slate-700"
                                                >
                                                    <th
                                                        scope="row"
                                                        className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold dark:bg-slate-900"
                                                    >
                                                        {SCENARIO_LABELS[result.id]}
                                                    </th>
                                                    <td className="sticky left-20 z-10 bg-white px-3 py-2 text-left dark:bg-slate-900">
                                                        {result.propertyName}
                                                    </td>
                                                    <td className="sticky left-[15rem] z-10 bg-white px-3 py-2 text-left dark:bg-slate-900">
                                                        {year}年
                                                    </td>
                                                    {visibleAnnualColumns.map((columnIndex) => (
                                                        <td
                                                            key={`${result.id}-${year}-${annualTableHeadings[columnIndex]}`}
                                                            className="px-3 py-2"
                                                        >
                                                            {cells[columnIndex]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        }))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <output
                       className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        3ケースすべての基本試算・運用・売却条件が有効になると、比較結果を表示します。
                    </output>
                )}
                {activeProjections && (
                    <section aria-labelledby="active-projection-chart-heading">
                        <h3 id="active-projection-chart-heading" className="mb-3 text-sm font-bold">
                            {SCENARIO_LABELS[activeCase]}ケースの年次推移
                        </h3>
                        {finalActiveProjection && (
                            <dl className="mb-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                    <dt className="text-xs text-slate-600 dark:text-slate-300">保有期間の累計運営CF</dt>
                                    <dd className="mt-1 font-bold tabular-nums">
                                        {formatMan(finalActiveProjection.cumulativeCashFlowMan)} 万円
                                    </dd>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                    <dt className="text-xs text-slate-600 dark:text-slate-300">最終年の税引前CF</dt>
                                    <dd className="mt-1 font-bold tabular-nums">
                                        {formatMan(finalActiveProjection.cashFlowMan)} 万円
                                    </dd>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                    <dt className="text-xs text-slate-600 dark:text-slate-300">最終年末のローン残債</dt>
                                    <dd className="mt-1 font-bold tabular-nums">
                                        {formatMan(finalActiveProjection.remainingLoanBalanceMan)} 万円
                                    </dd>
                                </div>
                            </dl>
                        )}
                        <ProjectionCharts years={activeProjections}/>
                    </section>
                )}
                <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                    表示結果は入力条件に基づく税引前の概算です。税務・融資判断や実際の投資成果を保証するものではありません。
                </p>
            </section>
        </div>
    );
}
