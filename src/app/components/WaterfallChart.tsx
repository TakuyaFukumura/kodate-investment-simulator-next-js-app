import {InvestmentResult} from '../../lib/investment';

type WaterfallChartProps = {
    result: InvestmentResult;
};

const formatMan = (amount: number) => amount.toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export default function WaterfallChart({result}: WaterfallChartProps) {
    const stages = [
        {
            label: '満室想定家賃',
            start: 0,
            end: result.potentialAnnualRentMan,
            cumulative: result.potentialAnnualRentMan,
            kind: 'total',
        },
        {
            label: '空室損失',
            start: result.potentialAnnualRentMan,
            end: result.effectiveAnnualRentMan,
            cumulative: result.effectiveAnnualRentMan,
            kind: 'deduction',
        },
        {
            label: '運営費',
            start: result.effectiveAnnualRentMan,
            end: result.noiMan,
            cumulative: result.noiMan,
            kind: 'deduction',
        },
        {
            label: 'NOI',
            start: 0,
            end: result.noiMan,
            cumulative: result.noiMan,
            kind: 'subtotal',
        },
        {
            label: '年間返済額',
            start: result.noiMan,
            end: result.annualCashFlowMan,
            cumulative: result.annualCashFlowMan,
            kind: 'deduction',
        },
        {
            label: '税引前CF',
            start: 0,
            end: result.annualCashFlowMan,
            cumulative: result.annualCashFlowMan,
            kind: 'cash-flow',
        },
    ] as const;

    const width = 720;
    const plotTop = 24;
    const plotHeight = 190;
    const barWidth = 56;
    const stepWidth = width / stages.length;
    const minValue = Math.min(0, ...stages.flatMap(({start, end}) => [start, end]));
    const maxValue = Math.max(0, ...stages.flatMap(({start, end}) => [start, end]));
    const valueRange = maxValue - minValue || 1;
    const yFor = (value: number) => plotTop + ((maxValue - value) / valueRange) * plotHeight;
    const zeroY = yFor(0);

    return (
        <figure className="overflow-x-auto">
            <svg
                className="min-w-[640px] w-full"
                role="img"
                aria-label="満室想定家賃から空室損失、運営費、ローン返済を差し引いた税引前キャッシュフローのウォーターフォールグラフ"
                viewBox={`0 0 ${width} 290`}
            >
                <title>年間収支構成（単位：万円）</title>
                <line x1="20" x2={width - 20} y1={zeroY} y2={zeroY} stroke="currentColor" opacity="0.35"/>
                <text x="20" y={zeroY - 5} fill="currentColor" fontSize="11">0</text>
                {stages.map((stage, index) => {
                    const centerX = stepWidth * index + stepWidth / 2;
                    const x = centerX - barWidth / 2;
                    const top = Math.min(yFor(stage.start), yFor(stage.end));
                    const height = Math.max(1, Math.abs(yFor(stage.start) - yFor(stage.end)));
                    const color = stage.kind === 'deduction'
                        ? '#f97316'
                        : stage.kind === 'cash-flow' && stage.end < 0
                            ? '#dc2626'
                            : stage.kind === 'total'
                                ? '#2563eb'
                                : '#16a34a';
                    const value = stage.kind === 'deduction'
                        ? stage.start - stage.end
                        : stage.end;

                    return (
                        <g key={stage.label}>
                            {index > 0 && (
                                <line
                                    x1={stepWidth * (index - 1) + stepWidth / 2 + barWidth / 2}
                                    x2={x}
                                    y1={yFor(stages[index - 1].cumulative)}
                                    y2={yFor(stages[index - 1].cumulative)}
                                    stroke="currentColor"
                                    strokeDasharray="4 4"
                                    opacity="0.45"
                                />
                            )}
                            <rect
                                x={x}
                                y={top}
                                width={barWidth}
                                height={height}
                                rx="4"
                                fill={color}
                            />
                            <text
                                x={centerX}
                                y={stage.end >= stage.start ? top - 7 : top + height + 14}
                                textAnchor="middle"
                                fill="currentColor"
                                fontSize="11"
                            >
                                {formatMan(value)}
                            </text>
                            <text
                                x={centerX}
                                y="250"
                                textAnchor="middle"
                                fill="currentColor"
                                fontSize="11"
                            >
                                {stage.label}
                            </text>
                        </g>
                    );
                })}
                <text x={width - 18} y="278" textAnchor="end" fill="currentColor" fontSize="11">
                    万円／年
                </text>
            </svg>
            <figcaption className="sr-only">
                満室想定家賃 {formatMan(result.potentialAnnualRentMan)} 万円から、空室損失 {formatMan(result.vacancyLossMan)} 万円、
                運営費 {formatMan(result.annualOperatingCostsMan)} 万円、年間返済額 {formatMan(result.annualLoanRepaymentMan)} 万円を差し引き、
                税引前年間キャッシュフローは {formatMan(result.annualCashFlowMan)} 万円です。
            </figcaption>
        </figure>
    );
}
