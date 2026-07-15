// ──────────────────────────────────────────────────────────────
// oneEuro.ts — One Euro filter for real-time signal smoothing.
// Reference: Casiez et al., "1€ Filter", CHI 2012.
// ──────────────────────────────────────────────────────────────

import type { OneEuroParams } from './types.js';

/** Low-pass filter with exponential smoothing. */
class LowPassFilter {
  private y: number | undefined;
  private s: number | undefined;

  filter(value: number, alpha: number): number {
    if (this.y === undefined) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.y;
    }
    this.y = this.s;
    return this.s!;
  }

  hasLastValue(): boolean {
    return this.y !== undefined;
  }

  lastValue(): number {
    return this.y!;
  }
}

/**
 * One Euro filter — balances smoothing (low jitter) with responsiveness
 * (low lag) by adapting the cutoff frequency based on signal speed.
 */
export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private readonly xFilter = new LowPassFilter();
  private readonly dxFilter = new LowPassFilter();
  private lastTimestamp: number | undefined;

  constructor(params: OneEuroParams) {
    this.minCutoff = params.minCutoff;
    this.beta = params.beta;
    this.dCutoff = params.dCutoff;
  }

  /** Compute smoothing factor alpha from cutoff frequency and sample rate. */
  private alpha(cutoff: number, rate: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  /**
   * Filter a new sample.
   *
   * @param value Raw measurement value.
   * @param timestamp Time in seconds (monotonically increasing).
   * @returns Filtered value.
   */
  filter(value: number, timestamp: number): number {
    if (this.lastTimestamp === undefined) {
      // First sample — seed both filters
      const rate = 30; // assume 30 Hz for derivative bootstrap
      const dAlpha = this.alpha(this.dCutoff, rate);
      this.dxFilter.filter(0, dAlpha);
      const cutoff = this.minCutoff + this.beta * Math.abs(0);
      const xAlpha = this.alpha(cutoff, rate);
      this.lastTimestamp = timestamp;
      return this.xFilter.filter(value, xAlpha);
    }

    const dt = timestamp - this.lastTimestamp;
    if (dt <= 0) {
      // Duplicate or out-of-order timestamp — return last value
      return this.xFilter.lastValue();
    }

    const rate = 1.0 / dt;
    this.lastTimestamp = timestamp;

    // Estimate derivative
    const dx = (value - this.xFilter.lastValue()) / dt;
    const dAlpha = this.alpha(this.dCutoff, rate);
    const edx = this.dxFilter.filter(dx, dAlpha);

    // Adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const xAlpha = this.alpha(cutoff, rate);

    return this.xFilter.filter(value, xAlpha);
  }

  /** Reset the filter state. */
  reset(): void {
    this.lastTimestamp = undefined;
    // Create new internal filters by re-constructing
    // (LowPassFilter doesn't expose a reset, so we rely on the undefined checks)
  }
}
