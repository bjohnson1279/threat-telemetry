## 2023-11-09 - Accessibility focus states
**Learning:** Found missing focus states on `button` in `IndicatorTable.tsx` and `IndicatorDrawer.tsx`. Also missing ARIA labels on buttons meant to describe what is viewed or closed.
**Action:** Added `focus-visible` styles explicitly, added `aria-label`s. Ensure that for `IndicatorTable`, the property accessed matches the frontend interface expected property.

## 2025-03-08 - Accessibility of Input Controls
**Learning:** Found an accessibility pattern where `select` inputs lacked `aria-label` attributes and range inputs lacked semantic `<label>` associations in `FilterBar.tsx`. Also, range slider percentage outputs caused potential layout shift.
**Action:** Always add `aria-label` to form controls without visible text labels. Ensure custom range slider labels use `<label htmlFor="...">` and `id="..."`. Use `tabular-nums` for numeric values that change rapidly to prevent layout shift. Also add `aria-hidden="true"` to decorative icons. Ensure `focus-visible` states are used for keyboard navigation instead of generic `focus`.

## 2026-09-09 - Pagination Accessibility Improvement
**Learning:** Pagination controls often lack proper form labels for row size selection and ARIA live regions for page number changes, breaking screen reader navigation. Missing focus visible rings on pagination buttons make keyboard navigation difficult.
**Action:** Always use <label> tags linked by id/htmlFor to <select> elements, ensure interactive buttons have focus-visible styling, and wrap page indicators in aria-live="polite".
