## 2026-11-05 - Add background scroll lock to IndicatorDrawer
**Learning:** When overlay components like modals or drawers are open, allowing the background to scroll can disorient keyboard and screen reader users and cause them to lose their visual context.
**Action:** Always lock background scrolling on `document.body` when rendering full-screen or blocking overlay components, and ensure it is cleaned up on unmount.
## 2023-10-27 - Make hover interactions discoverable
**Learning:** Even if a container element is focusable (`tabIndex={0}`) and has a tooltip (`title`) and screen reader support (`aria-label`), mouse users may not realize it's interactive if the cursor doesn't change on hover (default is often text or default pointer).
**Action:** Always add a cursor utility like `cursor-help` or `cursor-pointer` to non-standard interactive elements that rely on hover tooltips to reveal truncated information.
