import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';
export declare const RING_FINGER: {
    readonly MCP: 13;
    readonly PIP: 14;
    readonly DIP: 15;
    readonly TIP: 16;
};
/** Middle finger MCP — used as the θ reference point for rotation estimation. */
export declare const MIDDLE_MCP = 9;
/**
 * Initialize the MediaPipe HandLandmarker.
 * Downloads model weights from Google CDN on first call (cached by browser).
 */
export declare function initHandTracker(): Promise<void>;
/**
 * Detect hand landmarks in the current video frame.
 * Returns null if the tracker is not initialized or no hands detected.
 */
export declare function detectHands(video: HTMLVideoElement, timestampMs: number): HandLandmarkerResult | null;
/** Draw hand landmarks on a canvas overlay. */
export declare function drawLandmarks(ctx: CanvasRenderingContext2D, result: HandLandmarkerResult, width: number, height: number): void;
/**
 * Get the overall hand detection confidence.
 * Returns the average handedness score (proxy for detection confidence).
 */
export declare function getHandConfidence(result: HandLandmarkerResult): number;
//# sourceMappingURL=handTracker.d.ts.map