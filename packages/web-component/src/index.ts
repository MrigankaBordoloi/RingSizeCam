// ──────────────────────────────────────────────────────────────
// index.ts — Barrel for @ring-sizer/web-component. Importing this
// module registers the <ring-sizer> custom element as a side effect.
//
// Browser-only: defines a class extending HTMLElement at evaluation
// time, so don't import this from an SSR/Node context without a
// client-only dynamic import.
// ──────────────────────────────────────────────────────────────

import { RingSizerElement } from './RingSizerElement.js';

if (typeof customElements !== 'undefined' && !customElements.get('ring-sizer')) {
  customElements.define('ring-sizer', RingSizerElement);
}

export { RingSizerElement };
export type { ResultEventDetail, RetryEventDetail, ErrorEventDetail } from './events.js';
export { registerSizeChart, getSizeChart } from './sizeCharts.js';
