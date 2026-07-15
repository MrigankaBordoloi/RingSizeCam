import type { Point2D } from '@ring-sizer/core';
export interface CardDetection {
    /** Ordered [TL, TR, BR, BL] corners in pixel coordinates. */
    corners: [Point2D, Point2D, Point2D, Point2D];
    confidence: number;
}
/**
 * Check if the card is fully within the frame (not clipped at edges).
 */
export declare function isCardFullyInFrame(card: CardDetection, frameWidth: number, frameHeight: number): boolean;
/**
 * Detect a credit-card-shaped quadrilateral in the current video frame.
 * Returns the best (highest-scoring) 4-corner convex candidate, or null.
 */
export declare function detectCard(video: HTMLVideoElement, canvasForCapture: HTMLCanvasElement): CardDetection | null;
/**
 * Compute the scale factor from a card detection.
 * Wraps core's computeScaleFromCard, which measures scale directly from
 * corner pixel distances — no rectification needed for this computation.
 */
export declare function cardToScale(card: CardDetection, cardWidthMm: number, cardHeightMm: number): number;
/**
 * Draw the detected card quad on the debug overlay.
 */
export declare function drawCardOverlay(ctx: CanvasRenderingContext2D, card: CardDetection, scale: number, canvasWidth: number, canvasHeight: number, videoWidth: number, videoHeight: number): void;
/**
 * Render a perspective-rectified preview of the detected card into a small
 * debug-only canvas. Not used for scale computation (computeScaleFromCard
 * already measures scale from the raw corner distances) — this is purely
 * a visual sanity check for the debug HUD, satisfying the "homography
 * rectification" step without feeding resampled pixels back into the
 * measurement pipeline.
 */
export declare function rectifyCardPreview(video: HTMLVideoElement, canvasForCapture: HTMLCanvasElement, card: CardDetection, outCanvas: HTMLCanvasElement): void;
//# sourceMappingURL=cardDetector.d.ts.map