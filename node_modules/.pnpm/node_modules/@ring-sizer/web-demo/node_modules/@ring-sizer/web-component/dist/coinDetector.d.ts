export interface CoinDetection {
    x: number;
    y: number;
    radius: number;
    confidence: number;
}
/**
 * Check whether OpenCV.js is loaded and ready.
 */
export declare function isOpenCvReady(): boolean;
/**
 * Detect a coin in the current video frame using Hough circle transform.
 * Returns the best detection or null if no coin found.
 */
export declare function detectCoin(video: HTMLVideoElement, canvasForCapture: HTMLCanvasElement): CoinDetection | null;
/**
 * Compute the scale factor from a coin detection.
 */
export declare function coinToScale(coin: CoinDetection, coinDiameterMm: number): number;
/**
 * Check if the coin is fully within the frame (not clipped at edges).
 */
export declare function isCoinFullyInFrame(coin: CoinDetection, frameWidth: number, frameHeight: number): boolean;
/**
 * Draw the detected coin circle on the debug overlay.
 */
export declare function drawCoinOverlay(ctx: CanvasRenderingContext2D, coin: CoinDetection, scale: number, canvasWidth: number, canvasHeight: number, videoWidth: number, videoHeight: number): void;
//# sourceMappingURL=coinDetector.d.ts.map