import type { OneEuroParams } from './types.js';
/**
 * One Euro filter — balances smoothing (low jitter) with responsiveness
 * (low lag) by adapting the cutoff frequency based on signal speed.
 */
export declare class OneEuroFilter {
    private readonly minCutoff;
    private readonly beta;
    private readonly dCutoff;
    private readonly xFilter;
    private readonly dxFilter;
    private lastTimestamp;
    constructor(params: OneEuroParams);
    /** Compute smoothing factor alpha from cutoff frequency and sample rate. */
    private alpha;
    /**
     * Filter a new sample.
     *
     * @param value Raw measurement value.
     * @param timestamp Time in seconds (monotonically increasing).
     * @returns Filtered value.
     */
    filter(value: number, timestamp: number): number;
    /** Reset the filter state. */
    reset(): void;
}
//# sourceMappingURL=oneEuro.d.ts.map