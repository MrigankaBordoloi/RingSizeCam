import type { Point2D } from './types.js';
/**
 * Compute the scale factor from a detected coin.
 *
 * @param coinPixelDiameter Detected coin diameter in pixels.
 * @param coinRealDiameterMm Known real diameter of the coin in mm.
 * @returns Scale factor in px/mm.
 * @throws If either parameter is non-positive.
 */
export declare function computeScale(coinPixelDiameter: number, coinRealDiameterMm: number): number;
/**
 * Convert a pixel measurement to millimeters.
 *
 * @param px Measurement in pixels.
 * @param scale Scale factor in px/mm (from computeScale).
 * @returns Measurement in mm.
 */
export declare function pxToMm(px: number, scale: number): number;
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
export declare function computeScaleFromCard(corners: [Point2D, Point2D, Point2D, Point2D], realWidthMm: number, realHeightMm: number): number;
//# sourceMappingURL=scale.d.ts.map