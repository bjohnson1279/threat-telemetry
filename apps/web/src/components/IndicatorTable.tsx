import React, { useState, useEffect } from 'react';
import { ThreatIndicator } from '@threat-telemetry/shared';
import { useIndicators } from '../hooks/useIndicators';
import { SeverityBadge } from './SeverityBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { MitreTags } from './MitreTags';
import { FilterBar } from './FilterBar';
import { Pagination } from './Pagination';
import { IndicatorDrawer } from './IndicatorDrawer';

export const IndicatorTable: React.FC = () => {
  const { indicators, loading, filters, setFilters, totalPages, page, setPage, refresh } = useIndicators();
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIndicator | null>(null);

  // Handle ESC to close drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndicator(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleEnriched = (updated: ThreatIndicator) => {
    setSelectedIndicator(updated);
    refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="flex-1 bg-threat-surface border border-threat-border rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-threat-bg/80 border-b border-threat-border text-threat-muted text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Indicator</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Severity</th>
                <th className="p-4 font-medium min-w-[150px]">Confidence</th>
                <th className="p-4 font-medium">MITRE</th>
                <th className="p-4 font-medium">First Seen</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-threat-border/50 text-sm">
              {loading && indicators.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-threat-surface">
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-3/4"></div></td>
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-16"></div></td>
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-full"></div></td>
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-24"></div></td>
                    <td className="p-4"><div className="h-4 bg-threat-border rounded w-24"></div></td>
                    <td className="p-4"><div className="h-8 bg-threat-border rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-threat-muted">
                    <div className="text-4xl mb-4 opacity-50">🔍</div>
                    <p className="mb-4">No indicators found matching the current filters.</p>
                    {(filters.search || filters.indicatorType || filters.severity || (filters.minConfidence && filters.minConfidence > 0)) && (
                      <button
                        onClick={() => setFilters({ page: 1, pageSize: filters.pageSize })}
                        className="px-4 py-2 bg-threat-surface border border-threat-border hover:bg-threat-border hover:text-threat-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded transition-colors text-sm"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                indicators.map((ind, i) => (
                  <tr 
                    key={ind.id} 
                    className={`hover:bg-threat-border/30 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-threat-surface' : 'bg-threat-bg/20'}`}
                    onClick={() => setSelectedIndicator(ind)}
                  >
                    <td className="p-4 font-mono truncate max-w-[200px]" title={ind.indicatorValue}>{ind.indicatorValue}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-threat-border rounded text-xs">{ind.indicatorType}</span></td>
                    <td className="p-4"><SeverityBadge severity={ind.severity} /></td>
                    <td className="p-4"><ConfidenceBar confidence={ind.confidenceScore} /></td>
                    <td className="p-4"><MitreTags techniques={ind.mitreTechniques} /></td>
                    <td className="p-4 text-threat-muted text-xs whitespace-nowrap">{new Date(ind.firstSeen).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button 
                        aria-label={`View indicator ${ind.indicatorValue}`}
                        className="px-3 py-1 text-xs bg-threat-border hover:bg-threat-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedIndicator(ind); }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination 
        page={page} 
        totalPages={totalPages} 
        setPage={setPage} 
        pageSize={filters.pageSize || 10} 
        setPageSize={(s) => setFilters(p => ({ ...p, pageSize: s, page: 1 }))} 
      />

      <IndicatorDrawer 
        indicator={selectedIndicator} 
        onClose={() => setSelectedIndicator(null)} 
        onEnriched={handleEnriched}
      />
    </div>
  );
};
