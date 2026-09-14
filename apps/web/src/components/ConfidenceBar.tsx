import React from 'react';

export const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
  let colorClass = 'bg-threat-low';
  if (confidence >= 85) colorClass = 'bg-threat-critical';
  else if (confidence >= 70) colorClass = 'bg-threat-high';
  else if (confidence >= 40) colorClass = 'bg-threat-med';

  return (
    <div className="flex items-center space-x-2">
      <div
        className="flex-1 h-2 bg-threat-border rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={confidence}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence score"
      >
        <div className={`h-full ${colorClass}`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{confidence}%</span>
    </div>
  );
};
