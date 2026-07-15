// ──────────────────────────────────────────────────────────────
// aggregate.ts — Width distribution aggregation for ellipse fitting.
// Phase 2: least-squares fit of w(θ) = 2√(a²cos²θ + b²sin²θ)
// with percentile fallback when θ coverage < threshold.
// ──────────────────────────────────────────────────────────────
import { thetaCoverage } from './rotation.js';
/**
 * Compute a percentile value from a sorted-ascending array using
 * linear interpolation (R-7 method, same as NumPy default).
 *
 * @param sorted Array of numbers sorted in ascending order.
 * @param p Percentile in [0, 100].
 * @returns Interpolated value at the given percentile.
 */
export function percentile(sorted, p) {
    if (sorted.length === 0) {
        throw new Error('Cannot compute percentile of an empty array');
    }
    if (p < 0 || p > 100) {
        throw new Error(`Percentile must be in [0, 100]: ${p}`);
    }
    if (sorted.length === 1) {
        return sorted[0];
    }
    // R-7 interpolation (NumPy default)
    const n = sorted.length;
    const index = (p / 100) * (n - 1);
    const lo = Math.floor(index);
    const hi = Math.ceil(index);
    const frac = index - lo;
    if (lo === hi) {
        return sorted[lo];
    }
    return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}
/**
 * Percentile-based semi-axis extraction (Phase 1 method).
 *   semi-major a = P95(widths) / 2
 *   semi-minor b = P5(widths) / 2
 */
function percentileAggregate(widths) {
    const sorted = [...widths].sort((x, y) => x - y);
    const p95 = percentile(sorted, 95);
    const p5 = percentile(sorted, 5);
    return {
        a: p95 / 2,
        b: p5 / 2,
    };
}
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
export function fitEllipseWidths(observations) {
    if (observations.length < 2)
        return null;
    // Build the 2×2 normal equation system: (AᵀA)x = Aᵀb
    let ata00 = 0; // Σ cos⁴θ
    let ata01 = 0; // Σ cos²θ·sin²θ
    let ata11 = 0; // Σ sin⁴θ
    let atb0 = 0; // Σ cos²θ·w²
    let atb1 = 0; // Σ sin²θ·w²
    for (const obs of observations) {
        const c2 = Math.cos(obs.thetaRad) ** 2;
        const s2 = Math.sin(obs.thetaRad) ** 2;
        const w2 = obs.widthMm ** 2;
        ata00 += c2 * c2;
        ata01 += c2 * s2;
        ata11 += s2 * s2;
        atb0 += c2 * w2;
        atb1 += s2 * w2;
    }
    // Solve 2×2 system via Cramer's rule
    const det = ata00 * ata11 - ata01 * ata01;
    if (Math.abs(det) < 1e-12) {
        // Singular — all observations at the same angle, can't separate a from b
        return null;
    }
    const x1 = (ata11 * atb0 - ata01 * atb1) / det; // 4a²
    const x2 = (ata00 * atb1 - ata01 * atb0) / det; // 4b²
    // x₁ = 4a², x₂ = 4b² — must be positive
    if (x1 <= 0 || x2 <= 0) {
        // Negative semi-axis squared — data is inconsistent or degenerate
        return null;
    }
    let a = Math.sqrt(x1 / 4);
    let b = Math.sqrt(x2 / 4);
    // Ensure a ≥ b
    if (b > a) {
        [a, b] = [b, a];
    }
    return { a, b };
}
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
export function aggregateWidths(widths, observations, minCoverageDeg = 60) {
    if (widths.length === 0) {
        throw new Error('Cannot aggregate zero widths');
    }
    // Check if we can use least-squares
    if (observations && observations.length >= 2) {
        const coverage = thetaCoverage(observations.map((o) => o.thetaRad));
        if (coverage >= minCoverageDeg) {
            const fit = fitEllipseWidths(observations);
            if (fit) {
                return {
                    a: fit.a,
                    b: fit.b,
                    method: 'least-squares',
                    thetaCoverageDeg: coverage,
                };
            }
        }
        // Fall through to percentile if LS failed or coverage insufficient
        const { a, b } = percentileAggregate(widths);
        return {
            a,
            b,
            method: 'percentile',
            thetaCoverageDeg: coverage,
        };
    }
    // No observations — pure percentile fallback
    const { a, b } = percentileAggregate(widths);
    return {
        a,
        b,
        method: 'percentile',
        thetaCoverageDeg: 0,
    };
}
//# sourceMappingURL=aggregate.js.map