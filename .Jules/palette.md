
## 2026-10-12 - Table Background Loading States & Scope
**Learning:** When a data table has a background refresh (like pagination or search), maintaining the table structure but reducing opacity and disabling pointer events prevents interactions with stale data and provides immediate visual feedback. Additionally, <th> elements should always have scope="col".
**Action:** Apply visual loading states (opacity/pointer-events) and aria-busy to <tbody> elements during background data fetching, and ensure <th> elements use scope attributes.

## 2026-10-13 - Hide HTML Entities in Icon Buttons
**Learning:** HTML entities used as icons (like `&times;`) inside buttons with `aria-label` attributes are often still read out by screen readers (e.g. as "multiplication"). This causes duplicate, confusing announcements.
**Action:** Always wrap text-based icon entities in a `<span aria-hidden="true">`, especially when they are inside a button that already provides a descriptive `aria-label`.
