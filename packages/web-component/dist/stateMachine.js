// ──────────────────────────────────────────────────────────────
// stateMachine.ts — Capture UX state machine.
// IDLE → ANCHOR_DETECTED → HAND_DETECTED → SWEEPING →
//   COMPUTING → RESULT | RETRY
// ──────────────────────────────────────────────────────────────
export function createInitialContext() {
    return {
        state: 'IDLE',
        gatedWidths: [],
        observations: [],
        sweepStartTime: 0,
        result: null,
        retryForced: false,
        aggMethod: null,
        thetaCoverageDeg: 0,
    };
}
/**
 * Advance the state machine based on the current frame's input.
 * Returns the (possibly updated) context — immutable style.
 */
export function advanceState(ctx, input, minGatedFrames) {
    switch (ctx.state) {
        case 'IDLE':
            if (input.anchorDetected) {
                return { ...ctx, state: 'ANCHOR_DETECTED' };
            }
            return ctx;
        case 'ANCHOR_DETECTED':
            if (!input.anchorDetected) {
                return { ...ctx, state: 'IDLE' };
            }
            if (input.handDetected) {
                return { ...ctx, state: 'HAND_DETECTED' };
            }
            return ctx;
        case 'HAND_DETECTED':
            if (!input.anchorDetected) {
                return { ...ctx, state: 'IDLE', gatedWidths: [], observations: [] };
            }
            if (!input.handDetected) {
                return { ...ctx, state: 'ANCHOR_DETECTED', gatedWidths: [], observations: [] };
            }
            // Auto-start sweeping once both are stable and a gated frame arrives
            if (input.gatePassed && input.filteredWidthMm > 0) {
                return {
                    ...ctx,
                    state: 'SWEEPING',
                    gatedWidths: [input.filteredWidthMm],
                    observations: input.theta !== null
                        ? [{ widthMm: input.filteredWidthMm, thetaRad: input.theta }]
                        : [],
                    sweepStartTime: performance.now(),
                };
            }
            return ctx;
        case 'SWEEPING': {
            if (!input.anchorDetected) {
                // Lost anchor — reset
                return { ...createInitialContext(), state: 'IDLE' };
            }
            if (!input.handDetected) {
                // Lost hand — back to anchor detected, keep progress
                return { ...createInitialContext(), state: 'ANCHOR_DETECTED' };
            }
            const newWidths = input.gatePassed && input.filteredWidthMm > 0
                ? [...ctx.gatedWidths, input.filteredWidthMm]
                : ctx.gatedWidths;
            const newObservations = input.gatePassed && input.filteredWidthMm > 0 && input.theta !== null
                ? [...ctx.observations, { widthMm: input.filteredWidthMm, thetaRad: input.theta }]
                : ctx.observations;
            // Check if we have enough gated frames
            if (newWidths.length >= minGatedFrames) {
                return {
                    ...ctx,
                    state: 'COMPUTING',
                    gatedWidths: newWidths,
                    observations: newObservations,
                };
            }
            return { ...ctx, gatedWidths: newWidths, observations: newObservations };
        }
        case 'COMPUTING':
            // This state is transient — main.ts handles the computation
            // and transitions to RESULT or RETRY.
            return ctx;
        case 'RESULT':
        case 'RETRY':
            // Terminal states — only reset via explicit action (re-measure button)
            return ctx;
        default:
            return ctx;
    }
}
/** Reset the state machine to IDLE. */
export function resetState() {
    return createInitialContext();
}
/** Get the banner text and color for each state. */
export function getStateBanner(state, anchorType) {
    const anchorLabel = anchorType === 'card' ? 'Credit card' : 'Coin';
    const banners = {
        IDLE: { text: 'Place a ₹10 coin or credit card in view', color: 'rgba(255,255,255,0.1)' },
        ANCHOR_DETECTED: { text: `${anchorLabel} detected — show your hand`, color: 'rgba(79,195,247,0.2)' },
        HAND_DETECTED: { text: 'Hand detected — hold steady to begin', color: 'rgba(0,230,118,0.2)' },
        SWEEPING: { text: 'Slowly rotate your finger…', color: 'rgba(0,230,118,0.3)' },
        COMPUTING: { text: 'Computing size…', color: 'rgba(79,195,247,0.3)' },
        RESULT: { text: 'Result', color: 'rgba(0,230,118,0.3)' },
        RETRY: { text: 'Please re-measure', color: 'rgba(255,112,67,0.3)' },
    };
    return banners[state];
}
//# sourceMappingURL=stateMachine.js.map