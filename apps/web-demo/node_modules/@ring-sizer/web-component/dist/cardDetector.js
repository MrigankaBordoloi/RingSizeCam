// ──────────────────────────────────────────────────────────────
// cardDetector.ts — Credit-card (ISO ID-1) anchor detection.
// Canny edges → contours → polygon approximation → 4-corner quad,
// scored by aspect ratio + corner-angle closeness to a rectangle.
// Fallback/alternate anchor to the ₹10 coin (see anchorSelector.ts).
// ──────────────────────────────────────────────────────────────
import { computeScaleFromCard } from '@ring-sizer/core';
// ISO ID-1 card: 85.60 × 53.98 mm
const ISO_ID1_ASPECT = 85.6 / 53.98; // ≈ 1.586
function dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
/** Order 4 unordered corners into [TL, TR, BR, BL] via the sum/diff heuristic. */
function orderCorners(pts) {
    const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
    const byDiff = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
    const tl = bySum[0];
    const br = bySum[3];
    const bl = byDiff[0];
    const tr = byDiff[3];
    return [tl, tr, br, bl];
}
/** Interior angle (degrees) at vertex `b`, formed by edges b→a and b→c. */
function interiorAngleDeg(a, b, c) {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dotProd = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (mag < 1e-9)
        return 0;
    const cos = Math.max(-1, Math.min(1, dotProd / mag));
    return (Math.acos(cos) * 180) / Math.PI;
}
/**
 * Score how card-like an ordered quad is: closeness of its aspect ratio to
 * ISO ID-1 (85.60 / 53.98) and closeness of its 4 interior angles to 90°.
 * Returns a confidence in [0, 1].
 */
function scoreQuad(corners) {
    const [tl, tr, br, bl] = corners;
    const top = dist(tl, tr);
    const bottom = dist(bl, br);
    const left = dist(tl, bl);
    const right = dist(tr, br);
    const longEdge = (top + bottom) / 2;
    const shortEdge = (left + right) / 2;
    if (shortEdge < 1e-6)
        return 0;
    const aspect = Math.max(longEdge, shortEdge) / Math.min(longEdge, shortEdge);
    const aspectScore = 1 - clamp01(Math.abs(aspect - ISO_ID1_ASPECT) / ISO_ID1_ASPECT);
    const angles = [
        interiorAngleDeg(bl, tl, tr),
        interiorAngleDeg(tl, tr, br),
        interiorAngleDeg(tr, br, bl),
        interiorAngleDeg(br, bl, tl),
    ];
    const angleScore = angles.reduce((sum, a) => sum + (1 - clamp01(Math.abs(a - 90) / 90)), 0) / angles.length;
    return 0.5 * aspectScore + 0.5 * angleScore;
}
/**
 * Check if the card is fully within the frame (not clipped at edges).
 */
export function isCardFullyInFrame(card, frameWidth, frameHeight) {
    return card.corners.every((p) => p.x > 0 && p.y > 0 && p.x < frameWidth && p.y < frameHeight);
}
/**
 * Detect a credit-card-shaped quadrilateral in the current video frame.
 * Returns the best (highest-scoring) 4-corner convex candidate, or null.
 */
export function detectCard(video, canvasForCapture) {
    if (typeof cv === 'undefined' || typeof cv.Mat === 'undefined')
        return null;
    const ctx = canvasForCapture.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return null;
    canvasForCapture.width = video.videoWidth;
    canvasForCapture.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    let src = null;
    let gray = null;
    let blurred = null;
    let edges = null;
    let dilated = null;
    let kernel = null;
    let contours = null;
    let hierarchy = null;
    try {
        src = cv.imread(canvasForCapture);
        gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);
        // Close small gaps in the card outline before contour extraction.
        kernel = cv.Mat.ones(3, 3, cv.CV_8U);
        dilated = new cv.Mat();
        cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 1);
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
        const minArea = video.videoWidth * video.videoHeight * 0.01;
        let best = null;
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            if (area >= minArea) {
                const approx = new cv.Mat();
                const perimeter = cv.arcLength(contour, true);
                cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
                if (approx.rows === 4 && cv.isContourConvex(approx)) {
                    const pts = [];
                    for (let j = 0; j < 4; j++) {
                        pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
                    }
                    const corners = orderCorners(pts);
                    const confidence = scoreQuad(corners);
                    if (!best || confidence > best.confidence) {
                        best = { corners, confidence };
                    }
                }
                approx.delete();
            }
            contour.delete();
        }
        if (!best)
            return null;
        const inFrame = isCardFullyInFrame(best, video.videoWidth, video.videoHeight);
        return {
            corners: best.corners,
            // Same in-frame confidence penalty ratio as coinDetector.ts (0.8 → 0.3).
            confidence: inFrame ? best.confidence : best.confidence * 0.4,
        };
    }
    catch {
        return null;
    }
    finally {
        src?.delete();
        gray?.delete();
        blurred?.delete();
        edges?.delete();
        dilated?.delete();
        kernel?.delete();
        contours?.delete();
        hierarchy?.delete();
    }
}
/**
 * Compute the scale factor from a card detection.
 * Wraps core's computeScaleFromCard, which measures scale directly from
 * corner pixel distances — no rectification needed for this computation.
 */
export function cardToScale(card, cardWidthMm, cardHeightMm) {
    return computeScaleFromCard(card.corners, cardWidthMm, cardHeightMm);
}
/**
 * Draw the detected card quad on the debug overlay.
 */
export function drawCardOverlay(ctx, card, scale, canvasWidth, canvasHeight, videoWidth, videoHeight) {
    const sx = canvasWidth / videoWidth;
    const sy = canvasHeight / videoHeight;
    const pts = card.corners.map((p) => ({ x: p.x * sx, y: p.y * sy }));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = card.confidence > 0.5 ? '#00e676' : '#ff9800';
    ctx.lineWidth = 2;
    ctx.stroke();
    const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#00e676';
    ctx.fillText(`${scale.toFixed(2)} px/mm`, cx + 12, cy - 4);
}
/**
 * Render a perspective-rectified preview of the detected card into a small
 * debug-only canvas. Not used for scale computation (computeScaleFromCard
 * already measures scale from the raw corner distances) — this is purely
 * a visual sanity check for the debug HUD, satisfying the "homography
 * rectification" step without feeding resampled pixels back into the
 * measurement pipeline.
 */
export function rectifyCardPreview(video, canvasForCapture, card, outCanvas) {
    if (typeof cv === 'undefined' || typeof cv.Mat === 'undefined')
        return;
    const ctx = canvasForCapture.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return;
    canvasForCapture.width = video.videoWidth;
    canvasForCapture.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const outW = 214;
    const outH = Math.round(outW / ISO_ID1_ASPECT);
    let src = null;
    let srcQuad = null;
    let dstQuad = null;
    let M = null;
    let dst = null;
    try {
        src = cv.imread(canvasForCapture);
        const [tl, tr, br, bl] = card.corners;
        srcQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
        dstQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
        M = cv.getPerspectiveTransform(srcQuad, dstQuad);
        dst = new cv.Mat();
        cv.warpPerspective(src, dst, M, new cv.Size(outW, outH));
        outCanvas.width = outW;
        outCanvas.height = outH;
        cv.imshow(outCanvas, dst);
    }
    catch {
        // Best-effort debug preview only — failures here must never affect
        // the measurement pipeline.
    }
    finally {
        src?.delete();
        srcQuad?.delete();
        dstQuad?.delete();
        M?.delete();
        dst?.delete();
    }
}
//# sourceMappingURL=cardDetector.js.map