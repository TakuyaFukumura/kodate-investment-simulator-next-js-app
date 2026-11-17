type ChartValueAxisProps = Readonly<{
    ticks: number[];
    yFor: (value: number) => number;
    plotLeft: number;
    plotRight: number;
}>;

export function getAxisRange(minimum: number, maximum: number) {
    return minimum === maximum
        ? {minimum: minimum - 1, maximum: maximum + 1}
        : {minimum, maximum};
}

export function getAxisTicks(minimum: number, maximum: number): number[] {
    const values = Array.from({length: 5}, (_, index) => (
        minimum + ((maximum - minimum) * index) / 4
    ));

    if (minimum <= 0 && maximum >= 0) {
        values.push(0);
    }

    return [...new Set(values.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
}

export function ChartValueAxis({ticks, yFor, plotLeft, plotRight}: ChartValueAxisProps) {
    return (
        <g aria-hidden="true">
            {ticks.map((tick) => {
                const y = yFor(tick);
                const isZero = tick === 0;

                return (
                    <g key={tick}>
                        <line
                            x1={plotLeft}
                            x2={plotRight}
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeDasharray={isZero ? undefined : '2 4'}
                            opacity={isZero ? 0.45 : 0.16}
                        />
                        <text
                            x={plotLeft - 8}
                            y={y + 4}
                            textAnchor="end"
                            fill="currentColor"
                            fontSize="11"
                        >
                            {tick.toLocaleString('ja-JP', {maximumFractionDigits: 1})}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}
