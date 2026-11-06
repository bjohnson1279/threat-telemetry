import { useState, useEffect, useCallback } from 'react';
import { fetchStats, StatsResponse } from '../lib/api';

export function useStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ⚡ Bolt: [performance improvement]
  // Bypassed unnecessary deep object comparisons or continuous state updates during background polling
  // to prevent StatsCards from re-rendering every 15 seconds unless data actually changes.
  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchStats();
      setStats(prev => {
        if (!prev) return data;
        if (
          prev.total === data.total &&
          prev.critical === data.critical &&
          prev.high === data.high &&
          prev.avgConfidence === data.avgConfidence &&
          prev.activeMitreTechniques === data.activeMitreTechniques
        ) {
          return prev;
        }
        return data;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  return { stats, loading, error, refresh: load };
}
