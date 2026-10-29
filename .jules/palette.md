
## 2026-10-12 - Table Background Loading States & Scope
**Learning:** When a data table has a background refresh (like pagination or search), maintaining the table structure but reducing opacity and disabling pointer events prevents interactions with stale data and provides immediate visual feedback. Additionally, <th> elements should always have scope="col".
**Action:** Apply visual loading states (opacity/pointer-events) and aria-busy to <tbody> elements during background data fetching, and ensure <th> elements use scope attributes.
## 2026-10-14 - Wrap &times; character with aria-hidden
**Learning:** Screen readers might announce text-based HTML icon entities (like `&times;`) as their literal text (e.g., "multiplication" or "times"), which is confusing when placed inside a button that already provides a descriptive `aria-label` (like "Close").
**Action:** Always wrap purely decorative text-based HTML icon entities in a `<span aria-hidden="true">`, even if the parent element already has an `aria-label`.
## 2026-10-15 - Skip to Content Link
**Learning:** Adding a "Skip to main content" link is a critical accessibility feature for keyboard users to bypass repetitive navigation. It must be focusable and properly skip to the main content area with `tabIndex={-1}` so that it doesn't break normal tab flow when not navigated to via the skip link.
**Action:** Always include a visually hidden (but focusable) skip link at the top of the app that points to the main content area, and ensure the target has `tabIndex={-1}`.

## 2026-10-16 - Empty States for Context-Dependent Actions
**Learning:** Hiding sections of a UI (like an AI summary) entirely when data is absent can cause discoverability issues. Users may not realize an action (like "Trigger Enrichment") populates that specific area until they try it.
**Action:** Replace conditional rendering of entire structural sections with explicit, helpful empty states inside those sections to guide the user and establish spatial expectations early.

## 2026-10-21 - Accessible Disabled States
**Learning:** Using the native disabled attribute on buttons causes them to lose focus when they enter a disabled state (e.g., during loading or pagination limits), which disrupts keyboard navigation.
**Action:** Use aria-disabled={true} along with early returns in the onClick handler and aria-disabled styling variants to keep the element focusable but inactive.

## 2026-10-24 - Screen Reader Announcements for Async Content Above Triggers
**Learning:** When async content (like an AI summary) populates *above* its action button in the DOM, screen reader users won't know it appeared because focus remains on the button below it.
**Action:** Wrap the dynamically updating container in an `aria-live="polite"` region so the new content is proactively announced.
## 2024-10-24 - Accessibility improvements to Indicator Table and Drawer
**Learning:** In tables where rows are selectable, using `aria-selected` and conditional classes is an effective way to indicate selection. However, modifying `aria-selected` without proper `role="row"` or modifying `tr` elements where screen readers do not expect them can be problematic. A more standard improvement is handling copy buttons appropriately. `IndicatorTable.tsx`'s copy button could use better keyboard accessibility - making sure the copy button appears when focused, not just on group hover, ensures keyboard users can access it without a mouse.
**Action:** Always verify `focus-visible` styles explicitly show interactive elements that rely on `group-hover`.

## 2026-10-26 - Focus-within for Row-level Actions
**Learning:** When interactive elements rely on `group-hover` for discoverability (like a copy button in a table row), keyboard users are left in the dark unless they tab directly onto the hidden button. `focus-visible` only styles the element itself when focused, but doesn't make it visible when the *row* is focused.
**Action:** Always complement `group-hover:opacity-100` with `group-focus-within:opacity-100` on row-level actions. This ensures the action becomes visible as soon as the user's keyboard focus enters any part of that row group, providing equal discoverability for keyboard navigation.

## 2026-10-28 - Make truncated data with tooltips focusable
**Learning:** When using `title` attributes on wrapper elements to show truncated data on hover, the element must be focusable (`tabIndex={0}`) with an `aria-label` for screen reader and keyboard users to access the full content.
**Action:** Always add `tabIndex={0}`, focus-visible styles, and a descriptive `aria-label` to containers that use `title` for revealing truncated information.
