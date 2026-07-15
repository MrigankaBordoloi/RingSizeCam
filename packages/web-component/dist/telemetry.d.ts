export interface TelemetryContext {
    apiKey: string | null;
    sessionId: string;
    locale: string;
    sizeChartId: string;
}
/**
 * Generate a session id, once per <ring-sizer> instance. Prefers
 * crypto.randomUUID(); falls back to a manual UUIDv4-shaped generator so
 * this never depends on a specific browser/Node crypto version being
 * available.
 */
export declare function createSessionId(): string;
/** Merge telemetry context with event-specific fields, without mutating either. */
export declare function buildEventDetail<T extends object>(context: TelemetryContext, fields: T): TelemetryContext & T;
//# sourceMappingURL=telemetry.d.ts.map