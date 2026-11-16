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

type CsvParserState = {
    rows: ParsedCsvRow[];
    row: string[];
    field: string;
    insideQuotes: boolean;
    quoteClosed: boolean;
    lineNumber: number;
    rowStartLine: number;
};

function finishCsvRow(state: CsvParserState): void {
    state.row.push(state.field);
    state.rows.push({cells: state.row, lineNumber: state.rowStartLine});
    state.row = [];
    state.field = '';
    state.quoteClosed = false;
    state.lineNumber += 1;
    state.rowStartLine = state.lineNumber;
}

function consumeQuotedCsvCharacter(
    text: string,
    index: number,
    state: CsvParserState
): boolean {
    const character = text[index];
    if (character !== '"') {
        state.field += character;
        if (character === '\n') {
            state.lineNumber += 1;
        }
        return false;
    }

    if (text[index + 1] === '"') {
        state.field += '"';
        return true;
    }

    state.insideQuotes = false;
    state.quoteClosed = true;
    return false;
}

function consumeClosedQuoteCsvCharacter(
    text: string,
    index: number,
    state: CsvParserState
): boolean {
    const character = text[index];
    if (character === ',') {
        state.row.push(state.field);
        state.field = '';
        state.quoteClosed = false;
        return false;
    }

    if (character !== '\r' && character !== '\n') {
        throw new Error(`CSV ${state.lineNumber}行目: 閉じ引用符の後に予期しない文字があります。`);
    }

    finishCsvRow(state);
    return character === '\r' && text[index + 1] === '\n';
}

function consumeUnquotedCsvCharacter(
    text: string,
    index: number,
    state: CsvParserState
): boolean {
    const character = text[index];
    if (character === '"') {
        if (state.field.length > 0) {
            throw new Error(`CSV ${state.lineNumber}行目: 引用符の位置が不正です。`);
        }
        state.insideQuotes = true;
        return false;
    }

    if (character === ',') {
        state.row.push(state.field);
        state.field = '';
        return false;
    }

    if (character === '\r' || character === '\n') {
        finishCsvRow(state);
        return character === '\r' && text[index + 1] === '\n';
    }

    state.field += character;
    return false;
}

function parseCsvRows(csvText: string): ParsedCsvRow[] {
    const text = csvText.codePointAt(0) === 0xfeff ? csvText.slice(1) : csvText;
    const state: CsvParserState = {
        rows: [],
        row: [],
        field: '',
        insideQuotes: false,
        quoteClosed: false,
        lineNumber: 1,
        rowStartLine: 1,
    };

    let skipNextCharacter = false;
    for (let index = 0; index < text.length; index += 1) {
        if (skipNextCharacter) {
            skipNextCharacter = false;
            continue;
        }

        if (state.insideQuotes) {
            skipNextCharacter = consumeQuotedCsvCharacter(text, index, state);
        } else if (state.quoteClosed) {
            skipNextCharacter = consumeClosedQuoteCsvCharacter(text, index, state);
        } else {
            skipNextCharacter = consumeUnquotedCsvCharacter(text, index, state);
        }
    }

    if (state.insideQuotes) {
        throw new Error(`CSV ${state.lineNumber}行目: 引用符が閉じられていません。`);
    }

    if (state.field.length > 0 || state.row.length > 0 || state.quoteClosed) {
        state.row.push(state.field);
        state.rows.push({cells: state.row, lineNumber: state.rowStartLine});
    }

    return state.rows;
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
