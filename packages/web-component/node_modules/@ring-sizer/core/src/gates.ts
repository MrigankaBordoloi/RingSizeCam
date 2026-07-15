// ──────────────────────────────────────────────────────────────
// gates.ts — Per-frame quality gate predicates.
// All gates are pure functions taking FrameMetadata + config.
// ──────────────────────────────────────────────────────────────

import type { FrameMetadata, GateResult, PipelineConfig } from './types.js';

/**
 * Run all quality gates on a single frame's metadata.
 * A frame must pass ALL gates to be accepted for aggregation.
 *
 * @param meta Extracted metadata from the current frame.
 * @param config Pipeline configuration with gate thresholds.
 * @returns GateResult with pass/fail and reasons for each failed gate.
 */
export function checkGates(meta: FrameMetadata, config: PipelineConfig): GateResult {
  const reasons: string[] = [];

  // Gate 1: MediaPipe landmark confidence
  if (meta.landmarkConfidence < config.minLandmarkConfidence) {
    reasons.push(
      `Landmark confidence too low: ${meta.landmarkConfidence.toFixed(3)} < ${config.minLandmarkConfidence}`,
    );
  }

  // Gate 2: Blur (variance of Laplacian)
  if (meta.blurScore < config.minBlurScore) {
    reasons.push(
      `Image too blurry: Laplacian variance ${meta.blurScore.toFixed(1)} < ${config.minBlurScore}`,
    );
  }

  // Gate 3: Anchor visibility and detection confidence (coin or card)
  const anchorLabel = meta.anchorType === 'card' ? 'Card' : 'Coin';
  if (!meta.coinInFrame) {
    reasons.push(`${anchorLabel} not fully in frame`);
  } else if (meta.coinConfidence < config.minCoinConfidence) {
    reasons.push(
      `${anchorLabel} detection confidence too low: ${meta.coinConfidence.toFixed(3)} < ${config.minCoinConfidence}`,
    );
  }

  // Gate 4: Finger tilt (z-delta between ring-finger landmarks 13 and 14)
  if (meta.fingerTiltZ > config.maxFingerTiltZ) {
    reasons.push(
      `Finger tilt too steep: z-delta ${meta.fingerTiltZ.toFixed(4)} > ${config.maxFingerTiltZ}`,
    );
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}
