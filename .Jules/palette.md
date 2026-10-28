## 2026-10-28 - Make truncated data with tooltips focusable
**Learning:** When using `title` attributes on wrapper elements to show truncated data on hover, the element must be focusable (`tabIndex={0}`) with an `aria-label` for screen reader and keyboard users to access the full content.
**Action:** Always add `tabIndex={0}`, focus-visible styles, and a descriptive `aria-label` to containers that use `title` for revealing truncated information.
