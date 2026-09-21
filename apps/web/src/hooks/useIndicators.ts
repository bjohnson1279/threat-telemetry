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

  const load = useCallback(async (activeFilters: ThreatIndicatorFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchIndicators(activeFilters);
      setIndicators(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load indicators');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    load(filters);
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
