import type { AggregateResult, AnchorType, CaptureState, MeasurementResult, WidthObservation } from '@ring-sizer/core';
export interface StateContext {
    /** Current state. */
    state: CaptureState;
    /** Accumulated gated-frame widths (mm) during SWEEPING. */
    gatedWidths: number[];
    /** Accumulated width+theta observations during SWEEPING (for least-squares fit). */
    observations: WidthObservation[];
    /** Timestamp when SWEEPING started. */
    sweepStartTime: number;
    /** Final measurement result (only in RESULT state). */
    result: MeasurementResult | null;
    /** Whether we're forcing a retry (CI too wide). */
    retryForced: boolean;
    /** Aggregation method used for the final result, set at COMPUTING → RESULT|RETRY. */
    aggMethod: AggregateResult['method'] | null;
    /** Final theta coverage (degrees) for the result, set at COMPUTING → RESULT|RETRY. */
    thetaCoverageDeg: number;
}
export declare function createInitialContext(): StateContext;
export interface FrameInput {
    anchorDetected: boolean;
    handDetected: boolean;
    gatePassed: boolean;
    filteredWidthMm: number;
    /** Estimated finger rotation angle (radians), or null if unavailable this frame. */
    theta: number | null;
}
/**
 * Advance the state machine based on the current frame's input.
 * Returns the (possibly updated) context — immutable style.
 */
export declare function advanceState(ctx: StateContext, input: FrameInput, minGatedFrames: number): StateContext;
/** Reset the state machine to IDLE. */
export declare function resetState(): StateContext;
/** Get the banner text and color for each state. */
export declare function getStateBanner(state: CaptureState, anchorType?: AnchorType): {
    text: string;
    color: string;
};
//# sourceMappingURL=stateMachine.d.ts.map