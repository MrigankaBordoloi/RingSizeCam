// ──────────────────────────────────────────────────────────────
// rotation.ts — Finger rotation angle (θ) estimation from
// hand landmarks. Pure 3D vector math — no DOM, no browser APIs.
// ──────────────────────────────────────────────────────────────
function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}
/**
 * Estimate the rotation angle θ of the ring finger around its axis,
 * based on the relative positions of neighboring hand landmarks.
 *
 * Method:
 * 1. The finger axis = ringPIP − ringMCP (direction along the proximal segment).
 * 2. The reference vector = middleMCP − ringMCP (points toward the middle finger).
 * 3. Project the reference vector into the plane perpendicular to the finger axis.
 * 4. θ = atan2 of this projection in the perpendicular plane.
 *
 * The absolute value of θ doesn't matter for the ellipse fit — what matters
 * is that θ changes monotonically as the finger rotates, and the range covers
 * enough of the rotation.
 *
 * @param ringMCP   Ring finger MCP landmark (index 13).
 * @param ringPIP   Ring finger PIP landmark (index 14).
 * @param middleMCP Middle finger MCP landmark (index 9).
 * @returns Rotation angle in radians ∈ (-π, π], or 0 if landmarks are degenerate.
 */
export function estimateFingerTheta(ringMCP, ringPIP, middleMCP) {
    // Finger axis direction
    const axis = sub(ringPIP, ringMCP);
    const axisLen = length(axis);
    if (axisLen < 1e-9) {
        // Degenerate: MCP and PIP are coincident
        return 0;
    }
    // Normalize the axis
    const axisNorm = scale(axis, 1 / axisLen);
    // Reference vector from ring MCP to middle MCP
    const ref = sub(middleMCP, ringMCP);
    // Project ref onto the plane perpendicular to the finger axis:
    // proj_perp = ref - (ref · axisNorm) * axisNorm
    const refAlongAxis = dot(ref, axisNorm);
    const projPerp = sub(ref, scale(axisNorm, refAlongAxis));
    const perpLen = length(projPerp);
    if (perpLen < 1e-9) {
        // Reference vector is parallel to the finger axis — can't determine θ
        return 0;
    }
    // Build a coordinate frame {e1, e2} in the perpendicular plane from a
    // FIXED world axis — NOT from ref itself. Deriving the basis from ref's
    // own projection (e.g. u = projPerp / |projPerp|) makes dot(ref, v) ≡ 0
    // for any input, since ref's entire perpendicular-plane component IS
    // projPerp = perpLen·u by construction — theta would always be 0.
    const WORLD_PRIMARY = { x: 0, y: 0, z: 1 };
    const WORLD_FALLBACK = { x: 1, y: 0, z: 0 };
    const worldRef = Math.abs(dot(axisNorm, WORLD_PRIMARY)) > 0.9 ? WORLD_FALLBACK : WORLD_PRIMARY;
    const e1raw = sub(worldRef, scale(axisNorm, dot(worldRef, axisNorm)));
    const e1 = scale(e1raw, 1 / length(e1raw));
    const e2 = cross(axisNorm, e1);
    // θ = atan2 of ref's perpendicular-plane component against the fixed basis.
    const coordU = dot(projPerp, e1);
    const coordV = dot(projPerp, e2);
    return Math.atan2(coordV, coordU);
}
/**
 * Compute the angular coverage of a set of theta observations.
 * Returns the range in degrees. Handles wraparound by using the
 * circular range (max gap in sorted angles).
 *
 * @param thetas Array of angles in radians.
 * @returns Coverage in degrees ∈ [0, 360].
 */
export function thetaCoverage(thetas) {
    if (thetas.length < 2)
        return 0;
    // Normalize all angles to [0, 2π)
    const TWO_PI = 2 * Math.PI;
    const normalized = thetas.map((t) => ((t % TWO_PI) + TWO_PI) % TWO_PI);
    normalized.sort((a, b) => a - b);
    // Find the largest gap between consecutive sorted angles
    let maxGap = 0;
    for (let i = 0; i < normalized.length - 1; i++) {
        const gap = normalized[i + 1] - normalized[i];
        if (gap > maxGap)
            maxGap = gap;
    }
    // Gap wrapping around from last to first
    const wrapGap = TWO_PI - normalized[normalized.length - 1] + normalized[0];
    if (wrapGap > maxGap)
        maxGap = wrapGap;
    // Coverage = 360° minus the largest gap (in degrees)
    const coverageDeg = ((TWO_PI - maxGap) / TWO_PI) * 360;
    return Math.max(0, coverageDeg);
}
//# sourceMappingURL=rotation.js.map