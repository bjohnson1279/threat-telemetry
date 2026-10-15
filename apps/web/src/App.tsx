import { StatsCards } from './components/StatsCards';
import { IndicatorTable } from './components/IndicatorTable';

function App() {
  return (
    <div className="min-h-screen p-6 max-w-[1920px] mx-auto flex flex-col relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-threat-accent text-white rounded font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-threat-bg focus:ring-threat-accent"
      >
        Skip to main content
      </a>

      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-4xl" aria-hidden="true">🛡️</div>
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

      <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
        <StatsCards />
        <div className="flex-1 min-h-[500px]">
          <IndicatorTable />
        </div>
      </main>
    </div>
  );
}

export default App;
