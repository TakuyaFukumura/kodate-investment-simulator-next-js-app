import type {InvestmentInput} from '../../../src/lib/investment';
import type {ScenarioConditionsById} from '../../../src/lib/scenarioComparison';
import {
    calculateScenarioResults,
    createScenarioFilename,
    parseScenarioBundle,
    SCENARIO_CSV_HEADERS,
    serializeScenarioBundle,
    serializeScenarioResultsCsv,
} from '../../../src/lib/scenarioComparison';

const investment: InvestmentInput = {
    purchasePriceMan: 800,
    monthlyRentMan: 8,
    brokerageFeeMan: 24,
    registrationFeeMan: 10,
    stampTaxMan: 1,
    acquisitionTaxMan: 8,
    loanFeeMan: 4,
    initialInsuranceMan: 2,
    otherAcquisitionCostMan: 1,
    renovationCostMan: 50,
    loanAmountMan: 500,
    annualInterestRatePercent: 0,
    loanTermYears: 20,
    vacancyMonths: 1,
    annualManagementFeeMan: 8,
    annualPropertyTaxMan: 6,
    annualInsuranceMan: 4,
    annualRoutineRepairsMan: 5,
    annualOtherOperatingCostMan: 2,
};

const conditions: ScenarioConditionsById = {
    baseline: {
        propertyName: '物件A',
        investment,
        projection: {
            annualRentChangePercent: 0,
            annualOperatingCostChangePercent: 0,
            repairEvents: [],
        },
        exit: {
            capRatePercent: 10,
            stampTaxMan: 1,
            loanPayoffFeeMan: 2,
            otherSaleCostMan: 3,
            useLowPriceVacantPropertySpecial: false,
        },
    },
    optimistic: {
        propertyName: '物件B',
        investment: {...investment, monthlyRentMan: 10},
        projection: {
            annualRentChangePercent: 1,
            annualOperatingCostChangePercent: 0,
            repairEvents: [],
        },
        exit: {
            capRatePercent: 9,
            stampTaxMan: 1,
            loanPayoffFeeMan: 2,
            otherSaleCostMan: 3,
            useLowPriceVacantPropertySpecial: false,
        },
    },
    cautious: {
        propertyName: '物件C',
        investment: {...investment, monthlyRentMan: 6},
        projection: {
            annualRentChangePercent: -1,
            annualOperatingCostChangePercent: 1,
            repairEvents: [],
        },
        exit: {
            capRatePercent: 11,
            stampTaxMan: 1,
            loanPayoffFeeMan: 2,
            otherSaleCostMan: 3,
            useLowPriceVacantPropertySpecial: false,
        },
    },
};

const bundle = {
    formatVersion: 1 as const,
    holdingYears: 2,
    cases: conditions,
};

describe('parseScenarioBundle', () => {
    it('バージョン1の3ケースをJSONで往復できる', () => {
        const parsed = parseScenarioBundle(JSON.parse(serializeScenarioBundle(bundle)) as unknown);

        expect(parsed).toEqual({success: true, bundle});
    });

    it('未対応バージョンを拒否する', () => {
        expect(parseScenarioBundle({...bundle, formatVersion: 2})).toEqual({
            success: false,
            errors: ['未対応のJSON形式バージョンです。対応バージョン: 1'],
        });
    });

    it('全ケースを検証し、エラーにケース名・項目名・原因を含める', () => {
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                optimistic: {
                    ...conditions.optimistic,
                    investment: {...investment, purchasePriceMan: 0},
                },
                cautious: undefined,
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('楽観ケース「物件価格」'),
                expect.stringContaining('慎重ケース'),
            ]));
        }
    });

    it('数値の形式不正をケースと項目ごとに示す', () => {
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    investment: {...investment, purchasePriceMan: '800'},
                    projection: {
                        ...conditions.baseline.projection,
                        annualRentChangePercent: '0',
                    },
                    exit: {
                        ...conditions.baseline.exit,
                        capRatePercent: '10',
                    },
                },
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toEqual(expect.arrayContaining([
                '基準ケース「物件価格」: 有限の数値を指定してください。',
                '基準ケース「家賃の年間変化率」: 有限の数値を指定してください。',
                '基準ケース「想定売却利回り」: 値の形式が不正です。',
            ]));
        }
    });

    it('条件グループがオブジェクトでない場合は個別に拒否する', () => {
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    investment: null,
                    projection: null,
                    exit: null,
                },
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('基準ケース「基本試算」'),
                expect.stringContaining('基準ケース「運用条件」'),
                expect.stringContaining('基準ケース「売却条件」'),
            ]));
        }
    });

    it('修繕予定の各形式不正を報告する', () => {
        const repairEvents = [
            null,
            {id: 1, label: '屋根', year: 1, amountMan: 1},
            {id: 'repair-2', label: 1, year: 1, amountMan: 1},
            {id: 'repair-3', label: '屋根', year: '1', amountMan: 1},
            {id: 'repair-4', label: '屋根', year: 1, amountMan: '1'},
            {id: 'repair-5', label: '屋根', year: 1, amountMan: 1},
        ];
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    projection: {
                        ...conditions.baseline.projection,
                        repairEvents,
                    },
                },
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('修繕予定1」: オブジェクトが必要'),
                expect.stringContaining('修繕予定2の識別情報」: 文字列を指定してください'),
                expect.stringContaining('修繕予定3の内容」: 文字列を指定してください'),
                expect.stringContaining('修繕予定4の発生年」: 有限の数値を指定してください'),
                expect.stringContaining('修繕予定5の金額」: 有限の数値を指定してください'),
            ]));
        }

        const nonArrayBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    projection: {
                        ...conditions.baseline.projection,
                        repairEvents: null,
                    },
                },
            },
        };
        const nonArrayParsed = parseScenarioBundle(nonArrayBundle);

        expect(nonArrayParsed.success).toBe(false);
        if (!nonArrayParsed.success) {
            expect(nonArrayParsed.errors).toContain(
                '基準ケース「修繕予定」: 配列を指定してください。'
            );
        }

        const validBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    projection: {
                        ...conditions.baseline.projection,
                        repairEvents: [{id: 'repair-1', label: '屋根', year: 1, amountMan: 1}],
                    },
                },
            },
        };
        expect(parseScenarioBundle(validBundle)).toEqual({
            success: true,
            bundle: validBundle,
        });
    });

    it('売却条件の各形式不正を報告する', () => {
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    exit: {
                        ...conditions.baseline.exit,
                        capRatePercent: '10',
                        stampTaxMan: '1',
                        loanPayoffFeeMan: null,
                        otherSaleCostMan: Number.NaN,
                        useLowPriceVacantPropertySpecial: 'false',
                    },
                },
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('想定売却利回り」: 値の形式が不正'),
                expect.stringContaining('売却時の印紙税」: 値の形式が不正'),
                expect.stringContaining('ローン完済手数料」: 値の形式が不正'),
                expect.stringContaining('その他売却費用」: 値の形式が不正'),
                expect.stringContaining('低廉な空家等の媒介特例」: 値の形式が不正'),
            ]));
        }
    });

    it('修繕予定に不正値があれば対象ケースと項目を特定する', () => {
        const invalidBundle = {
            ...bundle,
            cases: {
                ...conditions,
                baseline: {
                    ...conditions.baseline,
                    projection: {
                        ...conditions.baseline.projection,
                        repairEvents: [{id: 'repair-1', year: 3, label: '屋根', amountMan: 1}],
                    },
                },
            },
        };
        const parsed = parseScenarioBundle(invalidBundle);

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.errors).toContain(
                '基準ケース「修繕年」: 修繕年は1〜2年の整数で入力してください。'
            );
        }
    });
});

describe('serializeScenarioResultsCsv', () => {
    it('BOM、ヘッダー、年・ケース順、物件名、精度を保って出力する', () => {
        const results = calculateScenarioResults(conditions, 2);
        const csv = serializeScenarioResultsCsv([...results].reverse());
        const rows = csv.slice(1).split('\r\n');

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(rows[0].split(',')).toEqual(SCENARIO_CSV_HEADERS);
        expect(rows.slice(1, 4).map((row) => row.split(',').slice(0, 3))).toEqual([
            ['基準', '物件A', '1'],
            ['楽観', '物件B', '1'],
            ['慎重', '物件C', '1'],
        ]);
        expect(rows[1].split(',')[3]).toBe('96.00');
    });

    it('CSV特殊文字をエスケープし、算出不能値を空欄にする', () => {
        const specialNameConditions: ScenarioConditionsById = {
            ...conditions,
            baseline: {
                ...conditions.baseline,
                propertyName: '物件, "A"',
                investment: {
                    ...investment,
                    monthlyRentMan: 0,
                    loanAmountMan: 0,
                    annualManagementFeeMan: 20,
                },
            },
        };
        const results = calculateScenarioResults(specialNameConditions, 1);
        const csv = serializeScenarioResultsCsv(results);
        const firstDataRow = csv.slice(1).split('\r\n')[1];
        const columns = firstDataRow.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)
            ?.map((column) => column.replace(/,$/, '').replace(/^"|"$/g, '').replaceAll('""', '"'));

        expect(firstDataRow).toContain('"物件, ""A"""');
        expect(columns?.[15]).toBe('');
        expect(columns?.[16]).toBe('');
        expect(columns?.[17]).toBe('');
        expect(columns?.[18]).toBe('1.00');
        expect(columns?.[21]).toBe('');
        expect(columns?.[22]).toBe('');
        expect(columns?.[23]).toBe('');
    });

    it('表計算ソフトで数式として扱われる物件名を無害化する', () => {
        const formulaNameConditions: ScenarioConditionsById = {
            ...conditions,
            baseline: {
                ...conditions.baseline,
                propertyName: '=1+1',
            },
        };
        const csv = serializeScenarioResultsCsv(
            calculateScenarioResults(formulaNameConditions, 1)
        );

        expect(csv).toContain("'=1+1");
    });
});

describe('createScenarioFilename', () => {
    it('ローカル日付を指定形式でファイル名に含める', () => {
        const localDate = new Date(2026, 10, 15, 12);

        expect(createScenarioFilename('conditions', localDate))
            .toBe('戸建て投資条件_2026-11-15.json');
        expect(createScenarioFilename('results', localDate))
            .toBe('戸建て投資年次結果_2026-11-15.csv');
    });
});
