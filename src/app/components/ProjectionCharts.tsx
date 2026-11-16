import type {AnnualProjection} from '../../lib/projection';

type ProjectionChartsProps = Readonly<{
    years: AnnualProjection[];
}>;

const plotTop = 24;
const plotBottom = 218;
const plotHeight = plotBottom - plotTop;
const chartWidth = 800;

const formatMan = (amount: number) => amount.toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function getYearLabelInterval(yearCount: number): number {
    return Math.max(1, Math.ceil(yearCount / 12));
}

export default function ProjectionCharts({years}: ProjectionChartsProps) {
    const minCashFlow = Math.min(0, ...years.map(({cashFlowMan}) => cashFlowMan));
    const maxCashFlow = Math.max(0, ...years.map(({cashFlowMan}) => cashFlowMan));
    const cashFlowRange = maxCashFlow - minCashFlow || 1;
    const zeroY = plotTop + (maxCashFlow / cashFlowRange) * plotHeight;
    const stepWidth = chartWidth / years.length;
    const barWidth = Math.min(28, stepWidth * 0.65);
    const cashFlowY = (value: number) =>
        plotTop + ((maxCashFlow - value) / cashFlowRange) * plotHeight;
    const loanBalanceMax = Math.max(1, ...years.map(({remainingLoanBalanceMan}) => remainingLoanBalanceMan));
    const loanBalanceY = (value: number) => plotBottom - (value / loanBalanceMax) * plotHeight;
    const labelInterval = getYearLabelInterval(years.length);
    const linePoints = years.map((item, index) => (
        `${(stepWidth * index) + stepWidth / 2},${loanBalanceY(item.remainingLoanBalanceMan)}`
    )).join(' ');

    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <figure className="min-w-0 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <h3 className="mb-2 text-sm font-bold">年次税引前CF（万円）</h3>
                <div className="overflow-x-auto">
                    <svg
                        className="min-w-[640px] w-full"
                        role="img"
                        aria-label="年ごとの税引前キャッシュフロー推移グラフ"
                        viewBox={`0 0 ${chartWidth} 270`}
                    >
                        <title>年次税引前キャッシュフロー</title>
                        <text x="20" y="16" fill="currentColor" fontSize="11">
                            最大 {formatMan(maxCashFlow)}
                        </text>
                        <line x1="20" x2={chartWidth - 20} y1={zeroY} y2={zeroY} stroke="currentColor" opacity="0.35"/>
                        <text x="20" y={zeroY - 5} fill="currentColor" fontSize="11">0</text>
                        {years.map((item, index) => {
                            const centerX = stepWidth * index + stepWidth / 2;
                            const valueY = cashFlowY(item.cashFlowMan);
                            const top = Math.min(zeroY, valueY);
                            const height = Math.max(1, Math.abs(zeroY - valueY));

                            return (
                                <g key={item.year}>
                                    <rect
                                        x={centerX - barWidth / 2}
                                        y={top}
                                        width={barWidth}
                                        height={height}
                                        rx="2"
                                        fill={item.cashFlowMan < 0 ? '#dc2626' : '#16a34a'}
                                    >
                                        <title>{item.year}年目：{formatMan(item.cashFlowMan)}万円</title>
                                    </rect>
                                    {(item.year % labelInterval === 0 || item.year === years.length) && (
                                        <text
                                            x={centerX}
                                            y="245"
                                            textAnchor="middle"
                                            fill="currentColor"
                                            fontSize="11"
                                        >
                                            {item.year}年
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        <text x="20" y="233" fill="currentColor" fontSize="11">
                            最小 {formatMan(minCashFlow)}
                        </text>
                    </svg>
                </div>
                <figcaption className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    緑は黒字、赤は赤字です。正確な金額は年次表で確認できます。
                </figcaption>
            </figure>

            <figure className="min-w-0 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <h3 className="mb-2 text-sm font-bold">年末ローン残債（万円）</h3>
                <div className="overflow-x-auto">
                    <svg
                        className="min-w-[640px] w-full"
                        role="img"
                        aria-label="年ごとの年末ローン残債推移グラフ"
                        viewBox={`0 0 ${chartWidth} 270`}
                    >
                        <title>年末ローン残債</title>
                        <text x="20" y="16" fill="currentColor" fontSize="11">
                            最大 {formatMan(loanBalanceMax)}
                        </text>
                        <line x1="20" x2={chartWidth - 20} y1={plotBottom} y2={plotBottom} stroke="currentColor"
                              opacity="0.35"/>
                        <text x="20" y={plotBottom - 5} fill="currentColor" fontSize="11">0</text>
                        <polyline
                            points={linePoints}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        {years.map((item, index) => {
                            const centerX = stepWidth * index + stepWidth / 2;

                            return (
                                <g key={item.year}>
                                    <circle
                                        cx={centerX}
                                        cy={loanBalanceY(item.remainingLoanBalanceMan)}
                                        r="3"
                                        fill="#2563eb"
                                    >
                                        <title>{item.year}年目末：{formatMan(item.remainingLoanBalanceMan)}万円</title>
                                    </circle>
                                    {(item.year % labelInterval === 0 || item.year === years.length) && (
                                        <text
                                            x={centerX}
                                            y="245"
                                            textAnchor="middle"
                                            fill="currentColor"
                                            fontSize="11"
                                        >
                                            {item.year}年
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <figcaption className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    年末時点の残債です。完済後は0になります。
                </figcaption>
            </figure>
        </div>
    );
}
