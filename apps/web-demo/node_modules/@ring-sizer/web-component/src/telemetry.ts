// ──────────────────────────────────────────────────────────────
// telemetry.ts — Session/api-key context attached to emitted
// CustomEvents. No network calls — no backend exists yet. api-key
// is accepted and carried on event detail payloads, not validated.
// ──────────────────────────────────────────────────────────────

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
export function createSessionId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Merge telemetry context with event-specific fields, without mutating either. */
export function buildEventDetail<T extends object>(
  context: TelemetryContext,
  fields: T,
): TelemetryContext & T {
  return { ...context, ...fields };
}
