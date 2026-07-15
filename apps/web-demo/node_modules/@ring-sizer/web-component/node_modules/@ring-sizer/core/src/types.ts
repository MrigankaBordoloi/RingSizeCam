// ──────────────────────────────────────────────────────────────
// types.ts — Shared types for the ring-sizing pipeline.
// Pure TypeScript — no DOM, no browser APIs.
// ──────────────────────────────────────────────────────────────

/** A measurement with a confidence interval — never a bare number. */
export interface MeasurementResult {
  /** The measured ring size (e.g. 7 for US 7). */
  value: number;
  /** Lower and upper bounds of the confidence interval (ring-size units). */
  confidenceInterval: [number, number];
}

/** Type of physical reference object used for scale anchoring. */
export type AnchorType = 'coin' | 'card';

/** Result of anchor detection (coin or card). */
export interface AnchorDetection {
  type: AnchorType;
  confidence: number;
  scalePxMm: number;
}

/** A 2D point in pixel coordinates. */
export interface Point2D {
  x: number;
  y: number;
}

/** Metadata extracted from a single video frame for quality gating. */
export interface FrameMetadata {
  /** MediaPipe landmark detection confidence [0, 1]. */
  landmarkConfidence: number;
  /** Variance of Laplacian on the finger ROI (higher = sharper). */
  blurScore: number;
  /** Whether the anchor (coin or card) is fully visible in the frame. */
  coinInFrame: boolean;
  /** Detection confidence for the anchor [0, 1]. */
  coinConfidence: number;
  /** Absolute z-delta between ring-finger landmarks 13 and 14 (tilt proxy). */
  fingerTiltZ: number;
  /** Which anchor type is active for this frame. */
  anchorType: AnchorType;
}

/** Result of running all quality gates on a frame. */
export interface GateResult {
  /** True if ALL gates passed. */
  passed: boolean;
  /** Human-readable reasons for each failed gate. Empty if passed. */
  reasons: string[];
}

/** One Euro filter tuning parameters. */
export interface OneEuroParams {
  /** Minimum cutoff frequency (Hz). Lower = more smoothing. */
  minCutoff: number;
  /** Speed coefficient. Higher = less lag when signal moves fast. */
  beta: number;
  /** Cutoff frequency for the derivative filter (Hz). */
  dCutoff: number;
}

/** A width observation paired with the estimated rotation angle. */
export interface WidthObservation {
  /** Measured finger width in mm. */
  widthMm: number;
  /** Estimated finger rotation angle in radians. */
  thetaRad: number;
}

/** Result of width aggregation into ellipse semi-axes. */
export interface AggregateResult {
  /** Semi-major axis in mm. */
  a: number;
  /** Semi-minor axis in mm. */
  b: number;
  /** Which method was used for the fit. */
  method: 'least-squares' | 'percentile';
  /** Angular coverage of observations in degrees. */
  thetaCoverageDeg: number;
}

/** All tunable pipeline thresholds — single source of truth. */
export interface PipelineConfig {
  // ── Quality gates ──
  /** Minimum MediaPipe landmark confidence to accept a frame. */
  minLandmarkConfidence: number;
  /** Minimum variance-of-Laplacian score (blur gate). */
  minBlurScore: number;
  /** Maximum absolute z-delta between landmarks 13/14 (tilt gate). */
  maxFingerTiltZ: number;
  /** Minimum detection confidence to trust the anchor. */
  minCoinConfidence: number;

  // ── Scale anchor ──
  /** Real-world diameter of the reference coin in mm. */
  coinDiameterMm: number;
  /** Real-world width of the reference card in mm (ISO ID-1). */
  cardWidthMm: number;
  /** Real-world height of the reference card in mm (ISO ID-1). */
  cardHeightMm: number;

  // ── One Euro filter ──
  /** One Euro filter parameters. */
  oneEuro: OneEuroParams;

  // ── Aggregation ──
  /** Minimum number of gated frames before aggregation. */
  minGatedFrames: number;
  /** If CI spans more than this many full sizes, force RETRY. */
  maxCISizeSpan: number;
  /** Minimum θ coverage (degrees) to use least-squares fit. */
  minThetaCoverageDeg: number;
}

/** An entry in the ring-size lookup table. */
export interface SizeTableEntry {
  /** Display label (e.g. "7", "7.5"). */
  label: string;
  /** Numeric size for interpolation. */
  size: number;
  /** Inner circumference in mm. */
  circumferenceMm: number;
}

/** Capture UX state machine states. */
export type CaptureState =
  | 'IDLE'
  | 'ANCHOR_DETECTED'
  | 'HAND_DETECTED'
  | 'SWEEPING'
  | 'COMPUTING'
  | 'RESULT'
  | 'RETRY';
