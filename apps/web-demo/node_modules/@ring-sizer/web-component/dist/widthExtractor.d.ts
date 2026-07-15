import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
export interface WidthMeasurement {
    widthPx: number;
    widthMm: number;
    roiCenter: {
        x: number;
        y: number;
    };
    blurScore: number;
}
/**
 * Extract the finger width at the proximal segment of the ring finger.
 *
 * Algorithm:
 * 1. Locate landmarks 13 (MCP) and 14 (PIP) of the ring finger.
 * 2. Compute the midpoint and the perpendicular direction.
 * 3. Extract a ROI strip perpendicular to the finger axis.
 * 4. Apply Canny edge detection on the strip.
 * 5. Find the two strongest edge responses → width in px.
 */
export declare function extractFingerWidth(landmarks: NormalizedLandmark[], video: HTMLVideoElement, scratchCanvas: HTMLCanvasElement, scale: number): WidthMeasurement | null;
/**
 * Compute the finger tilt heuristic: absolute z-delta between
 * landmarks 13 (MCP) and 14 (PIP).
 */
export declare function computeFingerTilt(landmarks: NormalizedLandmark[]): number;
//# sourceMappingURL=widthExtractor.d.ts.map