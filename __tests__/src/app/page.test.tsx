import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
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

const createScenarioJson = (baselinePurchasePrice = 800) => JSON.stringify({
    formatVersion: 1,
    holdingYears: 2,
    cases: Object.fromEntries(['baseline', 'optimistic', 'cautious'].map((scenarioId) => [
        scenarioId,
        {
            propertyName: `${scenarioId}物件`,
            investment: {
                purchasePriceMan: baselinePurchasePrice,
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
            },
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
    ])),
});

function createJsonFile(contents: string): File {
    const file = new File([contents], 'conditions.json', {type: 'application/json'});
    Object.defineProperty(file, 'text', {value: async () => contents});
    return file;
}

const createResponse = (body: string, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
} as Response);

const nativeCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const nativeRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

async function renderHome() {
    jest.spyOn(global, 'fetch').mockResolvedValue(createResponse(sampleCsv));
    render(<Home/>, {reactStrictMode: false});
    await screen.findByRole('tab', {name: '基準'});
}

function enableAllCases() {
    for (const scenarioName of ['基準', '楽観', '慎重']) {
        fireEvent.click(screen.getByRole('tab', {name: scenarioName}));
        fireEvent.change(screen.getByLabelText('想定売却利回り（%）'), {
            target: {value: '10'},
        });
    }
    fireEvent.click(screen.getByRole('tab', {name: '基準'}));
}

describe('Home', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        if (nativeCreateObjectUrl) {
            Object.defineProperty(URL, 'createObjectURL', nativeCreateObjectUrl);
        } else {
            Reflect.deleteProperty(URL, 'createObjectURL');
        }
        if (nativeRevokeObjectUrl) {
            Object.defineProperty(URL, 'revokeObjectURL', nativeRevokeObjectUrl);
        } else {
            Reflect.deleteProperty(URL, 'revokeObjectURL');
        }
    });

    it('3ケースの条件を編集し、比較結果を即時に再計算する', async () => {
        await renderHome();

        expect(screen.getByRole('tab', {name: '楽観'})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: '慎重'})).toBeInTheDocument();
        expect(screen.getByRole('img', {name: /ウォーターフォールグラフ/})).toBeInTheDocument();
        expect(screen.getByRole('img', {name: '年ごとの税引前キャッシュフロー推移グラフ'}))
            .toBeInTheDocument();
        expect(screen.getByRole('button', {name: '条件JSONを出力'})).toBeDisabled();
        expect(screen.getByRole('button', {name: '年次結果CSVを出力'})).toBeDisabled();
        enableAllCases();
        expect(screen.getAllByText('63.0').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', {name: '条件JSONを出力'})).toBeEnabled();
        expect(screen.getByRole('button', {name: '年次結果CSVを出力'})).toBeEnabled();

        fireEvent.change(screen.getByLabelText('月額家賃（万円／月）'), {
            target: {value: '10'},
        });

        expect(screen.getAllByText('85.0').length).toBeGreaterThan(0);
    });

    it('条件と比較結果を相互に移動でき、年次表の表示項目を切り替えられる', async () => {
        await renderHome();

        expect(screen.getByRole('navigation', {name: 'シミュレーションの手順'})).toBeInTheDocument();
        expect(screen.getByRole('link', {name: '2. 結果を比較'})).toHaveAttribute('href', '#comparison');
        expect(screen.getByRole('link', {name: '条件を編集'})).toHaveAttribute('href', '#scenario-input');

        enableAllCases();

        const table = screen.getByRole('table', {
            name: '基準・楽観・慎重ケースの年次運用・融資・売却詳細',
        });
        expect(within(table).getByRole('columnheader', {name: 'NOI'})).toBeInTheDocument();
        expect(within(table).queryByRole('columnheader', {name: '満室想定家賃'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: '全項目'}));
        expect(within(table).getByRole('columnheader', {name: '満室想定家賃'})).toBeInTheDocument();
        expect(within(table).getByRole('columnheader', {name: '単純損益率'})).toBeInTheDocument();
    });

    it('入力エラーを該当する入力欄に関連付ける', async () => {
        await renderHome();

        const capRate = screen.getByLabelText('想定売却利回り（%）');
        expect(capRate).toHaveAttribute('aria-invalid', 'true');
        expect(capRate).toHaveAttribute('aria-describedby', 'exit-baseline-capRatePercent-error');
        expect(document.getElementById('exit-baseline-capRatePercent-error'))
            .toHaveTextContent('想定売却利回りは0%より大きく100%以下で入力してください。');
    });

    it('ケース間で編集値を独立して保持し、保有期間は共通で使う', async () => {
        await renderHome();
        fireEvent.change(screen.getByLabelText('共通の保有期間（年）'), {
            target: {value: '2'},
        });
        fireEvent.change(screen.getByLabelText('サンプル物件から条件を読み込む'), {
            target: {value: 'house-2'},
        });

        expect(screen.getByLabelText('物件名')).toHaveValue('サンプルB');
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(1000);

        fireEvent.keyDown(screen.getByRole('tab', {name: '基準'}), {key: 'ArrowRight'});

        expect(screen.getByRole('tab', {name: '楽観'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(800);
        expect(screen.getByLabelText('共通の保有期間（年）')).toHaveValue(2);
    });

    it('不正な入力では比較結果を表示しない', async () => {
        await renderHome();
        enableAllCases();
        expect(screen.getAllByText('63.0').length).toBeGreaterThan(0);

        fireEvent.change(screen.getByLabelText('物件価格（万円）'), {
            target: {value: '0'},
        });

        expect(screen.getByText('物件価格は0より大きい値を入力してください。')).toBeInTheDocument();
        expect(screen.queryByText('63.0')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('3ケースすべて');
    });

    it('修繕入力エラーを正しい予定番号で表示する', async () => {
        await renderHome();
        fireEvent.click(screen.getByRole('button', {name: '修繕予定を追加'}));

        expect(screen.getByText(/基準ケース — 修繕予定1の金額:/)).toBeInTheDocument();
    });

    it('有効なJSONを取り込むと3ケースをまとめて置き換える', async () => {
        await renderHome();
        const fileInput = screen.getByLabelText('条件JSONファイルを選択');
        fireEvent.change(fileInput, {target: {files: [createJsonFile(createScenarioJson(900))]}});

        await waitFor(() => expect(screen.getByLabelText('物件名')).toHaveValue('baseline物件'));
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(900);
        fireEvent.click(screen.getByRole('tab', {name: '楽観'}));
        expect(screen.getByLabelText('物件名')).toHaveValue('optimistic物件');
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(900);
        expect(screen.getByRole('button', {name: '年次結果CSVを出力'})).toBeEnabled();
    });

    it('不正なJSONの取り込み失敗時は現在の全ケースを維持する', async () => {
        await renderHome();
        fireEvent.change(screen.getByLabelText('物件価格（万円）'), {target: {value: '777'}});
        const invalidJson = createScenarioJson(0);
        fireEvent.change(screen.getByLabelText('条件JSONファイルを選択'), {
            target: {files: [createJsonFile(invalidJson)]},
        });

        expect(await screen.findByRole('alert')).toHaveTextContent('基準ケース「物件価格」');
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(777);
        fireEvent.click(screen.getByRole('tab', {name: '楽観'}));
        expect(screen.getByLabelText('物件価格（万円）')).toHaveValue(800);
    });

    it('条件JSONと年次CSVをファイルダウンロードへ渡す', async () => {
        await renderHome();
        enableAllCases();
        jest.useFakeTimers();
        const createObjectUrl = jest.fn(() => 'blob:scenario');
        const revokeObjectUrl = jest.fn();
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: createObjectUrl,
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: revokeObjectUrl,
        });
        const downloadClick = jest.spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {
            });

        fireEvent.click(screen.getByRole('button', {name: '条件JSONを出力'}));
        fireEvent.click(screen.getByRole('button', {name: '年次結果CSVを出力'}));

        expect(createObjectUrl).toHaveBeenCalledTimes(2);
        expect(downloadClick).toHaveBeenCalledTimes(2);
        jest.runOnlyPendingTimers();
    });

    it('CSV取得失敗の内容と再読み込み操作を表示する', async () => {
        const fetchMock = jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce(createResponse('', 500))
            .mockResolvedValueOnce(createResponse(sampleCsv));
        render(<Home/>, {reactStrictMode: false});

        expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
        const callsBeforeRetry = fetchMock.mock.calls.length;
        fireEvent.click(screen.getByRole('button', {name: '再読み込み'}));

        expect(await screen.findByRole('tab', {name: '基準'})).toBeInTheDocument();
        expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    });
});
