## 2026-11-05 - Add background scroll lock to IndicatorDrawer
**Learning:** When overlay components like modals or drawers are open, allowing the background to scroll can disorient keyboard and screen reader users and cause them to lose their visual context.
**Action:** Always lock background scrolling on `document.body` when rendering full-screen or blocking overlay components, and ensure it is cleaned up on unmount.
