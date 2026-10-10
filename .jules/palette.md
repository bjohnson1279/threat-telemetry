## 2026-10-10 - Explicit Error States in Table Data
**Learning:** Screen readers might miss error messages injected directly into table cells if they are not explicitly marked as live regions, particularly when the whole table body is swapped out due to an API failure.
**Action:** Always add `role="alert"` and `aria-live="assertive"` to the container elements of inline error states within data views to ensure they are immediately announced.
