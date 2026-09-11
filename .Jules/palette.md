## 2023-11-09 - Accessibility focus states
**Learning:** Found missing focus states on `button` in `IndicatorTable.tsx` and `IndicatorDrawer.tsx`. Also missing ARIA labels on buttons meant to describe what is viewed or closed.
**Action:** Added `focus-visible` styles explicitly, added `aria-label`s. Ensure that for `IndicatorTable`, the property accessed matches the frontend interface expected property.

## 2025-03-08 - Accessibility of Input Controls
**Learning:** Found an accessibility pattern where `select` inputs lacked `aria-label` attributes and range inputs lacked semantic `<label>` associations in `FilterBar.tsx`. Also, range slider percentage outputs caused potential layout shift.
**Action:** Always add `aria-label` to form controls without visible text labels. Ensure custom range slider labels use `<label htmlFor="...">` and `id="..."`. Use `tabular-nums` for numeric values that change rapidly to prevent layout shift. Also add `aria-hidden="true"` to decorative icons. Ensure `focus-visible` states are used for keyboard navigation instead of generic `focus`.

## 2026-09-09 - Empty State UX Pattern
**Learning:** Discovered a frustrating "dead end" UX pattern in the indicator table where users could get stuck in an empty state after aggressive filtering without an obvious way to reset.
**Action:** Implemented an automatic "Clear Filters" contextual action that only renders in the empty state *if* filters are actively applied. This prevents users from manually resetting multiple select/input fields to escape the empty state.
## 2026-09-10 - Accessible Dialogs & Async Feedback
**Learning:** Implementing custom modals requires explicit WAI-ARIA roles (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) and hiding backdrop overlays from screen readers (`aria-hidden="true"`) to ensure they are interpreted correctly by assistive tech. Additionally, async actions within modals require visual feedback (like a spinner) as disabling the button isn't enough context for users.
**Action:** Always verify custom modal components have full ARIA attributes linking titles to the dialog root and implement explicit visual feedback for async submit buttons.
