// ──────────────────────────────────────────────────────────────
// coinDetector.ts — ₹10 coin detection using OpenCV.js Hough circles.
// ──────────────────────────────────────────────────────────────
import { computeScale } from '@ring-sizer/core';
/**
 * Check whether OpenCV.js is loaded and ready.
 */
export function isOpenCvReady() {
    return typeof cv !== 'undefined' && typeof cv.Mat !== 'undefined';
}
/**
 * Detect a coin in the current video frame using Hough circle transform.
 * Returns the best detection or null if no coin found.
 */
export function detectCoin(video, canvasForCapture) {
    if (!isOpenCvReady())
        return null;
    const ctx = canvasForCapture.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return null;
    // Draw current frame to scratch canvas
    canvasForCapture.width = video.videoWidth;
    canvasForCapture.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    let src = null;
    let gray = null;
    let blurred = null;
    let circles = null;
    try {
        src = cv.imread(canvasForCapture);
        gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 2, 2);
        circles = new cv.Mat();
        // HoughCircles params tuned for a coin at typical phone-camera distances
        // dp=1.2, minDist=videoHeight/4, param1=100, param2=40
        // minRadius and maxRadius based on expected coin size in frame
        const minRadius = Math.round(video.videoHeight * 0.03);
        const maxRadius = Math.round(video.videoHeight * 0.20);
        cv.HoughCircles(blurred, circles, cv.HOUGH_GRADIENT, 1.2, // dp (inverse ratio of accumulator)
        video.videoHeight / 4, // minDist between circle centers
        100, // param1 (Canny edge threshold)
        40, // param2 (accumulator threshold — lower = more sensitive)
        minRadius, maxRadius);
        if (circles.cols === 0)
            return null;
        // Take the first (best) circle
        const x = circles.data32F[0];
        const y = circles.data32F[1];
        const radius = circles.data32F[2];
        // Simple confidence proxy:
        // Higher accumulator votes → lower param2 still finds it → more confident
        // We use a heuristic: if we found it, base confidence on circle quality.
        // A real confidence would require the accumulator values (not exposed by OpenCV.js).
        // For Phase 1, we use a fixed confidence of 0.8 when a circle is detected
        // and reduce it if the circle is near the frame edge (partially out).
        const margin = radius * 0.5;
        const inFrame = x - radius > margin &&
            y - radius > margin &&
            x + radius < video.videoWidth - margin &&
            y + radius < video.videoHeight - margin;
        return {
            x,
            y,
            radius,
            confidence: inFrame ? 0.8 : 0.3,
        };
    }
    catch {
        return null;
    }
    finally {
        src?.delete();
        gray?.delete();
        blurred?.delete();
        circles?.delete();
    }
}
/**
 * Compute the scale factor from a coin detection.
 */
export function coinToScale(coin, coinDiameterMm) {
    return computeScale(coin.radius * 2, coinDiameterMm);
}
/**
 * Check if the coin is fully within the frame (not clipped at edges).
 */
export function isCoinFullyInFrame(coin, frameWidth, frameHeight) {
    return (coin.x - coin.radius > 0 &&
        coin.y - coin.radius > 0 &&
        coin.x + coin.radius < frameWidth &&
        coin.y + coin.radius < frameHeight);
}
/**
 * Draw the detected coin circle on the debug overlay.
 */
export function drawCoinOverlay(ctx, coin, scale, canvasWidth, canvasHeight, videoWidth, videoHeight) {
    // Map from video coordinates to canvas coordinates
    const sx = canvasWidth / videoWidth;
    const sy = canvasHeight / videoHeight;
    const cx = coin.x * sx;
    const cy = coin.y * sy;
    const cr = coin.radius * sx;
    // Circle outline
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, 2 * Math.PI);
    ctx.strokeStyle = coin.confidence > 0.5 ? '#00e676' : '#ff9800';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Scale label
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#00e676';
    ctx.fillText(`${scale.toFixed(2)} px/mm`, cx + cr + 6, cy - 4);
}
//# sourceMappingURL=coinDetector.js.map