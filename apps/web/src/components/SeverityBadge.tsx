import React from 'react';
import { ThreatSeverity } from '@threat-telemetry/shared';

export const SeverityBadge: React.FC<{ severity: ThreatSeverity }> = ({ severity }) => {
  const colors = {
    [ThreatSeverity.LOW]: 'bg-threat-low/20 text-threat-low border-threat-low/50',
    [ThreatSeverity.MED]: 'bg-threat-med/20 text-threat-med border-threat-med/50',
    [ThreatSeverity.HIGH]: 'bg-threat-high/20 text-threat-high border-threat-high/50',
    [ThreatSeverity.CRITICAL]: 'bg-threat-critical/20 text-threat-critical border-threat-critical/50 animate-pulse',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colors[severity] || colors[ThreatSeverity.LOW]}`}>
      {severity}
    </span>
  );
};
