import { describe, it, expect } from 'vitest';
import { createSessionId, buildEventDetail, type TelemetryContext } from '../telemetry.js';

describe('createSessionId', () => {
  it('returns a UUID-shaped string', () => {
    const id = createSessionId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('returns a different id on each call', () => {
    const a = createSessionId();
    const b = createSessionId();
    expect(a).not.toBe(b);
  });
});

describe('buildEventDetail', () => {
  it('merges telemetry context with event-specific fields', () => {
    const context: TelemetryContext = {
      apiKey: 'demo-key',
      sessionId: 'abc-123',
      locale: 'en-US',
      sizeChartId: 'us-default',
    };
    const detail = buildEventDetail(context, { value: 7.5, label: '7.5' });

    expect(detail).toEqual({
      apiKey: 'demo-key',
      sessionId: 'abc-123',
      locale: 'en-US',
      sizeChartId: 'us-default',
      value: 7.5,
      label: '7.5',
    });
  });

  it('does not mutate the input context or fields', () => {
    const context: TelemetryContext = {
      apiKey: null,
      sessionId: 'abc-123',
      locale: 'en-US',
      sizeChartId: 'us-default',
    };
    const fields = { reason: 'ci-too-wide' as const };

    buildEventDetail(context, fields);

    expect(context).toEqual({
      apiKey: null,
      sessionId: 'abc-123',
      locale: 'en-US',
      sizeChartId: 'us-default',
    });
    expect(fields).toEqual({ reason: 'ci-too-wide' });
  });
});
