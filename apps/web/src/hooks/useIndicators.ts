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
      setIndicators(res.data);
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
