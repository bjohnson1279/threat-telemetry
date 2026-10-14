
## 2026-10-12 - Table Background Loading States & Scope
**Learning:** When a data table has a background refresh (like pagination or search), maintaining the table structure but reducing opacity and disabling pointer events prevents interactions with stale data and provides immediate visual feedback. Additionally, <th> elements should always have scope="col".
**Action:** Apply visual loading states (opacity/pointer-events) and aria-busy to <tbody> elements during background data fetching, and ensure <th> elements use scope attributes.
## 2026-10-14 - Wrap &times; character with aria-hidden
**Learning:** Screen readers might announce text-based HTML icon entities (like `&times;`) as their literal text (e.g., "multiplication" or "times"), which is confusing when placed inside a button that already provides a descriptive `aria-label` (like "Close").
**Action:** Always wrap purely decorative text-based HTML icon entities in a `<span aria-hidden="true">`, even if the parent element already has an `aria-label`.
