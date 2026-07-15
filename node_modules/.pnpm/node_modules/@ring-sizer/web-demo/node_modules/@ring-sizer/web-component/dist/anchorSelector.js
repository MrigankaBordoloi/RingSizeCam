// ──────────────────────────────────────────────────────────────
// anchorSelector.ts — Runs both anchor detectors each frame and
// picks whichever (coin or card) is detected with higher confidence.
// ──────────────────────────────────────────────────────────────
import { detectCoin, coinToScale, isCoinFullyInFrame } from './coinDetector.js';
import { detectCard, cardToScale, isCardFullyInFrame } from './cardDetector.js';
/**
 * Detect both anchor types and select whichever has higher confidence
 * this frame. Ties (including the no-detection 0 === 0 case) favor 'coin',
 * the canonical Phase 1 anchor. `checkGates`'s existing minCoinConfidence
 * threshold applies generically to whichever anchor wins — no separate
 * selection threshold is needed.
 */
export function selectAnchor(video, scratchCanvas, config) {
    const coin = detectCoin(video, scratchCanvas);
    const card = detectCard(video, scratchCanvas);
    const coinConfidence = coin?.confidence ?? 0;
    const cardConfidence = card?.confidence ?? 0;
    if (card && cardConfidence > coinConfidence) {
        return {
            type: 'card',
            confidence: cardConfidence,
            scalePxMm: cardToScale(card, config.cardWidthMm, config.cardHeightMm),
            inFrame: isCardFullyInFrame(card, video.videoWidth, video.videoHeight),
            coin: null,
            card,
        };
    }
    return {
        type: 'coin',
        confidence: coinConfidence,
        scalePxMm: coin ? coinToScale(coin, config.coinDiameterMm) : 0,
        inFrame: coin ? isCoinFullyInFrame(coin, video.videoWidth, video.videoHeight) : false,
        coin,
        card: null,
    };
}
//# sourceMappingURL=anchorSelector.js.map