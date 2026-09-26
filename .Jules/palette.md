## 2023-11-09 - Accessibility focus states
**Learning:** Found missing focus states on `button` in `IndicatorTable.tsx` and `IndicatorDrawer.tsx`. Also missing ARIA labels on buttons meant to describe what is viewed or closed.
**Action:** Added `focus-visible` styles explicitly, added `aria-label`s. Ensure that for `IndicatorTable`, the property accessed matches the frontend interface expected property.

## 2025-03-08 - Accessibility of Input Controls
**Learning:** Found an accessibility pattern where `select` inputs lacked `aria-label` attributes and range inputs lacked semantic `<label>` associations in `FilterBar.tsx`. Also, range slider percentage outputs caused potential layout shift.
**Action:** Always add `aria-label` to form controls without visible text labels. Ensure custom range slider labels use `<label htmlFor="...">` and `id="..."`. Use `tabular-nums` for numeric values that change rapidly to prevent layout shift. Also add `aria-hidden="true"` to decorative icons. Ensure `focus-visible` states are used for keyboard navigation instead of generic `focus`.

## 2026-09-09 - Pagination Accessibility Improvement
**Learning:** Pagination controls often lack proper form labels for row size selection and ARIA live regions for page number changes, breaking screen reader navigation. Missing focus visible rings on pagination buttons make keyboard navigation difficult.
**Action:** Always use <label> tags linked by id/htmlFor to <select> elements, ensure interactive buttons have focus-visible styling, and wrap page indicators in aria-live="polite".

## 2026-09-11 - Add clear button to search input
**Learning:** Search inputs often contain complex queries, but users had to manually backspace or select all text to clear them, causing friction. A small interactive clear button makes filtering noticeably faster.
**Action:** Consistently add a clear button `(&times;)` with a proper `aria-label="Clear search"` to all non-trivial search inputs in the design system, ensuring it's conditionally rendered only when the input has a value.
## 2026-09-12 - [UX/Accessibility Improvements]\n**Learning:** Implementing semantic HTML attributes like `aria-busy="true"` and `role="progressbar"` with `aria-value*` drastically improves screen reader compatibility without needing any custom JavaScript logic or CSS changes.\n**Action:** Use existing ARIA standards for structural semantic improvements directly on layout placeholders/loading-states and visual indicators.
## 2026-09-15 - [Confidence Bar Accessibility Fix]
**Learning:** When building visual progress bars or gauges with standard DOM elements, using a semantically grouped container with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` while hiding purely visual inner DOM elements from screen readers using `aria-hidden="true"` provides a much cleaner experience for assistive technologies.
**Action:** Apply this pattern consistently across all custom progress/gauge components instead of arbitrarily scattering ARIA attributes.

## 2026-09-16 - Keyboard shortcut visual hints
**Learning:** When adding keyboard shortcuts (like '/' to focus search), users often discover them by accident or not at all unless visually hinted. Adding a non-intrusive `<kbd>` hint directly in the input that disappears on typing provides excellent, non-blocking discoverability.
**Action:** When implementing global keyboard shortcuts for primary inputs, add a small, styled `<kbd>` element inside the input's visual bounds, hide it when the input has value to not interfere with text, and ensure the `aria-label` includes the shortcut hint.
## 2026-09-17 - [Add copy button to indicator drawer]
**Learning:** Analysts frequently need to copy IOC values (like IPs or hashes) to paste into external tools, so providing a one-click copy button next to the indicator value improves the workflow significantly. Adding immediate visual feedback (like swapping icons briefly) enhances the perceived reliability of this action.
**Action:** Always add a copy-to-clipboard button to key values in detail views or drawers, ensuring they have appropriate aria-labels and keyboard focus styling.
## 2026-09-18 - Inline Actions for Repetitive Workflows
**Learning:** Analysts frequently need to extract/copy indicator values (IPs, hashes) directly from lists. Opening a drawer or detail view just to copy a value adds unnecessary friction. Hiding inline actions (like a copy button) until row hover or focus provides the utility without cluttering the UI.
**Action:** Add inline copy buttons (with `opacity-0 group-hover:opacity-100 focus-visible:opacity-100`) to indicator values in list views to streamline analyst workflows.

## 2026-09-19 - Inline Copy for Raw Data blocks
**Learning:** Analysts frequently need to copy full JSON raw data payloads. A dedicated copy button next to raw code blocks improves the extraction workflow.
**Action:** Add dedicated copy buttons to raw data blocks or code blocks with visual feedback.

## 2026-09-21 - Hide decorative emojis from screen readers
**Learning:** Emojis used for purely visual purposes (like copy icons, decorative ✨ or 🤖) are often read aloud by screen readers, creating annoying and confusing auditory clutter.
**Action:** Always wrap decorative emojis in a `<span aria-hidden="true">`, or add `aria-hidden="true"` to their containing elements, when they don't provide extra semantic meaning.

## 2026-09-26 - Restore focus on unmount
**Learning:** When a conditionally rendered interactive element (like a "Clear search" button) unmounts upon activation, it leaves keyboard users stranded with sudden focus loss, breaking accessibility flows.
**Action:** Always programmatically restore focus to a logical next element (e.g., back to the input field) using a React ref before unmounting the activated element.
