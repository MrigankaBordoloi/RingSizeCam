import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_US_SIZE_TABLE, type SizeTableEntry } from '@ring-sizer/core';
import { registerSizeChart, getSizeChart } from '../sizeCharts.js';

describe('getSizeChart', () => {
  it('returns the US default table for "us-default"', () => {
    expect(getSizeChart('us-default')).toEqual(DEFAULT_US_SIZE_TABLE);
  });

  it('derives the EU table exactly from the US table circumferences', () => {
    const eu = getSizeChart('eu-default');
    expect(eu).toHaveLength(DEFAULT_US_SIZE_TABLE.length);
    for (const entry of eu) {
      const expected = String(Math.round(entry.circumferenceMm));
      expect(entry.label).toBe(expected);
      expect(entry.size).toBe(Number(expected));
    }
  });

  it('builds a UK table anchored at the US size-7 circumference and monotonically increasing', () => {
    const uk = getSizeChart('uk-default');
    const usSeven = DEFAULT_US_SIZE_TABLE.find((e) => e.size === 7)!;
    const anchor = uk.find((e) => e.label === 'N');

    expect(anchor).toBeDefined();
    expect(anchor!.circumferenceMm).toBeCloseTo(usSeven.circumferenceMm, 5);

    for (let i = 1; i < uk.length; i++) {
      expect(uk[i]!.circumferenceMm).toBeGreaterThan(uk[i - 1]!.circumferenceMm);
    }
  });

  it('falls back to us-default and warns for an unknown id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const table = getSizeChart('bogus-chart-id');
    expect(table).toEqual(DEFAULT_US_SIZE_TABLE);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]![0]).toMatch(/bogus-chart-id/);
    warnSpy.mockRestore();
  });
});

describe('registerSizeChart', () => {
  it('round-trips a custom table', () => {
    const custom: SizeTableEntry[] = [
      { label: 'S', size: 1, circumferenceMm: 45 },
      { label: 'L', size: 2, circumferenceMm: 65 },
    ];
    registerSizeChart('merchant-custom', custom);
    expect(getSizeChart('merchant-custom')).toBe(custom);
  });
});
