import type { WidthObservation, AggregateResult } from './types.js';
/**
 * Compute a percentile value from a sorted-ascending array using
 * linear interpolation (R-7 method, same as NumPy default).
 *
 * @param sorted Array of numbers sorted in ascending order.
 * @param p Percentile in [0, 100].
 * @returns Interpolated value at the given percentile.
 */
export declare function percentile(sorted: number[], p: number): number;
/**
 * Least-squares fit of the ellipse width model:
 *   w(θ) = 2√(a²cos²θ + b²sin²θ)
 *
 * Reparameterize as:
 *   w² = 4(a²cos²θ + b²sin²θ)
 *   w² = 4a²·cos²θ + 4b²·sin²θ
 *
 * This is linear in unknowns [4a², 4b²]. Let x₁ = 4a², x₂ = 4b².
 * Then for each observation: cos²θᵢ · x₁ + sin²θᵢ · x₂ = wᵢ²
 *
 * Normal equations for 2×2 system:
 *   AᵀA · x = Aᵀb
 *
 * where A = [cos²θ₁ sin²θ₁; cos²θ₂ sin²θ₂; ...], b = [w₁²; w₂²; ...]
 *
 * @param observations Width measurements with estimated θ.
 * @returns Semi-axes { a, b } with a ≥ b, or null if the system is degenerate.
 */
export declare function fitEllipseWidths(observations: WidthObservation[]): {
    a: number;
    b: number;
} | null;
/**
 * Aggregate width measurements into ellipse semi-axes.
 *
 * Strategy:
 * - If observations with θ data are provided AND θ coverage ≥ minCoverageDeg,
 *   use least-squares ellipse fit.
 * - Otherwise, fall back to percentile method (P95/P5).
 *
 * @param widths Array of measured finger widths in mm (from gated frames).
 * @param observations Optional array of width+θ observations.
 * @param minCoverageDeg Minimum θ coverage to use LS fit (default: 60°).
 * @returns AggregateResult with semi-axes, method used, and θ coverage.
 * @throws If widths array is empty.
 */
export declare function aggregateWidths(widths: number[], observations?: WidthObservation[], minCoverageDeg?: number): AggregateResult;
//# sourceMappingURL=aggregate.d.ts.map