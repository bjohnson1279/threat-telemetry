import React, { useState, useEffect, useRef } from 'react';
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
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setEnrichError(null);
    if (indicator) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Small timeout to ensure the drawer is mounted and visible before focusing
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 10);
      return () => {
        clearTimeout(timer);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [indicator]);

  if (!indicator) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(indicator.indicatorValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(indicator, null, 2));
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy JSON', e);
    }
  };

  const handleEnrich = async () => {
    try {
      setEnriching(true);
      setEnrichError(null);
      const updated = await triggerEnrichment(indicator.id);
      if (onEnriched) onEnriched(updated);
    } catch (e: any) {
      console.error('Enrichment failed', e);
      setEnrichError(e.message || 'Enrichment failed. Please try again.');
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true" />
      
      <div className="relative w-full max-w-xl h-full bg-threat-surface border-l border-threat-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex items-center justify-between p-6 border-b border-threat-border bg-threat-bg/50">
          <div className="flex items-center space-x-3 pr-4 min-w-0">
            <h2 id="drawer-title" className="text-xl font-mono text-threat-text break-all">{indicator.indicatorValue}</h2>
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied indicator value!' : 'Copy indicator value'}
              title={copied ? 'Copied indicator value!' : 'Copy indicator value'}
              className="text-threat-muted hover:text-threat-text hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded p-1 flex-shrink-0"
            >
              <span aria-hidden="true">{copied ? '✅' : '📋'}</span>
            </button>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close drawer" className="text-threat-muted hover:text-threat-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded text-2xl leading-none flex-shrink-0">&times;</button>
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
                <span className="mr-2" aria-hidden="true">🤖</span> AI Analyst Brief
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
            <div className="flex items-center justify-between border-b border-threat-border mb-4 pb-2">
              <h3 className="text-sm font-semibold text-threat-muted uppercase tracking-wider">Raw Data</h3>
              <button
                onClick={handleCopyJson}
                aria-label={jsonCopied ? 'Copied raw JSON data!' : 'Copy raw JSON data'}
                title={jsonCopied ? 'Copied raw JSON data!' : 'Copy raw JSON data'}
                className="text-threat-muted hover:text-threat-text hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-threat-accent rounded px-1 flex-shrink-0"
              >
                <span aria-hidden="true">{jsonCopied ? '✅' : '📋'}</span>
              </button>
            </div>
            <div className="bg-[#0d1117] border border-threat-border rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-threat-muted">
                {JSON.stringify(indicator, null, 2)}
              </pre>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-threat-border bg-threat-bg/50 flex flex-col gap-3">
          {enrichError && (
            <div className="flex items-start space-x-2 text-threat-critical bg-threat-critical/10 border border-threat-critical/30 rounded p-3 text-sm" role="alert" aria-live="assertive">
              <span className="mt-0.5" aria-hidden="true">⚠️</span>
              <span>{enrichError}</span>
            </div>
          )}
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
              <><span aria-hidden="true">✨</span> Trigger Enrichment</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
