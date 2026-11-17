import type {ExitScenario} from '../../lib/exit';
import {ChartValueAxis, getAxisRange, getAxisTicks} from './ChartAxis';

type ExitChartProps = Readonly<{
    scenarios: ExitScenario[];
}>;

const chartWidth = 800;
const plotTop = 34;
const plotBottom = 218;
const plotHeight = plotBottom - plotTop;
const plotLeft = 60;
const plotRight = chartWidth - 20;
const plotWidth = plotRight - plotLeft;

function formatMan(amount: number): string {
    return amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function getYearLabelInterval(yearCount: number): number {
    return Math.max(1, Math.ceil(yearCount / 12));
}

export default function ExitChart({scenarios}: ExitChartProps) {
    const validScenarios = scenarios.filter(
        (scenario): scenario is ExitScenario & { totalProfitMan: number } =>
            scenario.totalProfitMan !== null
    );

    if (validScenarios.length === 0) {
        return (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                NOIが0以下のため、総損益をグラフに表示できる年がありません。
            </p>
        );
    }

    const minimumProfit = Math.min(0, ...validScenarios.map(({totalProfitMan}) => totalProfitMan));
    const maximumProfit = Math.max(0, ...validScenarios.map(({totalProfitMan}) => totalProfitMan));
    const profitAxis = getAxisRange(minimumProfit, maximumProfit);
    const profitRange = profitAxis.maximum - profitAxis.minimum;
    const stepWidth = plotWidth / scenarios.length;
    const barWidth = Math.min(28, stepWidth * 0.65);
    const yFor = (value: number) => plotTop + ((profitAxis.maximum - value) / profitRange) * plotHeight;
    const zeroY = yFor(0);
    const profitTicks = getAxisTicks(profitAxis.minimum, profitAxis.maximum);
    const labelInterval = getYearLabelInterval(scenarios.length);

    return (
        <figure className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-bold">売却年別の総損益（万円）</h3>
            <div className="overflow-x-auto">
                <svg
                    className="min-w-[640px] w-full"
                    role="img"
                    aria-label="保有年数ごとの売却後総損益グラフ"
                    viewBox={`0 0 ${chartWidth} 270`}
                >
                    <title>保有年数ごとの売却後総損益</title>
                    <ChartValueAxis
                        ticks={profitTicks}
                        yFor={yFor}
                        plotLeft={plotLeft}
                        plotRight={plotRight}
                    />
                    {scenarios.map((scenario, index) => {
                        if (scenario.totalProfitMan === null) {
                            return null;
                        }

                        const centerX = plotLeft + stepWidth * index + stepWidth / 2;
                        const valueY = yFor(scenario.totalProfitMan);
                        const top = Math.min(zeroY, valueY);
                        const height = Math.max(1, Math.abs(zeroY - valueY));

                        return (
                            <g key={scenario.year}>
                                <rect
                                    x={centerX - barWidth / 2}
                                    y={top}
                                    width={barWidth}
                                    height={height}
                                    rx="2"
                                    fill={scenario.totalProfitMan < 0 ? '#dc2626' : '#16a34a'}
                                >
                                    <title>{scenario.year}年保有：総損益 {formatMan(scenario.totalProfitMan)}万円</title>
                                </rect>
                                {(scenario.year % labelInterval === 0 || scenario.year === scenarios.length) && (
                                    <text
                                        x={centerX}
                                        y="245"
                                        textAnchor="middle"
                                        fill="currentColor"
                                        fontSize="11"
                                    >
                                        {scenario.year}年
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <figcaption className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                緑は損益プラス、赤はマイナスです。数値は年次表で確認できます。
            </figcaption>
        </figure>
    );
}
