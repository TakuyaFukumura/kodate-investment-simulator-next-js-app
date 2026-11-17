import type {ScenarioResults} from '../../lib/scenarioComparison';
import {SCENARIO_IDS, SCENARIO_LABELS} from '../../lib/scenarioComparison';
import {ChartValueAxis, getAxisRange, getAxisTicks} from './ChartAxis';

type ScenarioComparisonChartProps = Readonly<{
    results: ScenarioResults[];
}>;

const colors = {
    baseline: '#2563eb',
    optimistic: '#16a34a',
    cautious: '#ea580c',
} as const;

const chartWidth = 800;
const plotTop = 34;
const plotBottom = 218;
const plotHeight = plotBottom - plotTop;
const plotLeft = 60;
const plotRight = chartWidth - 20;
const plotWidth = plotRight - plotLeft;
const lineStyles = {
    baseline: undefined,
    optimistic: '6 4',
    cautious: '2 3',
} as const;

function formatMan(amount: number): string {
    return amount.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function getYearLabelInterval(yearCount: number): number {
    return Math.max(1, Math.ceil(yearCount / 12));
}

export default function ScenarioComparisonChart({results}: ScenarioComparisonChartProps) {
    const allExits = results.flatMap(({exits}) => exits);
    const validExits = allExits.filter(
        (exit): exit is typeof exit & { totalProfitMan: number } => exit.totalProfitMan !== null
    );

    if (validExits.length === 0) {
        return (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                総損益を算出できる年がないため、グラフを表示できません。
            </p>
        );
    }

    const minimumProfit = Math.min(0, ...validExits.map(({totalProfitMan}) => totalProfitMan));
    const maximumProfit = Math.max(0, ...validExits.map(({totalProfitMan}) => totalProfitMan));
    const profitAxis = getAxisRange(minimumProfit, maximumProfit);
    const profitRange = profitAxis.maximum - profitAxis.minimum;
    const yearCount = Math.max(...results.map(({exits}) => exits.length));
    const stepWidth = plotWidth / yearCount;
    const labelInterval = getYearLabelInterval(yearCount);
    const yFor = (value: number) => plotTop + ((profitAxis.maximum - value) / profitRange) * plotHeight;
    const profitTicks = getAxisTicks(profitAxis.minimum, profitAxis.maximum);

    return (
        <figure className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-bold">保有年数ごとの総損益（万円）</h3>
            <div className="overflow-x-auto">
                <svg
                    className="min-w-[640px] w-full"
                    role="img"
                    aria-label="基準・楽観・慎重ケースの保有年数ごとの総損益グラフ"
                    viewBox={`0 0 ${chartWidth} 270`}
                >
                    <title>保有年数ごとの総損益比較</title>
                    <ChartValueAxis
                        ticks={profitTicks}
                        yFor={yFor}
                        plotLeft={plotLeft}
                        plotRight={plotRight}
                    />
                    {Array.from({length: yearCount}, (_, index) => {
                        const year = index + 1;
                        if (year % labelInterval !== 0 && year !== yearCount) {
                            return null;
                        }
                        return (
                            <text
                                key={`year-label-${year}`}
                                x={plotLeft + stepWidth * index + stepWidth / 2}
                                y="245"
                                textAnchor="middle"
                                fill="currentColor"
                                fontSize="11"
                            >
                                {year}年
                            </text>
                        );
                    })}
                    {SCENARIO_IDS.map((scenarioId) => {
                        const result = results.find(({id}) => id === scenarioId);
                        if (!result) {
                            return null;
                        }
                        const segments: string[][] = [];
                        let currentSegment: string[] = [];

                        result.exits.forEach((exit, index) => {
                            if (exit.totalProfitMan === null) {
                                if (currentSegment.length > 0) {
                                    segments.push(currentSegment);
                                    currentSegment = [];
                                }
                                return;
                            }
                            const centerX = plotLeft + stepWidth * index + stepWidth / 2;
                            currentSegment.push(`${centerX},${yFor(exit.totalProfitMan)}`);
                        });
                        if (currentSegment.length > 0) {
                            segments.push(currentSegment);
                        }

                        return (
                            <g key={scenarioId}>
                                {segments.map((points, index) => (
                                    <polyline
                                        key={`${scenarioId}-segment-${index}`}
                                        points={points.join(' ')}
                                        fill="none"
                                        stroke={colors[scenarioId]}
                                        strokeWidth="3"
                                        strokeDasharray={lineStyles[scenarioId]}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                ))}
                                {result.exits.map((exit, index) => {
                                    if (exit.totalProfitMan === null) {
                                        return null;
                                    }
                                    const centerX = plotLeft + stepWidth * index + stepWidth / 2;
                                    return (
                                        <g key={`${scenarioId}-${exit.year}`}>
                                            <circle
                                                cx={centerX}
                                                cy={yFor(exit.totalProfitMan)}
                                                r="3"
                                                fill={colors[scenarioId]}
                                            >
                                                <title>
                                                    {SCENARIO_LABELS[scenarioId]}・{exit.year}年保有：
                                                    {formatMan(exit.totalProfitMan)}万円
                                                </title>
                                            </circle>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs">
                {SCENARIO_IDS.map((scenarioId) => (
                    <span key={scenarioId} className="inline-flex items-center gap-2">
                        <span
                            aria-hidden="true"
                            className="inline-block w-5 border-t-2"
                            style={{
                                borderColor: colors[scenarioId],
                                borderStyle: lineStyles[scenarioId] ? 'dashed' : 'solid',
                            }}
                        />
                        {SCENARIO_LABELS[scenarioId]}
                    </span>
                ))}
            </div>
            <figcaption className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                売却試算が成立しない年は線をつなぎません。正確な金額は年次詳細表で確認できます。
            </figcaption>
        </figure>
    );
}
