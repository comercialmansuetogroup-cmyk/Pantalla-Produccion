
import React, { useMemo } from 'react';
import { TrendBadge } from './TrendBadge';
import { Product, VisualSettings } from '../types';
import { Hash, Boxes, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ClientColumnProps {
  group: {
    name: string;
    products: Product[];
    trend?: number; // Nueva propiedad de tendencia global del cliente
  };
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const ClientColumn: React.FC<ClientColumnProps> = ({ group, darkMode, settings, highlightedCode }) => {
  const totalQty = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.qty), 0), [group.products]);
  const totalStock = useMemo(() => group.products.reduce((acc, p) => acc + Number(p.stock), 0), [group.products]);
  const totalPending = useMemo(() => group.products.reduce((acc, p) => acc + Math.max(0, p.qty - p.stock), 0), [group.products]);
  
  const activeProducts = useMemo(() => {
    return group.products.filter(p => {
       const lack = p.qty - p.stock;
       return lack > 0;
    });
  }, [group.products]);

  const columns: Product[][] = [];
  for (let i = 0; i < activeProducts.length; i += settings.maxRowsPerCol) {
    columns.push(activeProducts.slice(i, i + settings.maxRowsPerCol));
  }
  
  // LOGICA DINÁMICA DE ANCHO DE COLUMNA SEPARADA
  const isMultiCol = columns.length > 1;
  
  // Seleccionamos el ancho configurado según el tipo de columna
  // Este valor actuará como "Basis" (peso) y como "Min-Width" (tope inferior)
  const calculatedWidth = isMultiCol 
      ? (settings.colWidthMulti || 520) 
      : (settings.colWidthSingle || 340);
  
  // Separación vertical definida por usuario (rowVerticalPadding)
  const verticalPadding = settings.rowVerticalPadding || 8;

  // Grid Numérico Ajustado: [Nombre_Auto, Stock_50, Pendiente_80, Total_70]
  const gridTemplate = "grid-cols-[1fr_50px_80px_70px]";
  
  const trendValue = group.trend || 0;
  const isTrendUp = trendValue > 0;
  const isTrendFlat = Math.abs(trendValue) < 0.1;
  
  // Tamaños Footer
  const footerTotalSize = settings.footerTotalFontSize || 60;
  const footerMetricsLabelSize = settings.footerMetricsFontSize || 11;
  const footerMetricsValueSize = Math.round(footerMetricsLabelSize * 1.3); // El valor es 30% mayor que la etiqueta

  return (
    <section 
        // CAMBIO: Quitamos 'flex-none' para permitir que crezca.
        // Usamos styles inline para controlar el flex-grow y flex-basis con precisión matemática.
        className={`h-full flex flex-col border-r transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0c0e14]' : 'border-slate-300 bg-white'}`}
        style={{ 
            minWidth: `${calculatedWidth}px`,  // Nunca ser más pequeño que lo configurado (para scroll si hace falta)
            flex: `1 1 ${calculatedWidth}px`   // Grow: 1 (ocupa todo el espacio), Shrink: 1, Basis: [Tu Valor] (define la proporción)
        }}
    >
      
      {/* Header Cliente: CENTRADO Y UNIFICADO */}
      <div className={`p-6 border-b flex-none flex flex-col items-center justify-center text-center ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
            {group.name}
          </h2>
          
          {/* Indicador de Tendencia Global del Cliente */}
          <div className={`flex items-center gap-1 font-black tracking-tight px-3 py-1 rounded-full ${
            isTrendFlat 
              ? (darkMode ? 'bg-white/5 text-white/40' : 'bg-slate-200 text-slate-500')
              : (isTrendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')
          }`} style={{ fontSize: `${settings.clientTrendFontSize}px` }}>
             {isTrendFlat ? <Minus size={settings.clientTrendFontSize} /> : (isTrendUp ? <ArrowUp size={settings.clientTrendFontSize} strokeWidth={3} /> : <ArrowDown size={settings.clientTrendFontSize} strokeWidth={3} />)}
             <span>{Math.abs(Math.round(trendValue))}%</span>
          </div>
        </div>
      </div>

      {/* Contenedor de Columnas */}
      <div className="flex-1 flex overflow-x-auto custom-scroll">
        {columns.length === 0 ? (
           <div className="flex-1 flex items-center justify-center flex-col opacity-20 w-full">
              <span className="text-6xl font-black text-slate-500">OK</span>
              <span className="text-sm font-bold uppercase tracking-widest mt-2 text-slate-500">Zona Completada</span>
           </div>
        ) : (
          columns.map((colProducts, colIdx) => (
            <div 
                key={colIdx} 
                // Las columnas internas se reparten el espacio del contenedor padre equitativamente
                className={`flex-1 border-r last:border-r-0 flex flex-col ${darkMode ? 'border-white/5' : 'border-slate-200'}`} 
            >
              
              {/* Cabecera Tabla */}
              <div 
                className={`grid ${gridTemplate} px-3 border-b ${darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-100'}`}
                style={{ paddingTop: `${verticalPadding}px`, paddingBottom: `${verticalPadding}px` }}
               >
                <span className={`text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Referencia</span>
                <span className={`text-right text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Stk</span>
                <span className={`text-right text-[10px] font-black opacity-40 tracking-[0.2em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Pend</span>
                <span className="text-right text-[10px] font-black tracking-[0.2em] uppercase text-red-600">Tot</span>
              </div>
              
              <div className={`flex-1 overflow-y-auto custom-scroll ${darkMode ? 'bg-black/10' : 'bg-white'}`}>
                {colProducts.map((p, pIdx) => {
                  const lack = Math.max(0, p.qty - p.stock);
                  const isHigh = highlightedCode === p.code;

                  const textColorBase = isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-800');
                  const stockColor = isHigh ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600');
                  const pendingColor = isHigh ? 'text-white' : (lack > 0 ? 'text-orange-500' : 'text-green-600');
                  const totalColor = isHigh ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900');
                  
                  const rowBg = isHigh 
                    ? 'bg-green-500 shadow-xl z-20 scale-[1.02] border-green-600' 
                    : (darkMode ? 'border-white/5 hover:bg-white/2' : 'border-slate-100 hover:bg-slate-50');

                  return (
                    // Ajuste dinámico de padding con style
                    <div 
                        key={pIdx} 
                        className={`grid ${gridTemplate} px-3 border-b items-center transition-all duration-500 ease-out ${rowBg}`}
                        style={{ paddingTop: `${verticalPadding}px`, paddingBottom: `${verticalPadding}px` }}
                    >
                      
                      {/* Columna 1: Info Producto - ALINEACIÓN CORREGIDA */}
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center">
                          {/* CAMBIO: Contenedor con ancho fijo para alinear los porcentajes */}
                          <span className={`font-black ${textColorBase} w-[90px] min-w-[90px] inline-block`} style={{ fontSize: `${settings.codeFontSize}px` }}>#{p.code}</span>
                          <div className={isHigh ? 'brightness-0 invert' : ''}>
                             <TrendBadge value={p.trend || 0} darkMode={darkMode} fontSize={settings.trendFontSize} />
                          </div>
                        </div>
                        {/* TRUNCATE + WHITESPACE-NOWRAP: Garantiza 1 sola línea */}
                        <span className={`font-bold opacity-50 uppercase mt-0.5 truncate whitespace-nowrap leading-tight ${isHigh ? 'text-white opacity-80' : (darkMode ? 'text-white' : 'text-slate-500')}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
                          {p.name}
                        </span>
                      </div>
                      
                      <div className={`text-right font-bold tabular-nums text-sm ${stockColor}`}>{p.stock}</div>
                      
                      <div className={`text-right font-black tabular-nums tracking-tighter text-2xl transition-transform duration-300 origin-right ${pendingColor} ${isHigh ? 'scale-125' : 'scale-100'}`}>
                        {lack}
                      </div>
                      
                      <div className={`text-right font-black text-3xl tracking-tighter tabular-nums leading-none ${totalColor}`}>
                        {p.qty}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totales */}
      <div className={`p-6 border-t flex-none ${darkMode ? 'border-white/10 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
        <div className="grid grid-cols-[1.5fr_1fr] gap-4">
           {/* SECCIÓN TOTAL */}
           <div className="space-y-2">
              <p className={`font-black uppercase tracking-[0.3em] leading-none mb-2 italic ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${Math.max(10, footerTotalSize * 0.2)}px` }}>TOTAL</p>
              <div className="flex items-end gap-3">
                <p className="font-black text-red-600 leading-none tracking-tighter tabular-nums" style={{ fontSize: `${footerTotalSize}px` }}>
                  {totalQty.toLocaleString()}
                </p>
              </div>
           </div>

           {/* SECCIÓN MÉTRICAS */}
           <div className={`grid grid-cols-1 gap-y-2 border-l pl-4 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash size={footerMetricsLabelSize} className="text-red-600 opacity-70" />
                  <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`} style={{ fontSize: `${footerMetricsLabelSize}px` }}>
                    PRODUCTOS
                  </span>
                </div>
                <span className={`font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: `${footerMetricsValueSize}px` }}>{group.products.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                  <Boxes size={footerMetricsLabelSize} className="text-blue-500 opacity-70" />
                  <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`} style={{ fontSize: `${footerMetricsLabelSize}px` }}>
                    STOCK BODEGA
                  </span>
                </div>
                <span className="font-black text-blue-500 tabular-nums" style={{ fontSize: `${footerMetricsValueSize}px` }}>{totalStock.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                  <AlertTriangle size={footerMetricsLabelSize} className="text-orange-500 opacity-70" />
                  <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-white/60' : 'text-slate-600'}`} style={{ fontSize: `${footerMetricsLabelSize}px` }}>
                    A PRODUCIR
                  </span>
                </div>
                <span className="font-black text-orange-500 tabular-nums" style={{ fontSize: `${footerMetricsValueSize}px` }}>{totalPending.toLocaleString()}</span>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};
