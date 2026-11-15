import {InvestmentInput, InvestmentInputField, validateInvestmentInput,} from './investment';

export type PropertyScenario = InvestmentInput & {
    id: string;
    name: string;
    description: string;
};

export const PROPERTY_CSV_HEADERS = [
    'id',
    'name',
    'description',
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
] as const;

const textFields = ['id', 'name', 'description'] as const;
const numericFields: InvestmentInputField[] = [
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

const fieldLabels: Record<InvestmentInputField, string> = {
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
    annualInsuranceMan: '年間保険料',
    annualRoutineRepairsMan: '通常修繕費',
    annualOtherOperatingCostMan: 'その他年間運営費',
};

type ParsedCsvRow = {
    cells: string[];
    lineNumber: number;
};

function parseCsvRows(csvText: string): ParsedCsvRow[] {
    const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
    const rows: ParsedCsvRow[] = [];
    let row: string[] = [];
    let field = '';
    let insideQuotes = false;
    let quoteClosed = false;
    let lineNumber = 1;
    let rowStartLine = 1;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];

        if (insideQuotes) {
            if (character === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    insideQuotes = false;
                    quoteClosed = true;
                }
            } else {
                field += character;
                if (character === '\n') {
                    lineNumber += 1;
                }
            }
            continue;
        }

        if (quoteClosed) {
            if (character === ',') {
                row.push(field);
                field = '';
                quoteClosed = false;
            } else if (character === '\r' || character === '\n') {
                row.push(field);
                rows.push({cells: row, lineNumber: rowStartLine});
                row = [];
                field = '';
                quoteClosed = false;
                if (character === '\r' && text[index + 1] === '\n') {
                    index += 1;
                }
                lineNumber += 1;
                rowStartLine = lineNumber;
            } else {
                throw new Error(`CSV ${lineNumber}行目: 閉じ引用符の後に予期しない文字があります。`);
            }
            continue;
        }

        if (character === '"') {
            if (field.length > 0) {
                throw new Error(`CSV ${lineNumber}行目: 引用符の位置が不正です。`);
            }
            insideQuotes = true;
        } else if (character === ',') {
            row.push(field);
            field = '';
        } else if (character === '\r' || character === '\n') {
            row.push(field);
            rows.push({cells: row, lineNumber: rowStartLine});
            row = [];
            field = '';
            if (character === '\r' && text[index + 1] === '\n') {
                index += 1;
            }
            lineNumber += 1;
            rowStartLine = lineNumber;
        } else {
            field += character;
        }
    }

    if (insideQuotes) {
        throw new Error(`CSV ${lineNumber}行目: 引用符が閉じられていません。`);
    }

    if (field.length > 0 || row.length > 0 || quoteClosed) {
        row.push(field);
        rows.push({cells: row, lineNumber: rowStartLine});
    }

    return rows;
}

export function parsePropertyCsv(csvText: string): PropertyScenario[] {
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) {
        throw new Error('CSV 2行目「物件データ」: 物件データがありません。');
    }

    const headers = rows[0].cells;
    if (new Set(headers).size !== headers.length || headers.length !== PROPERTY_CSV_HEADERS.length ||
        headers.some((header, index) => header !== PROPERTY_CSV_HEADERS[index])) {
        const mismatchIndex = PROPERTY_CSV_HEADERS.findIndex((header, index) => headers[index] !== header);
        const mismatchedHeader = headers[mismatchIndex] ?? '列数';
        const expectedHeader = PROPERTY_CSV_HEADERS[mismatchIndex] ?? '追加列なし';
        throw new Error(
            `CSV 1行目「${expectedHeader}」: ヘッダーが仕様と一致しません（読み込み値: ${mismatchedHeader}）。`
        );
    }

    const properties: PropertyScenario[] = [];
    const seenIds = new Set<string>();

    rows.slice(1).forEach(({cells, lineNumber: rowNumber}) => {
        if (cells.length !== headers.length) {
            const column = headers[cells.length] ?? '余分な列';
            throw new Error(`CSV ${rowNumber}行目「${column}」: 列数がヘッダーと一致しません。`);
        }

        const values = Object.fromEntries(
            headers.map((header, index) => [header, cells[index].trim()])
        ) as Record<string, string>;
        for (const field of textFields) {
            if (!values[field]) {
                throw new Error(`CSV ${rowNumber}行目「${field}」: 値を入力してください。`);
            }
        }
        if (seenIds.has(values.id)) {
            throw new Error(`CSV ${rowNumber}行目「id」: 物件ID「${values.id}」が重複しています。`);
        }
        seenIds.add(values.id);

        const input = {} as InvestmentInput;
        for (const field of numericFields) {
            const rawValue = values[field];
            const value = Number(rawValue);
            if (!rawValue || !Number.isFinite(value)) {
                throw new Error(`CSV ${rowNumber}行目「${field}」: 有効な数値を入力してください。`);
            }
            input[field] = value;
        }

        const inputErrors = validateInvestmentInput(input);
        if (inputErrors.length > 0) {
            const firstError = inputErrors[0];
            throw new Error(
                `CSV ${rowNumber}行目「${fieldLabels[firstError.field]}」: ${firstError.message}`
            );
        }

        properties.push({
            ...input,
            id: values.id,
            name: values.name,
            description: values.description,
        });
    });

    if (properties.length === 0) {
        throw new Error('CSVに物件データがありません。');
    }

    return properties;
}
