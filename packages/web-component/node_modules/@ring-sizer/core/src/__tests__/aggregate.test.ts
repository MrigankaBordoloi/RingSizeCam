import { describe, it, expect } from 'vitest';
import { percentile, aggregateWidths, fitEllipseWidths } from '../aggregate.js';
import type { WidthObservation } from '../types.js';

describe('percentile', () => {
  it('returns the only element for a single-element array', () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it('returns min at P0', () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
  });

  it('returns max at P100', () => {
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });

  it('returns median at P50 for odd-length array', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('interpolates at P50 for even-length array', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
  });

  it('throws on empty array', () => {
    expect(() => percentile([], 50)).toThrow('empty');
  });

  it('throws on out-of-range percentile', () => {
    expect(() => percentile([1], -1)).toThrow();
    expect(() => percentile([1], 101)).toThrow();
  });
});

// ── Helper: generate synthetic widths from ellipse model ──
function syntheticWidth(a: number, b: number, thetaRad: number): number {
  return 2 * Math.sqrt(a * a * Math.cos(thetaRad) ** 2 + b * b * Math.sin(thetaRad) ** 2);
}

describe('fitEllipseWidths', () => {
  it('recovers a = b for a circle (synthetic)', () => {
    const a = 9, b = 9;
    const observations: WidthObservation[] = [];
    for (let i = 0; i < 20; i++) {
      const theta = (i / 20) * Math.PI; // 0 to π
      observations.push({ widthMm: syntheticWidth(a, b, theta), thetaRad: theta });
    }

    const result = fitEllipseWidths(observations);
    expect(result).not.toBeNull();
    expect(result!.a).toBeCloseTo(9, 2);
    expect(result!.b).toBeCloseTo(9, 2);
  });

  it('recovers known ellipse semi-axes (a=10, b=7)', () => {
    const a = 10, b = 7;
    const observations: WidthObservation[] = [];
    for (let i = 0; i < 30; i++) {
      const theta = (i / 30) * Math.PI;
      observations.push({ widthMm: syntheticWidth(a, b, theta), thetaRad: theta });
    }

    const result = fitEllipseWidths(observations);
    expect(result).not.toBeNull();
    expect(result!.a).toBeCloseTo(10, 1);
    expect(result!.b).toBeCloseTo(7, 1);
  });

  it('handles noisy synthetic data reasonably', () => {
    const a = 10, b = 7;
    // Deterministic noise
    let seed = 42;
    function pseudoNoise(): number {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff - 0.5) * 2;
    }

    const observations: WidthObservation[] = [];
    for (let i = 0; i < 50; i++) {
      const theta = (i / 50) * Math.PI;
      const noisy = syntheticWidth(a, b, theta) + pseudoNoise() * 0.5;
      observations.push({ widthMm: noisy, thetaRad: theta });
    }

    const result = fitEllipseWidths(observations);
    expect(result).not.toBeNull();
    // With ±0.5mm noise on widths of ~14-20mm, should be within ~1mm
    expect(result!.a).toBeCloseTo(10, 0);
    expect(result!.b).toBeCloseTo(7, 0);
  });

  it('returns null for fewer than 2 observations', () => {
    expect(fitEllipseWidths([])).toBeNull();
    expect(fitEllipseWidths([{ widthMm: 18, thetaRad: 0 }])).toBeNull();
  });

  it('returns null for all observations at the same angle (singular)', () => {
    const observations: WidthObservation[] = Array(10).fill(null).map(() => ({
      widthMm: 18,
      thetaRad: 0.5,
    }));
    // All at the same angle → can't separate a from b
    const result = fitEllipseWidths(observations);
    expect(result).toBeNull();
  });
});

describe('aggregateWidths', () => {
  it('extracts semi-axes from a uniform distribution (percentile fallback)', () => {
    const widths: number[] = [];
    for (let w = 16; w <= 20; w += 0.1) {
      widths.push(Math.round(w * 10) / 10);
    }

    const result = aggregateWidths(widths);
    expect(result.a).toBeCloseTo(9.9, 0);
    expect(result.b).toBeCloseTo(8.1, 0);
    expect(result.method).toBe('percentile');
    expect(result.thetaCoverageDeg).toBe(0);
  });

  it('returns a ≈ b for a constant distribution (circle case)', () => {
    const widths = Array(100).fill(18);
    const result = aggregateWidths(widths);
    expect(result.a).toBeCloseTo(9.0, 5);
    expect(result.b).toBeCloseTo(9.0, 5);
    expect(result.method).toBe('percentile');
  });

  it('uses least-squares when θ coverage ≥ 60°', () => {
    const a = 10, b = 7;
    const observations: WidthObservation[] = [];
    const widths: number[] = [];
    // 120° coverage (well above 60° threshold)
    for (let i = 0; i < 40; i++) {
      const theta = (i / 40) * (2 * Math.PI / 3); // 0 to 120°
      const w = syntheticWidth(a, b, theta);
      observations.push({ widthMm: w, thetaRad: theta });
      widths.push(w);
    }

    const result = aggregateWidths(widths, observations);
    expect(result.method).toBe('least-squares');
    expect(result.a).toBeCloseTo(10, 1);
    expect(result.b).toBeCloseTo(7, 1);
    expect(result.thetaCoverageDeg).toBeGreaterThanOrEqual(60);
  });

  it('falls back to percentile when θ coverage < 60°', () => {
    const a = 10, b = 7;
    const observations: WidthObservation[] = [];
    const widths: number[] = [];
    // Only 40° coverage
    for (let i = 0; i < 20; i++) {
      const theta = (i / 20) * (40 * Math.PI / 180); // 0 to 40°
      const w = syntheticWidth(a, b, theta);
      observations.push({ widthMm: w, thetaRad: theta });
      widths.push(w);
    }

    const result = aggregateWidths(widths, observations);
    expect(result.method).toBe('percentile');
    expect(result.thetaCoverageDeg).toBeLessThan(60);
  });

  it('backward compat: works without observations (percentile)', () => {
    const widths = [16, 17, 18, 19, 20];
    const result = aggregateWidths(widths);
    expect(result.method).toBe('percentile');
    expect(result.a).toBeGreaterThan(0);
    expect(result.b).toBeGreaterThan(0);
    expect(result.a).toBeGreaterThan(result.b);
  });

  it('is not sensitive to insertion order', () => {
    const ordered = [15, 16, 17, 18, 19, 20, 21];
    const reversed = [...ordered].reverse();

    const r1 = aggregateWidths(ordered);
    const r2 = aggregateWidths(reversed);

    expect(r1.a).toBeCloseTo(r2.a, 10);
    expect(r1.b).toBeCloseTo(r2.b, 10);
  });

  it('throws on empty array', () => {
    expect(() => aggregateWidths([])).toThrow('zero widths');
  });
});
