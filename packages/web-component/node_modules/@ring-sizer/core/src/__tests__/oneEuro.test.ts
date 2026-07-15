import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from '../oneEuro.js';

describe('OneEuroFilter', () => {
  it('converges on a constant signal', () => {
    const filter = new OneEuroFilter({
      minCutoff: 1.0,
      beta: 0.007,
      dCutoff: 1.0,
    });

    const constant = 5.0;
    let output = 0;
    // Feed 100 samples at 30 Hz
    for (let i = 0; i < 100; i++) {
      output = filter.filter(constant, i / 30);
    }

    expect(output).toBeCloseTo(constant, 2);
  });

  it('smooths a noisy ramp signal', () => {
    const filter = new OneEuroFilter({
      minCutoff: 1.0,
      beta: 0.007,
      dCutoff: 1.0,
    });

    // Deterministic "noise" via a simple LCG
    let seed = 42;
    function pseudoNoise(): number {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff - 0.5) * 2; // range [-1, 1]
    }

    const n = 200;
    const rawErrors: number[] = [];
    const filteredErrors: number[] = [];

    for (let i = 0; i < n; i++) {
      const t = i / 30;
      const trueValue = t * 10; // ramp: 10 mm/s
      const noisy = trueValue + pseudoNoise() * 3; // ±3mm noise
      const filtered = filter.filter(noisy, t);

      rawErrors.push(Math.abs(noisy - trueValue));
      filteredErrors.push(Math.abs(filtered - trueValue));
    }

    // Filtered signal should have lower mean error than raw (after initial convergence)
    const skip = 30; // skip initial convergence
    const rawMean =
      rawErrors.slice(skip).reduce((a, b) => a + b, 0) / (n - skip);
    const filteredMean =
      filteredErrors.slice(skip).reduce((a, b) => a + b, 0) / (n - skip);

    expect(filteredMean).toBeLessThan(rawMean);
  });

  it('handles duplicate timestamps gracefully', () => {
    const filter = new OneEuroFilter({
      minCutoff: 1.0,
      beta: 0.007,
      dCutoff: 1.0,
    });

    const v1 = filter.filter(5.0, 0);
    const v2 = filter.filter(6.0, 0); // same timestamp
    // Should return previous value, not crash
    expect(v2).toBe(v1);
  });
});
