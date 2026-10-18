
## 2026-10-12 - Table Background Loading States & Scope
**Learning:** When a data table has a background refresh (like pagination or search), maintaining the table structure but reducing opacity and disabling pointer events prevents interactions with stale data and provides immediate visual feedback. Additionally, <th> elements should always have scope="col".
**Action:** Apply visual loading states (opacity/pointer-events) and aria-busy to <tbody> elements during background data fetching, and ensure <th> elements use scope attributes.
## 2026-10-14 - Wrap &times; character with aria-hidden
**Learning:** Screen readers might announce text-based HTML icon entities (like `&times;`) as their literal text (e.g., "multiplication" or "times"), which is confusing when placed inside a button that already provides a descriptive `aria-label` (like "Close").
**Action:** Always wrap purely decorative text-based HTML icon entities in a `<span aria-hidden="true">`, even if the parent element already has an `aria-label`.
## 2026-10-15 - Skip to Content Link
**Learning:** Adding a "Skip to main content" link is a critical accessibility feature for keyboard users to bypass repetitive navigation. It must be focusable and properly skip to the main content area with `tabIndex={-1}` so that it doesn't break normal tab flow when not navigated to via the skip link.
**Action:** Always include a visually hidden (but focusable) skip link at the top of the app that points to the main content area, and ensure the target has `tabIndex={-1}`.

## 2026-10-18 - Keyboard accessibility for scrollable areas
**Learning:** Scrollable areas (`overflow-x-auto` or `overflow-y-auto`) are inaccessible to keyboard users unless they can receive focus.
**Action:** Always add `tabIndex={0}`, `role="region"`, a descriptive `aria-label` (or `aria-labelledby`), and visible focus indicator classes to scrollable containers.
