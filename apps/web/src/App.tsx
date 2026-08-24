import React from 'react';
import { StatsCards } from './components/StatsCards';
import { IndicatorTable } from './components/IndicatorTable';

function App() {
  return (
    <div className="min-h-screen p-6 max-w-[1920px] mx-auto flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">🛡️</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Threat Telemetry Gateway</h1>
            <p className="text-threat-muted text-sm mt-1">Real-time IOC monitoring and AI-driven enrichment</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 bg-threat-low/10 text-threat-low border border-threat-low/30 rounded-full text-xs font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-threat-low mr-2 animate-pulse"></span>
            System Online
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <StatsCards />
        <div className="flex-1 min-h-[500px]">
          <IndicatorTable />
        </div>
      </main>
    </div>
  );
}

export default App;
