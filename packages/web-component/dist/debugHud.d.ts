export interface HudData {
    state: string;
    coinDetected: boolean;
    coinConfidence: number;
    coinInFrame: boolean;
    scalePxMm: number;
    handDetected: boolean;
    landmarkConfidence: number;
    rawWidthMm: number;
    filteredWidthMm: number;
    blurScore: number;
    fingerTiltZ: number;
    gatesPassed: boolean;
    gateReasons: string[];
    gatedFrameCount: number;
    targetFrames: number;
    anchorType: 'coin' | 'card';
    thetaCoverageDeg: number;
    aggregationMethod: 'least-squares' | 'percentile' | null;
    minThetaCoverageDeg: number;
    fps: number;
}
/** Toggle HUD visibility. Returns new state. */
export declare function toggleHud(root: Document | ShadowRoot): boolean;
/** Check if HUD is currently visible. */
export declare function isHudVisible(): boolean;
/**
 * Initialize keyboard shortcut (D key). The listener is registered on
 * `document` regardless of `root` — it stays a page-global shortcut rather
 * than being scoped per shadow root, since handTracker.ts already has a
 * single shared MediaPipe model across all <ring-sizer> instances on a page
 * (true multi-instance isolation is a larger change out of this phase's
 * scope). Returns a cleanup function to remove the listener.
 */
export declare function initHudToggle(root: Document | ShadowRoot): () => void;
/** Render HUD data into the #debug-hud element. */
export declare function renderHud(data: HudData, root: Document | ShadowRoot): void;
//# sourceMappingURL=debugHud.d.ts.map