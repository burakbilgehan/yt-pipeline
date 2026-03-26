import { ThemeProvider } from './theme-context';
import { ControlPanel } from './panels/ControlPanel';
import { PreviewGrid } from './previews/PreviewGrid';

function App() {
  return (
    <ThemeProvider>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: '#0f0e17',
          color: '#e8e0d4',
        }}
      >
        {/* Left sidebar — control panel */}
        <aside
          style={{
            width: 340,
            minWidth: 340,
            height: '100vh',
            overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            background: '#16141f',
          }}
        >
          <ControlPanel />
        </aside>

        {/* Main area — preview grid */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
          }}
        >
          <PreviewGrid />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
