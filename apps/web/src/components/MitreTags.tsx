import React from 'react';

export const MitreTags: React.FC<{ techniques?: string[] }> = ({ techniques }) => {
  if (!techniques || techniques.length === 0) return <span className="text-threat-muted text-sm">-</span>;

  const visible = techniques.slice(0, 3);
  const hiddenCount = techniques.length - 3;

  return (
    <div className="flex flex-wrap gap-1" title={techniques.join(', ')}>
      {visible.map(t => (
        <span key={t} className="px-2 py-0.5 bg-threat-accent/20 text-threat-accent rounded-full text-xs border border-threat-accent/30">
          {t}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="px-2 py-0.5 bg-threat-border text-threat-muted rounded-full text-xs">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
};
