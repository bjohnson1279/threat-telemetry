import { useState, useEffect, useCallback } from 'react';
import { ThreatIndicator, ThreatIndicatorFilter } from '@threat-telemetry/shared';
import { fetchIndicators } from '../lib/api';

export function useIndicators() {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ThreatIndicatorFilter>({
    page: 1,
    pageSize: 10,
    search: '',
  });

  // ⚡ Bolt: [performance improvement]
  // Bypassed global loading state updates during background polling to prevent
  // the entire IndicatorTable from artificially re-rendering and blocking user interaction.
  const load = useCallback(async (activeFilters: ThreatIndicatorFilter, isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const res = await fetchIndicators(activeFilters);

      // ⚡ Bolt: [performance improvement]
      // Preserve array item object references for structurally identical indicators during polling.
      // Expected impact: Prevents React.memo thrashing in IndicatorTable. Only rows with actual changes
      // (like a new enrichmentSummary or severity from the worker) will re-render, saving massive Virtual DOM diffing.
      setIndicators(prev => {
        if (!prev || prev.length === 0 || res.data.length === 0) return res.data;

        let changed = false;
        const next = res.data.map(newItem => {
          const oldItem = prev.find(p => p.id === newItem.id);
          if (
            oldItem &&
            oldItem.severity === newItem.severity &&
            oldItem.confidenceScore === newItem.confidenceScore &&
            oldItem.enrichmentSummary === newItem.enrichmentSummary &&
            oldItem.indicatorValue === newItem.indicatorValue &&
            oldItem.indicatorType === newItem.indicatorType &&
            oldItem.firstSeen === newItem.firstSeen &&
            oldItem.lastSeen === newItem.lastSeen &&
            oldItem.mitreTechniques.length === newItem.mitreTechniques.length &&
            oldItem.mitreTechniques.every((val, index) => val === newItem.mitreTechniques[index])
          ) {
            return oldItem;
          }
          changed = true;
          return newItem;
        });

        // If length changed or items order changed but ids match, it will still use old item ref.
        // We only care if length changed or any item is actually structurally different or in different order.
        if (!changed && prev.length === next.length && prev.every((item, i) => item === next[i])) {
          return prev; // Entire array is identical by reference
        }
        return next;
      });

      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load indicators');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    load(filters, true);
  }, [load, filters]);

  useEffect(() => {
    // ⚡ Bolt: [performance improvement]
    // Removed global filter debounce. Search is now debounced locally in FilterBar,
    // meaning pagination and dropdown interactions instantly trigger a fetch.
    load(filters);
  }, [filters, load]);

  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const setPage = (page: number) => setFilters(prev => ({ ...prev, page }));

  return {
    indicators,
    total,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    page: filters.page || 1,
    setPage,
    refresh,
  };
}
