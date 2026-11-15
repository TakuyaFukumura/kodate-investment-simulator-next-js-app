import type {InvestmentInput, InvestmentInputField,} from './investment';
import {calculateInvestment, validateInvestmentInput,} from './investment';
import type {ExitAssumptions, ExitScenario,} from './exit';
import {calculateExitScenarios, validateExitAssumptions,} from './exit';
import type {AnnualProjection, ProjectionAssumptions,} from './projection';
import {calculateProjection, validateProjectionAssumptions,} from './projection';

export const SCENARIO_IDS = ['baseline', 'optimistic', 'cautious'] as const;
export type ScenarioId = typeof SCENARIO_IDS[number];

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
    baseline: '基準',
    optimistic: '楽観',
    cautious: '慎重',
};

const investmentFields: InvestmentInputField[] = [
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

const investmentFieldLabels: Record<InvestmentInputField, string> = {
    purchasePriceMan: '物件価格',
    monthlyRentMan: '月額家賃',
    brokerageFeeMan: '仲介手数料',
    registrationFeeMan: '登記・司法書士費用',
    stampTaxMan: '印紙税',
    acquisitionTaxMan: '不動産取得税',
    loanFeeMan: '融資手数料',
    initialInsuranceMan: '火災・地震保険（初期費用）',
    otherAcquisitionCostMan: 'その他取得費用',
    renovationCostMan: '初回リフォーム費用',
    loanAmountMan: '借入額',
    annualInterestRatePercent: '年利',
    loanTermYears: '返済期間',
    vacancyMonths: '年間空室月数',
    annualManagementFeeMan: '管理委託費',
    annualPropertyTaxMan: '固定資産税',
    annualInsuranceMan: '保険料',
    annualRoutineRepairsMan: '通常修繕費',
    annualOtherOperatingCostMan: 'その他',
};

const projectionFieldLabels: Record<
    'annualRentChangePercent' | 'annualOperatingCostChangePercent',
    string
> = {
    annualRentChangePercent: '家賃の年間変化率',
    annualOperatingCostChangePercent: '運営費の年間変化率',
};

const exitFieldLabels: Record<keyof ExitAssumptions, string> = {
    capRatePercent: '想定売却利回り',
    stampTaxMan: '売却時の印紙税',
    loanPayoffFeeMan: 'ローン完済手数料',
    otherSaleCostMan: 'その他売却費用',
    useLowPriceVacantPropertySpecial: '低廉な空家等の媒介特例',
};

export type ScenarioConditions = {
    propertyName: string;
    investment: InvestmentInput;
    projection: Omit<ProjectionAssumptions, 'holdingYears'>;
    exit: ExitAssumptions;
};

export type ScenarioConditionsById = Record<ScenarioId, ScenarioConditions>;

export type ScenarioBundle = {
    formatVersion: 1;
    holdingYears: number;
    cases: ScenarioConditionsById;
};

export type ScenarioResults = {
    id: ScenarioId;
    propertyName: string;
    investment: ReturnType<typeof calculateInvestment>;
    projections: AnnualProjection[];
    exits: ExitScenario[];
};

export type ScenarioBundleParseResult =
    | { success: true; bundle: ScenarioBundle }
    | { success: false; errors: string[] };

export const SCENARIO_CSV_HEADERS = [
    'ケース',
    '物件名',
    '年',
    '満室想定家賃（万円）',
    '空室損失（万円）',
    '実効家賃（万円）',
    '運営費（万円）',
    'NOI（万円）',
    '修繕費（万円）',
    '元金返済（万円）',
    '利息返済（万円）',
    '年間返済額（万円）',
    '年末残債（万円）',
    '年次運営CF（万円）',
    '累計運営CF（万円）',
    'DSCR（倍）',
    '売却価格（万円）',
    '仲介手数料（万円）',
    '印紙税（万円）',
    'ローン完済手数料（万円）',
    'その他売却費用（万円）',
    '売却後手残り（万円）',
    '総損益（万円）',
    '単純損益率（%）',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function addValidationErrors(
    errors: string[],
    scenarioId: ScenarioId,
    fieldLabels: Record<string, string>,
    validationErrors: { field: string; message: string }[]
): void {
    validationErrors.forEach(({field, message}) => {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「${fieldLabels[field] ?? field}」: ${message}`);
    });
}

function parseScenarioConditions(
    value: unknown,
    scenarioId: ScenarioId,
    holdingYears: number,
    errors: string[]
): ScenarioConditions | null {
    if (!isRecord(value)) {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース: 条件オブジェクトがありません。`);
        return null;
    }

    const startErrorCount = errors.length;
    const propertyName = value.propertyName;
    if (typeof propertyName !== 'string' || propertyName.trim() === '') {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「物件名」: 文字列を入力してください。`);
    }

    const investmentValue = value.investment;
    let investment: InvestmentInput | null = null;
    if (!isRecord(investmentValue)) {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「基本試算」: 条件オブジェクトがありません。`);
    } else {
        const invalidFields = investmentFields.filter((field) =>
            !isFiniteNumber(investmentValue[field])
        );
        invalidFields.forEach((field) => {
            errors.push(
                `${SCENARIO_LABELS[scenarioId]}ケース「${investmentFieldLabels[field]}」: 有限の数値を指定してください。`
            );
        });
        if (invalidFields.length === 0) {
            investment = Object.fromEntries(
                investmentFields.map((field) => [field, investmentValue[field]])
            ) as InvestmentInput;
            addValidationErrors(
                errors,
                scenarioId,
                investmentFieldLabels,
                validateInvestmentInput(investment)
            );
        }
    }

    const projectionValue = value.projection;
    let projection: Omit<ProjectionAssumptions, 'holdingYears'> | null = null;
    if (!isRecord(projectionValue)) {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「運用条件」: 条件オブジェクトがありません。`);
    } else {
        const rentChange = projectionValue.annualRentChangePercent;
        const costChange = projectionValue.annualOperatingCostChangePercent;
        const repairEventsValue = projectionValue.repairEvents;
        const projectionErrorCount = errors.length;
        if (!isFiniteNumber(rentChange)) {
            errors.push(
                `${SCENARIO_LABELS[scenarioId]}ケース「${projectionFieldLabels.annualRentChangePercent}」: 有限の数値を指定してください。`
            );
        }
        if (!isFiniteNumber(costChange)) {
            errors.push(
                `${SCENARIO_LABELS[scenarioId]}ケース「${projectionFieldLabels.annualOperatingCostChangePercent}」: 有限の数値を指定してください。`
            );
        }
        const repairEvents = Array.isArray(repairEventsValue)
            ? repairEventsValue.flatMap((event, index) => {
                if (!isRecord(event)) {
                    errors.push(
                        `${SCENARIO_LABELS[scenarioId]}ケース「修繕予定${index + 1}」: オブジェクトが必要です。`
                    );
                    return [];
                }
                if (typeof event.id !== 'string') {
                    errors.push(
                        `${SCENARIO_LABELS[scenarioId]}ケース「修繕予定${index + 1}の識別情報」: 文字列を指定してください。`
                    );
                    return [];
                }
                if (typeof event.label !== 'string') {
                    errors.push(
                        `${SCENARIO_LABELS[scenarioId]}ケース「修繕予定${index + 1}の内容」: 文字列を指定してください。`
                    );
                    return [];
                }
                if (!isFiniteNumber(event.year)) {
                    errors.push(
                        `${SCENARIO_LABELS[scenarioId]}ケース「修繕予定${index + 1}の発生年」: 有限の数値を指定してください。`
                    );
                    return [];
                }
                if (!isFiniteNumber(event.amountMan)) {
                    errors.push(
                        `${SCENARIO_LABELS[scenarioId]}ケース「修繕予定${index + 1}の金額」: 有限の数値を指定してください。`
                    );
                    return [];
                }
                return [{
                    id: event.id,
                    year: event.year,
                    label: event.label,
                    amountMan: event.amountMan,
                }];
            })
            : [];
        if (!Array.isArray(repairEventsValue)) {
            errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「修繕予定」: 配列を指定してください。`);
        }
        if (errors.length === projectionErrorCount &&
            isFiniteNumber(rentChange) &&
            isFiniteNumber(costChange)
        ) {
            projection = {
                annualRentChangePercent: rentChange,
                annualOperatingCostChangePercent: costChange,
                repairEvents,
            };
            addValidationErrors(
                errors,
                scenarioId,
                {
                    ...projectionFieldLabels,
                    repairYear: '修繕年',
                    repairLabel: '修繕内容',
                    repairAmount: '修繕費',
                },
                validateProjectionAssumptions({...projection, holdingYears})
            );
        }
    }

    const exitValue = value.exit;
    let exit: ExitAssumptions | null = null;
    if (!isRecord(exitValue)) {
        errors.push(`${SCENARIO_LABELS[scenarioId]}ケース「売却条件」: 条件オブジェクトがありません。`);
    } else {
        const {
            capRatePercent,
            stampTaxMan,
            loanPayoffFeeMan,
            otherSaleCostMan,
            useLowPriceVacantPropertySpecial,
        } = exitValue;
        const invalidExitFields = [
            ...(isFiniteNumber(capRatePercent) ? [] : ['capRatePercent']),
            ...(isFiniteNumber(stampTaxMan) ? [] : ['stampTaxMan']),
            ...(isFiniteNumber(loanPayoffFeeMan) ? [] : ['loanPayoffFeeMan']),
            ...(isFiniteNumber(otherSaleCostMan) ? [] : ['otherSaleCostMan']),
            ...(typeof useLowPriceVacantPropertySpecial === 'boolean'
                ? [] : ['useLowPriceVacantPropertySpecial']),
        ] as (keyof ExitAssumptions)[];
        invalidExitFields.forEach((field) => {
            errors.push(
                `${SCENARIO_LABELS[scenarioId]}ケース「${exitFieldLabels[field]}」: 値の形式が不正です。`
            );
        });
        if (invalidExitFields.length === 0) {
            exit = {
                capRatePercent: capRatePercent as number,
                stampTaxMan: stampTaxMan as number,
                loanPayoffFeeMan: loanPayoffFeeMan as number,
                otherSaleCostMan: otherSaleCostMan as number,
                useLowPriceVacantPropertySpecial: useLowPriceVacantPropertySpecial as boolean,
            };
            addValidationErrors(
                errors,
                scenarioId,
                exitFieldLabels,
                validateExitAssumptions(exit)
            );
        }
    }

    if (errors.length !== startErrorCount || !investment || !projection || !exit ||
        typeof propertyName !== 'string'
    ) {
        return null;
    }

    return {propertyName, investment, projection, exit};
}

export function parseScenarioBundle(value: unknown): ScenarioBundleParseResult {
    if (!isRecord(value)) {
        return {success: false, errors: ['JSONの最上位はオブジェクトである必要があります。']};
    }
    if (value.formatVersion !== 1) {
        return {success: false, errors: ['未対応のJSON形式バージョンです。対応バージョン: 1']};
    }
    const holdingYears = value.holdingYears;
    if (!isFiniteNumber(holdingYears) ||
        !Number.isInteger(holdingYears) ||
        holdingYears < 1 ||
        holdingYears > 50
    ) {
        return {success: false, errors: ['共通条件「保有期間」: 1〜50年の整数を指定してください。']};
    }
    const caseValues = value.cases;
    if (!isRecord(caseValues)) {
        return {success: false, errors: ['JSONの「cases」に3ケースの条件が必要です。']};
    }

    const errors: string[] = [];
    const cases = {} as ScenarioConditionsById;
    SCENARIO_IDS.forEach((scenarioId) => {
        const scenario = parseScenarioConditions(
            caseValues[scenarioId],
            scenarioId,
            holdingYears,
            errors
        );
        if (scenario) {
            cases[scenarioId] = scenario;
        }
    });

    if (errors.length > 0) {
        return {success: false, errors};
    }

    return {
        success: true,
        bundle: {
            formatVersion: 1,
            holdingYears,
            cases,
        },
    };
}

export function calculateScenarioResults(
    cases: ScenarioConditionsById,
    holdingYears: number
): ScenarioResults[] {
    return SCENARIO_IDS.map((id) => {
        const conditions = cases[id];
        const projectionAssumptions = {
            ...conditions.projection,
            holdingYears,
        };
        const projectionErrors = validateProjectionAssumptions(projectionAssumptions);
        const investmentErrors = validateInvestmentInput(conditions.investment);
        const exitErrors = validateExitAssumptions(conditions.exit);
        if (investmentErrors.length > 0 || projectionErrors.length > 0 || exitErrors.length > 0) {
            throw new Error('無効な試算条件から結果を計算できません。');
        }

        const investment = calculateInvestment(conditions.investment);
        const projections = calculateProjection(conditions.investment, projectionAssumptions);
        const exits = calculateExitScenarios(
            conditions.investment,
            projections,
            conditions.exit
        );
        return {
            id,
            propertyName: conditions.propertyName,
            investment,
            projections,
            exits,
        };
    });
}

export function serializeScenarioBundle(bundle: ScenarioBundle): string {
    return JSON.stringify(bundle, null, 2);
}

function formatCsvNumber(value: number | null): string {
    if (value === null) {
        return '';
    }
    const rounded = Number(value.toFixed(2));
    return (rounded === 0 ? 0 : rounded).toFixed(2);
}

function escapeCsvField(value: string): string {
    const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safeValue)
        ? `"${safeValue.replaceAll('"', '""')}"`
        : safeValue;
}

export function serializeScenarioResultsCsv(results: ScenarioResults[]): string {
    const orderedResults = SCENARIO_IDS.flatMap((id) =>
        results.filter((result) => result.id === id)
    );
    const projectionMaps = orderedResults.map((result) => new Map(
        result.projections.map((projection) => [projection.year, projection])
    ));
    const exitMaps = orderedResults.map((result) => new Map(
        result.exits.map((exit) => [exit.year, exit])
    ));
    const yearCount = Math.max(0, ...orderedResults.map(({projections}) => projections.length));
    const rows: string[][] = [Array.from(SCENARIO_CSV_HEADERS)];

    for (let year = 1; year <= yearCount; year += 1) {
        orderedResults.forEach((result, index) => {
            const projection = projectionMaps[index].get(year);
            const exit = exitMaps[index].get(year);
            if (!projection || !exit) {
                return;
            }
            rows.push([
                SCENARIO_LABELS[result.id],
                result.propertyName,
                String(year),
                formatCsvNumber(projection.potentialAnnualRentMan),
                formatCsvNumber(projection.vacancyLossMan),
                formatCsvNumber(projection.effectiveAnnualRentMan),
                formatCsvNumber(projection.annualOperatingCostsMan),
                formatCsvNumber(projection.noiMan),
                formatCsvNumber(projection.repairCostsMan),
                formatCsvNumber(projection.principalRepaymentMan),
                formatCsvNumber(projection.interestRepaymentMan),
                formatCsvNumber(projection.loanRepaymentMan),
                formatCsvNumber(projection.remainingLoanBalanceMan),
                formatCsvNumber(projection.cashFlowMan),
                formatCsvNumber(projection.cumulativeCashFlowMan),
                formatCsvNumber(projection.dscr),
                formatCsvNumber(exit.salePriceMan),
                formatCsvNumber(exit.brokerageFeeMan),
                formatCsvNumber(exit.stampTaxMan),
                formatCsvNumber(exit.loanPayoffFeeMan),
                formatCsvNumber(exit.otherSaleCostMan),
                formatCsvNumber(exit.netSaleProceedsMan),
                formatCsvNumber(exit.totalProfitMan),
                formatCsvNumber(exit.simpleReturnPercent),
            ]);
        });
    }

    return `\uFEFF${rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')}`;
}

export function createScenarioFilename(
    type: 'conditions' | 'results',
    date: Date = new Date()
): string {
    const datePart = [
        String(date.getFullYear()).padStart(4, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const prefix = type === 'conditions' ? '戸建て投資条件' : '戸建て投資年次結果';
    const extension = type === 'conditions' ? 'json' : 'csv';
    return `${prefix}_${datePart}.${extension}`;
}
