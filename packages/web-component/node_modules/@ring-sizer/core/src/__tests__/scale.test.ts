import { describe, it, expect } from 'vitest';
import { computeScale, pxToMm, computeScaleFromCard } from '../scale.js';
import type { Point2D } from '../types.js';

describe('computeScale', () => {
  it('computes px/mm from coin diameter', () => {
    // ₹10 coin: 27mm real, detected at 270px → 10 px/mm
    expect(computeScale(270, 27)).toBe(10);
  });

  it('works with fractional values', () => {
    // 135px detected, 27mm real → 5 px/mm
    expect(computeScale(135, 27)).toBe(5);
  });

  it('throws for non-positive pixel diameter', () => {
    expect(() => computeScale(0, 27)).toThrow('positive');
    expect(() => computeScale(-10, 27)).toThrow('positive');
  });

  it('throws for non-positive real diameter', () => {
    expect(() => computeScale(270, 0)).toThrow('positive');
    expect(() => computeScale(270, -1)).toThrow('positive');
  });
});

describe('pxToMm', () => {
  it('converts pixels to mm using scale factor', () => {
    // 150px at scale 10 px/mm → 15mm
    expect(pxToMm(150, 10)).toBe(15);
  });

  it('handles sub-pixel precision', () => {
    expect(pxToMm(13.5, 10)).toBeCloseTo(1.35, 10);
  });

  it('throws for non-positive scale', () => {
    expect(() => pxToMm(100, 0)).toThrow('positive');
    expect(() => pxToMm(100, -5)).toThrow('positive');
  });
});

describe('computeScaleFromCard', () => {
  it('computes scale from an axis-aligned rectangle', () => {
    // Card at 856px × 539.8px (scale = 10 px/mm)
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 },
      { x: 856, y: 0 },
      { x: 856, y: 539.8 },
      { x: 0, y: 539.8 },
    ];
    const scale = computeScaleFromCard(corners, 85.60, 53.98);
    expect(scale).toBeCloseTo(10, 1);
  });

  it('computes scale from a rotated rectangle', () => {
    // Rotate a 856 × 539.8 rectangle by 30° around origin
    const angle = Math.PI / 6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const w = 856;
    const h = 539.8;
    const pts: [number, number][] = [
      [0, 0], [w, 0], [w, h], [0, h],
    ];
    const corners = pts.map(([x, y]) => ({
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    })) as [Point2D, Point2D, Point2D, Point2D];

    const scale = computeScaleFromCard(corners, 85.60, 53.98);
    // Rotation doesn't change edge lengths, so scale should still be ~10
    expect(scale).toBeCloseTo(10, 1);
  });

  it('handles a card at different scale', () => {
    // Card at 428px × 269.9px (scale = 5 px/mm)
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 100, y: 100 },
      { x: 528, y: 100 },
      { x: 528, y: 369.9 },
      { x: 100, y: 369.9 },
    ];
    const scale = computeScaleFromCard(corners, 85.60, 53.98);
    expect(scale).toBeCloseTo(5, 1);
  });

  it('identifies width vs height by edge length', () => {
    // Swap width and height orientation — still gets correct scale
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 },
      { x: 539.8, y: 0 },     // short edge first
      { x: 539.8, y: 856 },   // long edge second
      { x: 0, y: 856 },
    ];
    const scale = computeScaleFromCard(corners, 85.60, 53.98);
    expect(scale).toBeCloseTo(10, 1);
  });

  it('throws for non-positive dimensions', () => {
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 },
    ];
    expect(() => computeScaleFromCard(corners, 0, 53.98)).toThrow('positive');
    expect(() => computeScaleFromCard(corners, 85.60, -1)).toThrow('positive');
  });
});
