import type { FrameMetadata, GateResult, PipelineConfig } from './types.js';
/**
 * Run all quality gates on a single frame's metadata.
 * A frame must pass ALL gates to be accepted for aggregation.
 *
 * @param meta Extracted metadata from the current frame.
 * @param config Pipeline configuration with gate thresholds.
 * @returns GateResult with pass/fail and reasons for each failed gate.
 */
export declare function checkGates(meta: FrameMetadata, config: PipelineConfig): GateResult;
//# sourceMappingURL=gates.d.ts.map