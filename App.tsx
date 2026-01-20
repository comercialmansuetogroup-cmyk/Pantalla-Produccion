
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(false);
  const [data, setData] = useState<any[]>([]);
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
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchData();
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        fetchData(); // Refrescar datos ante cualquier cambio
        if (msg.code) {
          setHighlightedCode(msg.code);
          setTimeout(() => setHighlightedCode(null), 3000);
        }
      } catch(err) {}
    };
    const interval = setInterval(fetchData, 60000);
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
        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll px-2">
            {data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-20 font-black text-4xl italic uppercase tracking-widest">Sincronizando...</div>
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
