// ──────────────────────────────────────────────────────────────
// sizeCharts.ts — Registry of ring-size tables selectable via the
// size-chart-id attribute. Merchants "deviate from standard charts"
// (per CLAUDE.md) — registerSizeChart lets them supply their own.
// ──────────────────────────────────────────────────────────────
import { DEFAULT_US_SIZE_TABLE } from '@ring-sizer/core';
/**
 * EU/French ring size = circumference in mm, rounded. Derived exactly from
 * DEFAULT_US_SIZE_TABLE's own circumferenceMm values via that definitional
 * relationship — not a separately memorized table, so there's no precision
 * risk beyond whatever the US table already carries.
 */
function buildEuDefaultTable() {
    return DEFAULT_US_SIZE_TABLE.map((entry) => {
        const eu = Math.round(entry.circumferenceMm);
        return { label: String(eu), size: eu, circumferenceMm: entry.circumferenceMm };
    });
}
/**
 * UK/Ireland letter-grade ring sizes — APPROXIMATION, not verbatim BS 6748
 * data. Constructed from one well-established anchor point that's
 * consistently cited across published conversion charts (UK "N" ≈ US 7),
 * anchored to the US table's own real size-7 circumference rather than a
 * separately asserted number, plus a standard ~1.25mm-per-full-letter step
 * (0.625mm per half-letter grade — chosen so the full A–Z span lands close
 * to the US table's own ~31mm real-world range; the naive reading of
 * "~1.25mm per half-letter" would double that to a physically impossible
 * ~64mm span). See README for the full caveat — verify against an
 * authoritative source (e.g. BS 6748) before production/commercial use.
 */
function buildUkDefaultTable() {
    const letters = [];
    for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        const letter = String.fromCharCode(code);
        letters.push(letter, `${letter}½`);
    }
    const anchorEntry = DEFAULT_US_SIZE_TABLE.find((e) => e.size === 7);
    if (!anchorEntry) {
        throw new Error('DEFAULT_US_SIZE_TABLE is missing its US 7 anchor entry');
    }
    const anchorCircumferenceMm = anchorEntry.circumferenceMm;
    const anchorIndex = letters.indexOf('N');
    const stepMmPerHalfLetter = 0.625;
    return letters.map((label, i) => ({
        label,
        size: i,
        circumferenceMm: anchorCircumferenceMm + (i - anchorIndex) * stepMmPerHalfLetter,
    }));
}
const registry = new Map([
    ['us-default', DEFAULT_US_SIZE_TABLE],
    ['eu-default', buildEuDefaultTable()],
    ['uk-default', buildUkDefaultTable()],
]);
/** Register a custom size chart (e.g. a merchant-specific table) under an id. */
export function registerSizeChart(id, table) {
    registry.set(id, table);
}
/** Look up a size chart by id. Unknown ids warn and fall back to 'us-default'. */
export function getSizeChart(id) {
    const table = registry.get(id);
    if (!table) {
        console.warn(`[ring-sizer] Unknown size-chart-id "${id}" — falling back to "us-default".`);
        return registry.get('us-default');
    }
    return table;
}
//# sourceMappingURL=sizeCharts.js.map