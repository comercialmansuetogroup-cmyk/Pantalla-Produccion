
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('factory_settings_v20');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const raw = await res.json();
      
      const groups: Record<string, any> = {};

      if (Array.isArray(raw)) {
        raw.forEach((row: any) => {
          const rawCode = String(row.agent_code ?? '').trim();
          const clientName = CLIENT_MAPPING[rawCode] || row.agent_name || `ZONA ${rawCode}`;
          
          if (!groups[clientName]) {
            groups[clientName] = { name: clientName, products: [] };
          }
          
          groups[clientName].products.push({
            code: row.product_code,
            name: row.product_name,
            qty: Number(row.total_qty),
            stock: Number(row.global_stock)
          });
        });
      }

      const sorted = Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      });

      setData(sorted);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        fetchData();
        if (msg.code && msg.code !== 'RESET') {
          setHighlightedCode(msg.code);
          setTimeout(() => setHighlightedCode(null), 3500);
        }
      } catch(err) {}
    };

    const interval = setInterval(fetchData, 15000);
    return () => { es.close(); clearInterval(interval); };
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#080a0f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} setDarkMode={setDarkMode} 
        view={view} setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal} settings={settings}
      />
      <main className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-0 w-full bg-red-600 text-white p-2 text-center text-[10px] font-black uppercase z-50">
            Error de conexión: {error}
          </div>
        )}

        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll px-2 py-4">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40">
                <RefreshCw size={48} className="animate-spin text-red-600" />
                <span className="font-black text-xl uppercase italic tracking-widest">Sincronizando...</span>
              </div>
            ) : data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-20">
                <span className="font-black text-4xl uppercase italic tracking-widest text-center">Esperando pedidos<br/>de hoy</span>
                <p className="text-xs font-bold uppercase tracking-widest">Ejecuta el escenario de Make para comenzar</p>
              </div>
            ) : (
              data.map((client) => (
                <ClientColumn 
                  key={client.name} 
                  group={client} 
                  darkMode={darkMode} 
                  settings={settings} 
                  highlightedCode={highlightedCode} 
                />
              ))
            )}
          </div>
        ) : <StatsDashboard darkMode={darkMode} data={data} />}
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        visualSettings={settings} 
        onSaveSettings={(s) => { setSettings(s); localStorage.setItem('factory_settings_v20', JSON.stringify(s)); }} 
      />
    </div>
  );
}
