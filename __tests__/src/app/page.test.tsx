import {fireEvent, render, screen} from '@testing-library/react';
import Home from '../../../src/app/page';
import {PROPERTY_CSV_HEADERS} from '../../../src/lib/propertyCsv';

const makeRow = (id: string, name: string, purchasePrice: number, monthlyRent: number) => [
    id,
    name,
    '架空のテスト物件',
    purchasePrice,
    monthlyRent,
    24,
    10,
    1,
    8,
    4,
    2,
    1,
    50,
    500,
    0,
    20,
    1,
    8,
    6,
    4,
    5,
    2,
].join(',');

const sampleCsv = [
    PROPERTY_CSV_HEADERS.join(','),
    makeRow('house-1', 'サンプルA', 800, 8),
    makeRow('house-2', 'サンプルB', 1000, 10),
].join('\r\n');

const createResponse = (body: string, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
} as Response);

describe('Home', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('同梱物件を読み込み、条件変更を即時に再計算する', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(createResponse(sampleCsv));
        render(<Home/>, {reactStrictMode: false});

        expect(await screen.findByText('12.00%')).toBeInTheDocument();
        expect(screen.getByText('63.0 万円／年')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('物件価格（万円）'), {target: {value: '1000'}});
        expect(screen.getByText('9.60%')).toBeInTheDocument();
    });

    it('物件を切り替えると、その物件の初期条件を読み込む', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(createResponse(sampleCsv));
        render(<Home/>, {reactStrictMode: false});

        const selector = await screen.findByRole('combobox', {name: 'サンプル物件'});
        fireEvent.change(selector, {target: {value: 'house-2'}});

        expect(screen.getByText('サンプルB')).toBeInTheDocument();
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(1000);
        expect(screen.getByText('12.00%')).toBeInTheDocument();
    });

    it('不正な入力では古い試算結果を表示しない', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(createResponse(sampleCsv));
        render(<Home/>, {reactStrictMode: false});

        await screen.findByText('12.00%');
        fireEvent.change(screen.getByLabelText('物件価格（万円）'), {target: {value: '0'}});

        expect(screen.getByText('物件価格は0より大きい値を入力してください。')).toBeInTheDocument();
        expect(screen.queryByText('12.00%')).not.toBeInTheDocument();
        expect(screen.queryByRole('img', {name: /ウォーターフォールグラフ/})).not.toBeInTheDocument();
    });

    it('CSV取得失敗の内容と再読み込み操作を表示する', async () => {
        const fetchMock = jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce(createResponse('', 500))
            .mockResolvedValueOnce(createResponse(sampleCsv));
        render(<Home/>, {reactStrictMode: false});

        expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
        const callsBeforeRetry = fetchMock.mock.calls.length;
        fireEvent.click(screen.getByRole('button', {name: '再読み込み'}));

        expect(await screen.findByText('12.00%')).toBeInTheDocument();
        expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    });
});
