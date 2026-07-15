import type { MeasurementResult, SizeTableEntry } from './types.js';
/**
 * Standard US ring-size chart.
 * Source: ISO 8653 / common US jeweler reference.
 * Circumferences in mm.
 */
export declare const DEFAULT_US_SIZE_TABLE: SizeTableEntry[];
/**
 * Map a circumference (mm) to a ring size using linear interpolation.
 *
 * @param circumferenceMm Measured circumference in mm.
 * @param circumferenceRange [lo, hi] circumference range for CI computation.
 * @param table Ring-size lookup table (defaults to US chart).
 * @returns MeasurementResult with interpolated size and confidence interval.
 */
export declare function circumferenceToSize(circumferenceMm: number, circumferenceRange: [number, number], table?: SizeTableEntry[]): MeasurementResult;
//# sourceMappingURL=sizing.d.ts.map