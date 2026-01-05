
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types';
import { PRODUCT_UNITS } from './constants';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
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
      setIsConnecting(true);
      setErrorMsg(null);
      
      // FIX: Añadido { cache: 'no-store' } para evitar datos fantasma tras reset
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      
      const raw = await res.json();
      
      // 1. FASE DE AGREGACIÓN: Sumarizar cantidades (Hoy vs Ayer)
      const groups: Record<string, any> = {};
      const globalStockMap = new Map<string, number>();

      if (Array.isArray(raw)) {
        raw.forEach((row: any) => {
          // Ignorar filas vacías de datos
          if (Number(row.total_qty) === 0 && Number(row.yesterday_qty) === 0 && Number(row.global_stock) === 0) return;

          // Normalizar código
          const rawCode = String(row.agent_code ?? '').trim();
          const pCodeRaw = String(row.product_code ?? '').trim().toUpperCase();
          
          // --- LÓGICA DE CONVERSIÓN DE UNIDADES (PIEZAS) ---
          // Buscamos si el producto tiene un multiplicador definido (Ej: BUR11 -> 30)
          // Si no existe, usamos 1 (mantenemos la cantidad original)
          const multiplier = PRODUCT_UNITS[pCodeRaw] || 1;

          // Mapeo de Cliente (Gran Canaria agrupa 10, 14, 5, 0, 8)
          const clientName = CLIENT_MAPPING[rawCode] || row.agent_name || `ZONA ${rawCode}`;
          
          if (!groups[clientName]) {
            groups[clientName] = { 
              name: clientName, 
              products: [],
              totalToday: 0,
              totalYesterday: 0
            };
          }
          
          // Guardar Stock Global (También aplicamos multiplicador al stock si se cuenta en cajas pero queremos ver piezas)
          // Asumimos que el scanner lee códigos de barras de la caja (bulto)
          const stockRaw = Number(row.global_stock);
          const stockPieces = stockRaw * multiplier;
          globalStockMap.set(row.product_code, stockPieces);

          // Cantidades Multiplicadas
          const qtyToday = Number(row.total_qty) * multiplier;
          const qtyYesterday = Number(row.yesterday_qty) * multiplier;

          // Buscar si el producto ya existe en este cliente (para agrupar códigos de agente)
          const existingProd = groups[clientName].products.find((p: any) => p.code === row.product_code);
          
          if (existingProd) {
             // SUMA SIMPLE
             existingProd.qty += qtyToday;
             existingProd.yesterdayQty += qtyYesterday;
          } else {
            // NUEVO PRODUCTO
            groups[clientName].products.push({
              code: row.product_code,
              name: row.product_name,
              qty: qtyToday,
              yesterdayQty: qtyYesterday, 
              stock: 0, 
              trend: 0 // Se calculará en la Fase 2
            });
          }

          // Acumuladores Totales del Cliente
          groups[clientName].totalToday += qtyToday;
          groups[clientName].totalYesterday += qtyYesterday;
        });
      }

      // 2. FASE DE CÁLCULO: Porcentajes y Stock
      const sortedClients = Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      });

      sortedClients.forEach(client => {
         // A) CÁLCULO TENDENCIA GLOBAL DEL CLIENTE
         let clientTrend = 0;
         if (client.totalYesterday > 0) {
            // Fórmula: ((Actual - Anterior) / Anterior) * 100
            clientTrend = ((client.totalToday - client.totalYesterday) / client.totalYesterday) * 100;
         } else if (client.totalToday > 0) {
            clientTrend = 100; // Crecimiento infinito (Nuevo ingreso)
         }
         client.trend = clientTrend;

         // B) CÁLCULO TENDENCIA POR PRODUCTO Y STOCK
         client.products.forEach((p: any) => {
             // Tendencia de Línea
             let prodTrend = 0;
             if (p.yesterdayQty > 0) {
                prodTrend = ((p.qty - p.yesterdayQty) / p.yesterdayQty) * 100;
             } else if (p.qty > 0) {
                prodTrend = 100;
             }
             p.trend = prodTrend;

             // Algoritmo de Consumo de Stock
             const available = globalStockMap.get(p.code) || 0;
             const needed = p.qty;
             const assigned = Math.min(needed, available);
             
             p.stock = assigned; 
             globalStockMap.set(p.code, Math.max(0, available - assigned));
         });
         
         // Ordenar productos por cantidad descendente
         client.products.sort((a: any, b: any) => b.qty - a.qty);
      });

      // 3. FILTRADO FINAL (Solo clientes con actividad hoy)
      const activeClientsToday = sortedClients.filter(c => c.totalToday > 0);

      setData(activeClientsToday);

    } catch (e: any) { 
      console.warn('Connection failed:', e);
      setErrorMsg(e.message || 'Connection Error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;
    
    const connectSSE = () => {
      if (es) es.close();
      es = new EventSource('/api/events');
      
      es.onopen = () => {
        setErrorMsg(null);
      };

      es.onmessage = (e) => {
        if (e.data === ':' || e.data.trim() === '') return;
        
        const rawData = e.data?.trim();
        if (!rawData) return;
        
        try {
          const msg = JSON.parse(rawData);
          // Si recibimos evento, refrescamos datos
          fetchData();
          
          if (msg.code) {
            setHighlightedCode(msg.code);
            setTimeout(() => setHighlightedCode(null), 3000);
          }
        } catch(err) {}
      };

      es.onerror = (err) => {
        es?.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    
    const interval = setInterval(fetchData, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#080a0f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal}
        settings={settings}
      />

      <main className="flex-1 relative overflow-hidden">
        {errorMsg && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase text-center py-1 z-50">
             {errorMsg} - Retrying...
          </div>
        )}

        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-20 font-black text-slate-500">
                <p className="text-4xl uppercase tracking-[0.5em] italic">
                   {isConnecting ? 'SINCRONIZANDO...' : 'ESPERANDO DATOS...'}
                </p>
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
        ) : (
          <StatsDashboard darkMode={darkMode} data={data} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        visualSettings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          localStorage.setItem('factory_settings_v20', JSON.stringify(s));
        }}
      />
    </div>
  );
}
