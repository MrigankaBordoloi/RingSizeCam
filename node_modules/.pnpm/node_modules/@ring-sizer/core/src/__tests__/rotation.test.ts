import { describe, it, expect } from 'vitest';
import { estimateFingerTheta, thetaCoverage } from '../rotation.js';
import type { Vec3 } from '../rotation.js';

describe('estimateFingerTheta', () => {
  it('returns a defined angle for a standard hand geometry', () => {
    // Finger pointing along Y axis, middle finger MCP to the right (+X)
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 1, z: 0 };
    const middleMCP: Vec3 = { x: 1, y: 0, z: 0 };

    const theta = estimateFingerTheta(ringMCP, ringPIP, middleMCP);
    expect(typeof theta).toBe('number');
    expect(Number.isFinite(theta)).toBe(true);
  });

  it('changes when the reference point rotates around the finger axis', () => {
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 1, z: 0 };

    // Middle finger MCP to the right → one angle
    const theta1 = estimateFingerTheta(ringMCP, ringPIP, { x: 1, y: 0.2, z: 0 });
    // Middle finger MCP behind (Z) → different angle (rotated ~90° around Y axis)
    const theta2 = estimateFingerTheta(ringMCP, ringPIP, { x: 0, y: 0.2, z: 1 });
    // Middle finger MCP to the left → yet another angle
    const theta3 = estimateFingerTheta(ringMCP, ringPIP, { x: -1, y: 0.2, z: 0 });

    // All three should be distinct
    expect(Math.abs(theta1 - theta2)).toBeGreaterThan(0.3);
    expect(Math.abs(theta2 - theta3)).toBeGreaterThan(0.3);
    expect(Math.abs(theta1 - theta3)).toBeGreaterThan(0.3);
  });

  it('returns 0 for degenerate case (MCP and PIP coincident)', () => {
    const ringMCP: Vec3 = { x: 5, y: 5, z: 5 };
    const ringPIP: Vec3 = { x: 5, y: 5, z: 5 };
    const middleMCP: Vec3 = { x: 6, y: 5, z: 5 };

    const theta = estimateFingerTheta(ringMCP, ringPIP, middleMCP);
    expect(theta).toBe(0);
  });

  it('returns 0 when reference is parallel to finger axis', () => {
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 1, z: 0 };
    // Middle MCP along the same Y axis — projection onto perp plane is zero
    const middleMCP: Vec3 = { x: 0, y: 2, z: 0 };

    const theta = estimateFingerTheta(ringMCP, ringPIP, middleMCP);
    expect(theta).toBe(0);
  });

  it('measures theta against a basis independent of ref (regression guard for the ref-derived-basis bug)', () => {
    // Finger axis = +Y, so the fixed basis is derived from world Z/X, not
    // from middleMCP itself — this is what makes theta actually vary.
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 1, z: 0 };

    const theta1 = estimateFingerTheta(ringMCP, ringPIP, { x: 1, y: 0.2, z: 0 });
    const theta2 = estimateFingerTheta(ringMCP, ringPIP, { x: 0, y: 0.2, z: 1 });
    const theta3 = estimateFingerTheta(ringMCP, ringPIP, { x: -1, y: 0.2, z: 0 });

    expect(theta1).toBeCloseTo(Math.PI / 2, 5);
    expect(theta2).toBeCloseTo(0, 5);
    expect(theta3).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('handles a finger axis nearly parallel to the primary world axis without degenerating', () => {
    // Axis along +Z triggers the WORLD_FALLBACK branch.
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 0, z: 1 };

    const thetaA = estimateFingerTheta(ringMCP, ringPIP, { x: 1, y: 0, z: 0.2 });
    const thetaB = estimateFingerTheta(ringMCP, ringPIP, { x: 0, y: 1, z: 0.2 });

    expect(Math.abs(thetaA - thetaB)).toBeGreaterThan(0.3);
  });

  it('produces angles in (-π, π] range', () => {
    const ringMCP: Vec3 = { x: 0, y: 0, z: 0 };
    const ringPIP: Vec3 = { x: 0, y: 1, z: 0 };

    // Test several positions around the finger axis
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const middleMCP: Vec3 = {
        x: Math.cos(angle),
        y: 0.5,
        z: Math.sin(angle),
      };
      const theta = estimateFingerTheta(ringMCP, ringPIP, middleMCP);
      expect(theta).toBeGreaterThanOrEqual(-Math.PI);
      expect(theta).toBeLessThanOrEqual(Math.PI);
    }
  });
});

describe('thetaCoverage', () => {
  it('returns 0 for fewer than 2 observations', () => {
    expect(thetaCoverage([])).toBe(0);
    expect(thetaCoverage([1.5])).toBe(0);
  });

  it('computes coverage for a 90° spread', () => {
    const thetas = [0, Math.PI / 4, Math.PI / 2]; // 0°, 45°, 90°
    const coverage = thetaCoverage(thetas);
    expect(coverage).toBeCloseTo(90, 0);
  });

  it('computes coverage for a 180° spread', () => {
    const thetas = [0, Math.PI / 2, Math.PI]; // 0° to 180°
    const coverage = thetaCoverage(thetas);
    expect(coverage).toBeCloseTo(180, 0);
  });

  it('handles wraparound correctly', () => {
    // Angles near 0 and near 2π should count as close, not 360° apart
    const thetas = [-0.1, 0, 0.1, Math.PI - 0.1, Math.PI, Math.PI + 0.1];
    const coverage = thetaCoverage(thetas);
    // Coverage should be ~180° (from -0.1 to π+0.1), not ~360°
    expect(coverage).toBeCloseTo(180 + (0.2 / Math.PI) * 180, 0);
  });

  it('returns ~360° for full coverage', () => {
    const thetas: number[] = [];
    for (let i = 0; i < 36; i++) {
      thetas.push((i / 36) * 2 * Math.PI);
    }
    const coverage = thetaCoverage(thetas);
    expect(coverage).toBeGreaterThan(349);
  });

  it('returns the correct coverage for clustered angles', () => {
    // All angles within 30°
    const thetas = [0, 0.1, 0.2, 0.3, 0.4, 0.5]; // ~28.6°
    const coverage = thetaCoverage(thetas);
    expect(coverage).toBeCloseTo(0.5 * (180 / Math.PI), 0);
  });
});
