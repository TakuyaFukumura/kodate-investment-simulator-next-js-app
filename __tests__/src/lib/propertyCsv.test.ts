import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parsePropertyCsv, PROPERTY_CSV_HEADERS} from '../../../src/lib/propertyCsv';

const makeRow = (id: string, description = '架空のテスト物件') => [
    id,
    'テスト物件',
    description,
    800,
    8,
    24,
    10,
    1,
    8,
    4,
    2,
    1,
    50,
    500,
    2,
    20,
    1,
    8,
    6,
    4,
    5,
    2,
].join(',');

const makeCsv = (...rows: string[]) => [PROPERTY_CSV_HEADERS.join(','), ...rows].join('\r\n');

describe('parsePropertyCsv', () => {
    it('リポジトリ同梱の2物件CSVを読み込む', () => {
        const csvText = readFileSync(join(process.cwd(), 'public', 'data', 'sample-properties.csv'), 'utf8');
        const properties = parsePropertyCsv(csvText);

        expect(properties).toHaveLength(2);
        expect(properties.map(({id}) => id)).toEqual(['old-renovation', 'good-condition']);
    });

    it('BOM、引用符、カンマを含むCSVから複数物件を読み込む', () => {
        const properties = parsePropertyCsv(
            `\uFEFF${makeCsv(makeRow('house-1', '"架空, ""改修済み"""'), makeRow('house-2'))}`
        );

        expect(properties).toHaveLength(2);
        expect(properties[0].description).toBe('架空, "改修済み"');
        expect(properties[0].purchasePriceMan).toBe(800);
    });

    it('引用フィールド内の改行を保持する', () => {
        const properties = parsePropertyCsv(makeCsv(makeRow('house-1', '"1行目\n2行目"')));

        expect(properties[0].description).toBe('1行目\n2行目');
    });

    it('不正なヘッダー、列数、数値、範囲、重複IDを拒否する', () => {
        expect(() => parsePropertyCsv('id,name\n1,物件')).toThrow('ヘッダーが仕様と一致しません');
        const missingCellRow = makeRow('house-1').split(',').slice(1).join(',');
        expect(() => parsePropertyCsv(makeCsv(missingCellRow))).toThrow('列数がヘッダーと一致しません');
        expect(() => parsePropertyCsv(makeCsv(makeRow('house-1').replace(',800,', ',abc,')))).toThrow('有効な数値');
        expect(() => parsePropertyCsv(makeCsv(makeRow('house-1').replace(',800,', ',0,')))).toThrow('物件価格は0より大きい');
        expect(() => parsePropertyCsv(makeCsv(makeRow('house-1'), makeRow('house-1')))).toThrow('重複しています');
    });

    it('データ行のないCSVと閉じていない引用符を拒否する', () => {
        expect(() => parsePropertyCsv(PROPERTY_CSV_HEADERS.join(','))).toThrow('物件データがありません');
        expect(() => parsePropertyCsv(`${PROPERTY_CSV_HEADERS.join(',')}\n"unterminated`)).toThrow('引用符が閉じられていません');
    });

    it('引用フィールドに改行があってもエラー行番号を示す', () => {
        const multilineRow = makeRow('house-1', '"1行目\n2行目"');
        const invalidRow = makeRow('house-2').replace(',800,', ',0,');

        expect(() => parsePropertyCsv(makeCsv(multilineRow, invalidRow)))
            .toThrow('CSV 4行目「物件価格」');
    });
});
