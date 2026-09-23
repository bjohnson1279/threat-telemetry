import React, { useEffect, useRef, useState } from 'react';
import { ThreatIndicatorFilter, IndicatorType, ThreatSeverity } from '@threat-telemetry/shared';

interface FilterBarProps {
  filters: ThreatIndicatorFilter;
  setFilters: React.Dispatch<React.SetStateAction<ThreatIndicatorFilter>>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // ⚡ Bolt: [performance improvement]
  // Debounce search input locally to reduce unnecessary parent state updates
  // Expected impact: Allows instant filtering for other fields while still rate-limiting API calls for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((localSearch || undefined) !== filters.search) {
        setFilters(prev => ({ ...prev, search: localSearch || undefined, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, setFilters]);

  // Sync back from parent if cleared remotely
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search input when '/' is pressed
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); // Prevent '/' from being typed in the input
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-threat-surface border border-threat-border rounded-lg">
      <div className="flex-1 min-w-[200px] relative">
        <span className="absolute left-3 top-2.5 opacity-50" aria-hidden="true">🔍</span>
        <input
          ref={searchInputRef}
          type="text"
          aria-label="Search indicators (Press / to focus)"
          placeholder="Search indicators..."
          className="w-full bg-threat-bg border border-threat-border rounded px-4 py-2 pl-9 pr-12 text-threat-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
        {!localSearch && (
          <kbd className="absolute right-3 top-2.5 px-2 py-0.5 text-xs text-threat-muted bg-threat-surface border border-threat-border rounded shadow-sm hidden sm:inline-block pointer-events-none" aria-hidden="true">
            /
          </kbd>
        )}
        {localSearch && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setLocalSearch('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-2 top-2.5 text-threat-muted hover:text-threat-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded-full leading-none flex items-center justify-center w-5 h-5 text-lg"
          >
            &times;
          </button>
        )}
      </div>
      
      <select
        aria-label="Filter by indicator type"
        className="bg-threat-bg border border-threat-border rounded px-4 py-2 text-threat-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent"
        value={filters.indicatorType || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, indicatorType: e.target.value as IndicatorType || undefined, page: 1 }))}
      >
        <option value="">All Types</option>
        {Object.values(IndicatorType).map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        aria-label="Filter by severity"
        className="bg-threat-bg border border-threat-border rounded px-4 py-2 text-threat-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent"
        value={filters.severity || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as ThreatSeverity || undefined, page: 1 }))}
      >
        <option value="">All Severities</option>
        {Object.values(ThreatSeverity).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="flex items-center space-x-2 bg-threat-bg border border-threat-border rounded px-4 py-2">
        <label htmlFor="minConfidence" className="text-sm text-threat-muted">Min Conf:</label>
        <input
          id="minConfidence"
          type="range"
          min="0"
          max="100"
          className="w-24 accent-threat-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent"
          value={filters.minConfidence || 0}
          onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseInt(e.target.value), page: 1 }))}
        />
        <span className="text-sm w-7 text-right tabular-nums" aria-hidden="true">{filters.minConfidence || 0}%</span>
      </div>
    </div>
  );
};
