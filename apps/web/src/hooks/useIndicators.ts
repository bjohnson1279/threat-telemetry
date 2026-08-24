import { useState, useEffect, useCallback, useRef } from 'react';
import { ThreatIndicator, PaginatedResponse, ThreatIndicatorFilter } from '@threat-telemetry/shared';
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

  const searchTimeout = useRef<number | null>(null);

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
    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = window.setTimeout(() => {
      load(filters);
    }, 300);

    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    };
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
