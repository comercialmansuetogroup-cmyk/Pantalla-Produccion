import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { VisualSettings, Product } from '../types';
import { TrendBadge } from './TrendBadge';

interface ProductRowProps {
    p: Product;
    settings: VisualSettings;
    darkMode: boolean;
    isHighlighted: boolean;
}

export const ProductRow: React.FC<ProductRowProps> = ({ p, settings, darkMode, isHighlighted }) => {
  const showName = settings.displayMode === 'name' || settings.displayMode === 'both';
  const showCode = settings.displayMode === 'code' || settings.displayMode === 'both';
  const stockClass = p.stock > 0 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-600 dark:text-slate-600';

  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
     if (p.toProduce <= 0) {
         setIsExiting(true);
     }
  }, [p.toProduce]);

  const rowBaseClass = `flex items-center justify-between py-2 px-4 border-b group transition-all duration-500 gap-x-2`;
  const bgClass = isHighlighted 
    ? (darkMode ? 'bg-green-500/20' : 'bg-green-100') 
    : (isExiting ? (darkMode ? 'bg-green-900/40 opacity-50' : 'bg-green-50 opacity-50') : (darkMode ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'));
  
  const textFlashClass = isHighlighted ? 'scale-[1.02]' : '';

  return (
    <div className={`${rowBaseClass} ${bgClass} ${textFlashClass}`}>
      <div className="flex-1 min-w-0 flex items-center gap-2 pr-2">
        <div className="flex flex-col min-w-0">
          {showCode && (
            <div className="flex items-center gap-2 mb-0.5">
               <span className={`font-black leading-none truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.codeFontSize}px` }}>
                #{p.code}
              </span>
              <TrendBadge value={p.trend} darkMode={darkMode} fontSize={settings.trendFontSize} />
            </div>
          )}
          {showName && (
            <span className={`font-bold transition-colors uppercase truncate leading-none ${settings.displayMode === 'both' ? 'text-slate-500 group-hover:text-red-400' : (darkMode ? 'text-slate-400' : 'text-slate-500') + ' group-hover:text-red-500'}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
              {p.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-[180px] xl:w-[220px] text-right items-center">
        <div className={`font-bold tabular-nums text-sm ${stockClass} transition-all ${isHighlighted ? 'text-green-500 scale-110' : ''}`}>
           {p.stock.toLocaleString('es-ES')}
        </div>
        <div className={`font-black tabular-nums text-sm transition-all ${p.toProduce > 0 ? 'text-orange-500' : 'text-green-500'} ${isHighlighted ? 'scale-125' : ''}`}>
           {p.toProduce <= 0 ? (
             <span className="flex items-center justify-end gap-1"><Package size={12} /> OK</span>
           ) : p.toProduce.toLocaleString('es-ES')}
        </div>
        <div className={`text-xl font-black tabular-nums group-hover:text-red-600 transition-all leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {p.qty.toLocaleString('es-ES')}
        </div>
      </div>
    </div>
  );
};