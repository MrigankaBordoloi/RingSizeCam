import type { AnchorType, PipelineConfig } from '@ring-sizer/core';
import { type CoinDetection } from './coinDetector.js';
import { type CardDetection } from './cardDetector.js';
export interface AnchorResult {
    type: AnchorType;
    confidence: number;
    /** Pixel-to-mm scale, or 0 if nothing was detected. */
    scalePxMm: number;
    inFrame: boolean;
    coin: CoinDetection | null;
    card: CardDetection | null;
}
/**
 * Detect both anchor types and select whichever has higher confidence
 * this frame. Ties (including the no-detection 0 === 0 case) favor 'coin',
 * the canonical Phase 1 anchor. `checkGates`'s existing minCoinConfidence
 * threshold applies generically to whichever anchor wins — no separate
 * selection threshold is needed.
 */
export declare function selectAnchor(video: HTMLVideoElement, scratchCanvas: HTMLCanvasElement, config: PipelineConfig): AnchorResult;
//# sourceMappingURL=anchorSelector.d.ts.map