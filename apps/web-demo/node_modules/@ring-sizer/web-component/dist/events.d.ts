import type { TelemetryContext } from './telemetry.js';
export interface ResultEventDetail extends TelemetryContext {
    /** Interpolated ring size value (raw, not snapped to a stocked size). */
    value: number;
    /** Nearest stocked-size label for the active chart (e.g. "7.5", "N½", "54"). */
    label: string;
    confidenceInterval: [number, number];
    method: 'least-squares' | 'percentile';
    thetaCoverageDeg: number;
}
export interface RetryEventDetail extends TelemetryContext {
    reason: 'insufficient-frames' | 'ci-too-wide';
    /** null when no measurement could be computed at all (insufficient-frames). */
    confidenceInterval: [number, number] | null;
}
export interface ErrorEventDetail extends TelemetryContext {
    message: string;
    stage: 'camera' | 'hand-tracker' | 'opencv' | 'unknown';
    cause?: unknown;
}
//# sourceMappingURL=events.d.ts.map