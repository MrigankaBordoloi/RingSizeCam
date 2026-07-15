// ──────────────────────────────────────────────────────────────
// config.ts — Default pipeline configuration.
// Single file for all tunable thresholds.
// ──────────────────────────────────────────────────────────────

import type { PipelineConfig } from './types.js';

/** Default pipeline configuration — tune via the debug HUD. */
export const DEFAULT_CONFIG: PipelineConfig = {
  // Quality gates
  minLandmarkConfidence: 0.7,
  minBlurScore: 100,
  maxFingerTiltZ: 0.12,
  minCoinConfidence: 0.5,

  // Scale anchor: ₹10 coin = 27.00 mm diameter
  coinDiameterMm: 27.0,

  // Scale anchor: credit card (ISO ID-1)
  cardWidthMm: 85.60,
  cardHeightMm: 53.98,

  // One Euro filter
  oneEuro: {
    minCutoff: 1.0,
    beta: 0.007,
    dCutoff: 1.0,
  },

  // Aggregation
  minGatedFrames: 120,
  maxCISizeSpan: 1.0,
  minThetaCoverageDeg: 60,
};
