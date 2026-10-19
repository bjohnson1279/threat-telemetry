
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

## 2026-10-17 - Prevent Focus Drop on Disabled Buttons
**Learning:** When a button becomes disabled as a direct result of user interaction (e.g., an async submit button going into a loading state, or pagination hitting the first/last page), setting the HTML `disabled` attribute causes the browser to immediately drop keyboard focus to the `<body>`. This forces keyboard and screen reader users to restart their navigation from the top of the page.
**Action:** Instead of the HTML `disabled` attribute, use `aria-disabled={true}` combined with visual disabled styling (e.g., `aria-disabled:opacity-50 aria-disabled:cursor-not-allowed`) and an early return in the `onClick` handler. This keeps the button focusable but inactive, preserving the user's focus context.
