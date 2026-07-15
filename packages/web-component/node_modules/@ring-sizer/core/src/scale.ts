// ──────────────────────────────────────────────────────────────
// scale.ts — Pixel-to-millimeter scale computation from a
// reference object (coin or credit card).
// ──────────────────────────────────────────────────────────────

import type { Point2D } from './types.js';

/**
 * Compute the scale factor from a detected coin.
 *
 * @param coinPixelDiameter Detected coin diameter in pixels.
 * @param coinRealDiameterMm Known real diameter of the coin in mm.
 * @returns Scale factor in px/mm.
 * @throws If either parameter is non-positive.
 */
export function computeScale(
  coinPixelDiameter: number,
  coinRealDiameterMm: number,
): number {
  if (coinPixelDiameter <= 0) {
    throw new Error(`Coin pixel diameter must be positive: ${coinPixelDiameter}`);
  }
  if (coinRealDiameterMm <= 0) {
    throw new Error(`Coin real diameter must be positive: ${coinRealDiameterMm}`);
  }
  return coinPixelDiameter / coinRealDiameterMm;
}

/**
 * Convert a pixel measurement to millimeters.
 *
 * @param px Measurement in pixels.
 * @param scale Scale factor in px/mm (from computeScale).
 * @returns Measurement in mm.
 */
export function pxToMm(px: number, scale: number): number {
  if (scale <= 0) {
    throw new Error(`Scale must be positive: ${scale}`);
  }
  return px / scale;
}

/** Euclidean distance between two 2D points. */
function dist(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the scale factor from a detected credit-card quad.
 *
 * The four corners should be in order (either CW or CCW).
 * We measure two pairs of opposite edges, identify the long pair
 * (card width = 85.60 mm) and short pair (card height = 53.98 mm),
 * and average both scale estimates.
 *
 * @param corners Four detected quad corners in pixel coordinates, in order.
 * @param realWidthMm Card width in mm (ISO ID-1 = 85.60).
 * @param realHeightMm Card height in mm (ISO ID-1 = 53.98).
 * @returns Scale factor in px/mm.
 * @throws If corners are degenerate or dimensions are non-positive.
 */
export function computeScaleFromCard(
  corners: [Point2D, Point2D, Point2D, Point2D],
  realWidthMm: number,
  realHeightMm: number,
): number {
  if (realWidthMm <= 0 || realHeightMm <= 0) {
    throw new Error(
      `Card dimensions must be positive: ${realWidthMm} × ${realHeightMm}`,
    );
  }

  // Measure the four edge lengths
  const edge01 = dist(corners[0], corners[1]);
  const edge12 = dist(corners[1], corners[2]);
  const edge23 = dist(corners[2], corners[3]);
  const edge30 = dist(corners[3], corners[0]);

  // Average opposite edges
  const pairA = (edge01 + edge23) / 2; // edges 0-1 and 2-3
  const pairB = (edge12 + edge30) / 2; // edges 1-2 and 3-0

  // The longer pair corresponds to the card width, shorter to height
  let scaleFromWidth: number;
  let scaleFromHeight: number;

  if (pairA >= pairB) {
    scaleFromWidth = pairA / realWidthMm;
    scaleFromHeight = pairB / realHeightMm;
  } else {
    scaleFromWidth = pairB / realWidthMm;
    scaleFromHeight = pairA / realHeightMm;
  }

  if (scaleFromWidth <= 0 || scaleFromHeight <= 0) {
    throw new Error('Degenerate card corners: zero-length edges');
  }

  // Average both scale estimates for better accuracy
  return (scaleFromWidth + scaleFromHeight) / 2;
}
