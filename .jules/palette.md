## 2026-11-05 - Add background scroll lock to IndicatorDrawer
**Learning:** When overlay components like modals or drawers are open, allowing the background to scroll can disorient keyboard and screen reader users and cause them to lose their visual context.
**Action:** Always lock background scrolling on `document.body` when rendering full-screen or blocking overlay components, and ensure it is cleaned up on unmount.

## 2023-10-27 - Add cursor-help to non-standard tooltip elements
**Learning:** Elements like truncated text or date formatting that rely on the `title` attribute for full content are often not visually discoverable as interactive to mouse users.
**Action:** Add the `cursor-help` utility class to non-standard interactive elements relying on hover tooltips to reveal information, ensuring they are visually discoverable.

## 2026-11-13 - Add fully descriptive aria-label to inputs with abbreviated visible labels
**Learning:** When an input's visually associated `<label>` uses abbreviated or visually compact text (e.g., 'Min Conf:'), screen reader users receive ambiguous context.
**Action:** Add an explicit, fully descriptive `aria-label` (e.g., 'Minimum Confidence Score') to the input element itself to ensure screen reader users receive unambiguous context.
