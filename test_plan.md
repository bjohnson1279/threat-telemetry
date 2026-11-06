1. **Add visual skeleton loading state to AI Analyst Brief** in `IndicatorDrawer.tsx` when `enriching` is true, replacing the stale "No analysis available" message.
2. **Add `aria-hidden="true"`** to the spinner SVG in the same component.
3. **Add `<time>` with full date/time tooltip** to the 'First Seen' column in `IndicatorTable.tsx`.
4. Run `pnpm test` and `pnpm build` in `apps/web` to verify.
