// ──────────────────────────────────────────────────────────────
// ramanujan.ts — Ellipse circumference via Ramanujan's approximation.
// C ≈ π · [3(a+b) − √((3a+b)(a+3b))]
// a, b are SEMI-axes. Passing full widths is the classic bug.
// ──────────────────────────────────────────────────────────────
/**
 * Compute the approximate circumference of an ellipse using
 * Ramanujan's first approximation.
 *
 * @param a Semi-major axis (mm).
 * @param b Semi-minor axis (mm).
 * @returns Approximate circumference (mm).
 * @throws If a or b is negative.
 */
export function ellipseCircumference(a, b) {
    if (a < 0 || b < 0) {
        throw new Error(`Semi-axes must be non-negative: a=${a}, b=${b}`);
    }
    // Ensure a >= b for consistency (doesn't affect the formula, but good hygiene)
    if (b > a) {
        [a, b] = [b, a];
    }
    return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}
//# sourceMappingURL=ramanujan.js.map