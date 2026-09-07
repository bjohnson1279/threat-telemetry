import React from 'react';
import { ThreatIndicatorFilter, IndicatorType, ThreatSeverity } from '@threat-telemetry/shared';

interface FilterBarProps {
  filters: ThreatIndicatorFilter;
  setFilters: React.Dispatch<React.SetStateAction<ThreatIndicatorFilter>>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-threat-surface border border-threat-border rounded-lg">
      <div className="flex-1 min-w-[200px] relative">
        <span className="absolute left-3 top-2.5 opacity-50" aria-hidden="true">🔍</span>
        <input
          type="text"
          aria-label="Search indicators"
          placeholder="Search indicators..."
          className="w-full bg-threat-bg border border-threat-border rounded px-4 py-2 pl-9 text-threat-text focus:outline-none focus:border-threat-accent focus-visible:ring-2 focus-visible:ring-threat-accent"
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
        />
      </div>
      
      <select
        aria-label="Filter by indicator type"
        className="bg-threat-bg border border-threat-border rounded px-4 py-2 text-threat-text focus:outline-none focus:border-threat-accent focus-visible:ring-2 focus-visible:ring-threat-accent"
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
        className="bg-threat-bg border border-threat-border rounded px-4 py-2 text-threat-text focus:outline-none focus:border-threat-accent focus-visible:ring-2 focus-visible:ring-threat-accent"
        value={filters.severity || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as ThreatSeverity || undefined, page: 1 }))}
      >
        <option value="">All Severities</option>
        {Object.values(ThreatSeverity).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="flex items-center space-x-2 bg-threat-bg border border-threat-border rounded px-4 py-2">
        <label htmlFor="min-confidence" className="text-sm text-threat-muted">Min Conf:</label>
        <input
          id="min-confidence"
          type="range"
          min="0"
          max="100"
          className="w-24 accent-threat-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded"
          value={filters.minConfidence || 0}
          onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseInt(e.target.value), page: 1 }))}
        />
        <span className="text-sm w-6 text-right" aria-hidden="true">{filters.minConfidence || 0}%</span>
      </div>
    </div>
  );
};
