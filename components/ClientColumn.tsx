
import React, { useMemo } from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';

interface ClientColumnProps {
  group: {
    name: string;
    products: Product[];
    trend?: number; 
  };
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.qty), 0), [group.products]);
  
  const columns: Product[][] = [];
  for (let i = 0; i < group.products.length; i += settings.maxRowsPerCol) {
    columns.push(group.products.slice(i, i + settings.maxRowsPerCol));
  }
  
  const calculatedWidth = columns.length > 1 ? (settings.colWidthMulti || 520) : (settings.colWidthSingle || 340);
  const gridTemplate = "grid-cols-[1fr_60px_60px_80px]";

  // Filtros de visualización según Settings
  const showCode = settings.displayMode === 'code' || settings.displayMode === 'both';
  const showName = settings.displayMode === 'name' || settings.displayMode === 'both';
  
  return (
    <section 
        className={`h-full flex flex-col border-r transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0c0e14]' : 'border-slate-300 bg-white'}`}
        style={{ minWidth: `${calculatedWidth}px`, flex: `1 1 ${calculatedWidth}px` }}
    >
      {/* CABECERA CLIENTE */}
      <div className={`p-6 border-b flex-none flex flex-col items-center text-center ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
        <h2 className={`font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
          {group.name}
        </h2>
      </div>

      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className={`flex-1 border-r last:border-r-0 flex flex-col ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
            <div className={`grid ${gridTemplate} px-4 border-b gap-2 py-2 ${darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-50'}`}>
              <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">PRODUCTO</span>
              <span className="text-right text-[9px] font-black opacity-30 uppercase tracking-widest">STOCK</span>
              <span className="text-right text-[9px] font-black opacity-30 uppercase tracking-widest">FALTA</span>
              <span className="text-right text-[9px] font-black uppercase text-red-600 tracking-widest">TOTAL</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll">
              {colProducts.map((p, pIdx) => {
                const lack = Math.max(0, p.qty - p.stock);
                const isHigh = highlightedCode === p.code;

                return (
                  <div 
                      key={pIdx} 
                      className={`grid ${gridTemplate} px-4 border-b items-center gap-2 transition-all duration-300 ${isHigh ? 'bg-green-600 text-white z-20 scale-[1.02] shadow-xl' : (darkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50')}`}
                      style={{ paddingTop: `${settings.rowVerticalPadding}px`, paddingBottom: `${settings.rowVerticalPadding}px` }}
                  >
                    <div className="flex flex-col min-w-0 leading-tight">
                       {/* CÓDIGO (ARRIBA - DESTACADO) */}
                       {showCode && (
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase truncate ${isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-800')}`} style={{ fontSize: `${settings.codeFontSize}px` }}>
                            #{p.code}
                          </span>
                          <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                        </div>
                       )}

                       {/* NOMBRE (DEBAJO - SECUNDARIO) */}
                       {showName && (
                        <span className={`font-bold uppercase truncate ${!showCode ? 'mt-0' : 'mt-1'} ${isHigh ? 'text-white/80' : (darkMode ? 'text-white/30' : 'text-slate-400')}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
                           {p.name || 'S/N'}
                        </span>
                       )}
                    </div>
                    
                    <div className={`text-right font-bold text-xs tabular-nums ${isHigh ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`}>
                      {Math.floor(p.stock)}
                    </div>
                    <div className={`text-right font-black text-sm tabular-nums ${isHigh ? 'text-white' : (lack <= 0 ? 'text-green-500' : 'text-orange-500')}`}>
                      {Math.floor(lack)}
                    </div>
                    <div className={`text-right font-black tabular-nums ${isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900')}`} style={{ fontSize: '1.5rem' }}>
                      {Math.floor(p.qty)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={`p-6 border-t flex-none ${darkMode ? 'border-white/10 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
         <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">UNIDADES TOTALES</p>
            <p className="text-6xl font-black text-red-600 tabular-nums tracking-tighter leading-none" style={{ fontSize: `${settings.footerTotalFontSize}px` }}>
               {Math.floor(totalQty).toLocaleString()}
            </p>
         </div>
      </div>
    </section>
  );
};
