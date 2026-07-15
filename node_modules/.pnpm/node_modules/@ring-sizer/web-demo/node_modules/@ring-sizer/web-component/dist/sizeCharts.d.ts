import { type SizeTableEntry } from '@ring-sizer/core';
/** Register a custom size chart (e.g. a merchant-specific table) under an id. */
export declare function registerSizeChart(id: string, table: SizeTableEntry[]): void;
/** Look up a size chart by id. Unknown ids warn and fall back to 'us-default'. */
export declare function getSizeChart(id: string): SizeTableEntry[];
//# sourceMappingURL=sizeCharts.d.ts.map