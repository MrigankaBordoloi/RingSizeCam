// ──────────────────────────────────────────────────────────────
// handTracker.ts — MediaPipe HandLandmarker wrapper.
// Uses @mediapipe/tasks-vision for hand-landmark detection.
// ──────────────────────────────────────────────────────────────
import { HandLandmarker, FilesetResolver, } from '@mediapipe/tasks-vision';
let handLandmarker = null;
// Ring-finger landmark indices (MediaPipe hand model)
// 13 = ring finger MCP (proximal start)
// 14 = ring finger PIP (proximal end)
// 15 = ring finger DIP
// 16 = ring finger tip
export const RING_FINGER = {
    MCP: 13,
    PIP: 14,
    DIP: 15,
    TIP: 16,
};
/** Middle finger MCP — used as the θ reference point for rotation estimation. */
export const MIDDLE_MCP = 9;
/**
 * Initialize the MediaPipe HandLandmarker.
 * Downloads model weights from Google CDN on first call (cached by browser).
 */
export async function initHandTracker() {
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });
}
/**
 * Detect hand landmarks in the current video frame.
 * Returns null if the tracker is not initialized or no hands detected.
 */
export function detectHands(video, timestampMs) {
    if (!handLandmarker)
        return null;
    try {
        const result = handLandmarker.detectForVideo(video, timestampMs);
        return result;
    }
    catch {
        return null;
    }
}
/** Draw hand landmarks on a canvas overlay. */
export function drawLandmarks(ctx, result, width, height) {
    if (!result.landmarks || result.landmarks.length === 0)
        return;
    const landmarks = result.landmarks[0];
    // Draw connections
    const connections = HandLandmarker.HAND_CONNECTIONS;
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
    ctx.lineWidth = 2;
    for (const conn of connections) {
        const start = landmarks[conn.start];
        const end = landmarks[conn.end];
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
    }
    // Draw landmark points
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const x = lm.x * width;
        const y = lm.y * height;
        // Highlight ring-finger landmarks
        const isRingFinger = i >= RING_FINGER.MCP && i <= RING_FINGER.TIP;
        ctx.beginPath();
        ctx.arc(x, y, isRingFinger ? 5 : 3, 0, 2 * Math.PI);
        ctx.fillStyle = isRingFinger ? '#00e676' : '#4fc3f7';
        ctx.fill();
    }
}
/**
 * Get the overall hand detection confidence.
 * Returns the average handedness score (proxy for detection confidence).
 */
export function getHandConfidence(result) {
    if (!result.handedness || result.handedness.length === 0)
        return 0;
    const categories = result.handedness[0];
    if (categories.length === 0)
        return 0;
    return categories[0].score;
}
//# sourceMappingURL=handTracker.js.map