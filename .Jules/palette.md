## 2023-11-09 - Accessibility focus states
**Learning:** Found missing focus states on `button` in `IndicatorTable.tsx` and `IndicatorDrawer.tsx`. Also missing ARIA labels on buttons meant to describe what is viewed or closed.
**Action:** Added `focus-visible` styles explicitly, added `aria-label`s. Ensure that for `IndicatorTable`, the property accessed matches the frontend interface expected property.

## 2023-11-10 - Form control accessibility in FilterBar
**Learning:** Found multiple inputs/selects in `FilterBar.tsx` relying solely on border color changes for focus, missing explicit labels or `aria-label`s, and a decorative icon read by screen readers. The `Min Conf:` label was just a text `span`.
**Action:** Added `focus-visible:ring-2 focus-visible:ring-threat-accent`, added `aria-label`s, converted the text span into a proper `<label htmlFor="...">`, and added `aria-hidden="true"` to the decorative icon. Ensure all form controls have distinct focus styles and labels going forward.
