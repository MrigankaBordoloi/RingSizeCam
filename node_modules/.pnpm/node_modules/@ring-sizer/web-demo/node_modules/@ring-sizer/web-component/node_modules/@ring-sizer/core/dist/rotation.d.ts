/** Minimal 3D point — no dependency on MediaPipe types. */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
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
export declare function estimateFingerTheta(ringMCP: Vec3, ringPIP: Vec3, middleMCP: Vec3): number;
/**
 * Compute the angular coverage of a set of theta observations.
 * Returns the range in degrees. Handles wraparound by using the
 * circular range (max gap in sorted angles).
 *
 * @param thetas Array of angles in radians.
 * @returns Coverage in degrees ∈ [0, 360].
 */
export declare function thetaCoverage(thetas: number[]): number;
//# sourceMappingURL=rotation.d.ts.map