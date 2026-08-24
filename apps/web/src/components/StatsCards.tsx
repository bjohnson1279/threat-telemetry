import React from 'react';
import { useStats } from '../hooks/useStats';

export const StatsCards: React.FC = () => {
  const { stats, loading } = useStats();

  if (loading && !stats) {
    return <div className="animate-pulse flex space-x-4 h-24 bg-threat-surface rounded-lg"></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card title="Total Indicators" value={stats?.total || 0} icon="🛡️" color="text-threat-accent" />
      <Card title="Critical" value={stats?.critical || 0} icon="⚠️" color="text-threat-critical" />
      <Card title="High" value={stats?.high || 0} icon="🔥" color="text-threat-high" />
      <Card title="Avg Confidence" value={`${stats?.avgConfidence ? Math.round(stats.avgConfidence) : 0}%`} icon="🎯" color="text-threat-low" />
      <Card title="Active MITRE" value={stats?.activeMitreTechniques || 0} icon="🕸️" color="text-threat-med" />
    </div>
  );
};

const Card = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
  <div className="bg-threat-surface border border-threat-border rounded-lg p-4 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-threat-muted text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
    <div className="text-3xl opacity-80">{icon}</div>
  </div>
);
