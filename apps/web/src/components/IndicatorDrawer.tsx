import React, { useState } from 'react';
import { ThreatIndicator } from '@threat-telemetry/shared';
import { SeverityBadge } from './SeverityBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { triggerEnrichment } from '../lib/api';

interface IndicatorDrawerProps {
  indicator: ThreatIndicator | null;
  onClose: () => void;
  onEnriched?: (updated: ThreatIndicator) => void;
}

export const IndicatorDrawer: React.FC<IndicatorDrawerProps> = ({ indicator, onClose, onEnriched }) => {
  const [enriching, setEnriching] = useState(false);

  if (!indicator) return null;

  const handleEnrich = async () => {
    try {
      setEnriching(true);
      const updated = await triggerEnrichment(indicator.id);
      if (onEnriched) onEnriched(updated);
    } catch (e) {
      console.error('Enrichment failed', e);
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true" />
      
      <div className="relative w-full max-w-xl h-full bg-threat-surface border-l border-threat-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex items-center justify-between p-6 border-b border-threat-border bg-threat-bg/50">
          <h2 id="drawer-title" className="text-xl font-mono text-threat-text break-all pr-4">{indicator.indicatorValue}</h2>
          <button onClick={onClose} aria-label="Close drawer" className="text-threat-muted hover:text-threat-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-threat-muted uppercase tracking-wider mb-4 border-b border-threat-border pb-2">Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-threat-muted mb-1">Type</p>
                <span className="px-2 py-1 bg-threat-border text-threat-text rounded text-xs font-mono">{indicator.indicatorType}</span>
              </div>
              <div>
                <p className="text-sm text-threat-muted mb-1">Severity</p>
                <SeverityBadge severity={indicator.severity} />
              </div>
              <div className="col-span-2">
                <p className="text-sm text-threat-muted mb-1">Confidence Score</p>
                <ConfidenceBar confidence={indicator.confidenceScore} />
              </div>
              <div>
                <p className="text-sm text-threat-muted mb-1">First Seen</p>
                <p className="text-sm">{new Date(indicator.firstSeen).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-threat-muted mb-1">Last Seen</p>
                <p className="text-sm">{new Date(indicator.lastSeen).toLocaleString()}</p>
              </div>
            </div>
          </section>

          {indicator.enrichmentSummary && (
            <section>
              <h3 className="text-sm font-semibold text-threat-muted uppercase tracking-wider mb-4 border-b border-threat-border pb-2 flex items-center">
                <span className="mr-2">🤖</span> AI Analyst Brief
              </h3>
              <div className="bg-threat-bg border border-threat-border rounded-lg p-4 text-sm leading-relaxed text-threat-text/90">
                {indicator.enrichmentSummary}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-threat-muted uppercase tracking-wider mb-4 border-b border-threat-border pb-2">MITRE ATT&CK</h3>
            {indicator.mitreTechniques && indicator.mitreTechniques.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {indicator.mitreTechniques.map(t => (
                  <span key={t} className="px-3 py-1 bg-threat-accent/10 text-threat-accent rounded-full text-sm border border-threat-accent/30">{t}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-threat-muted">No associated techniques mapped.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-threat-muted uppercase tracking-wider mb-4 border-b border-threat-border pb-2">Raw Data</h3>
            <div className="bg-[#0d1117] border border-threat-border rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-threat-muted">
                {JSON.stringify(indicator, null, 2)}
              </pre>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-threat-border bg-threat-bg/50">
          <button 
            onClick={handleEnrich} 
            disabled={enriching}
            className="w-full py-2 px-4 bg-threat-accent hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent focus-visible:ring-offset-2 focus-visible:ring-offset-threat-bg text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {enriching ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enriching...
              </>
            ) : (
              '✨ Trigger Enrichment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
