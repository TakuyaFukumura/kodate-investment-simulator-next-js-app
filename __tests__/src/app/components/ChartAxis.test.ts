import {getAxisRange, getAxisTicks} from '../../../../src/app/components/ChartAxis';

describe('chart axis utilities', () => {
    it('expands a constant range so its values remain visible', () => {
        expect(getAxisRange(0, 0)).toEqual({minimum: -1, maximum: 1});
    });

    it('returns ordered ticks with a single zero when the range crosses zero', () => {
        const ticks = getAxisTicks(-2, 3);

        expect(ticks[0]).toBe(-2);
        expect(ticks.at(-1)).toBe(3);
        expect(ticks).toContain(0);
        expect(ticks.filter((tick) => tick === 0)).toHaveLength(1);
        expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
    });
});
