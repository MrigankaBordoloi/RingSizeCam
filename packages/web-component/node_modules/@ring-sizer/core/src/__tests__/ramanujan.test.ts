import { describe, it, expect } from 'vitest';
import { ellipseCircumference } from '../ramanujan.js';

describe('ellipseCircumference', () => {
  it('returns 2πa for a circle (a === b)', () => {
    const a = 10;
    const result = ellipseCircumference(a, a);
    const expected = 2 * Math.PI * a; // 62.8318...
    expect(result).toBeCloseTo(expected, 2);
  });

  it('computes a known ellipse circumference (a=10, b=5)', () => {
    // Ramanujan's approximation for a=10, b=5 is very accurate.
    // True value ≈ 48.4422 (via numerical integration).
    // Ramanujan gives ≈ 48.4422 (error < 0.01%).
    const result = ellipseCircumference(10, 5);
    expect(result).toBeCloseTo(48.4422, 1);
  });

  it('handles b > a by swapping', () => {
    const r1 = ellipseCircumference(10, 5);
    const r2 = ellipseCircumference(5, 10);
    expect(r1).toBeCloseTo(r2, 10);
  });

  it('returns 0 for degenerate case a=0, b=0', () => {
    expect(ellipseCircumference(0, 0)).toBe(0);
  });

  it('throws for negative semi-axes', () => {
    expect(() => ellipseCircumference(-1, 5)).toThrow('non-negative');
    expect(() => ellipseCircumference(5, -1)).toThrow('non-negative');
  });
});
