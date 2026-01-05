
import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
    value: number;
    darkMode: boolean;
    fontSize: number;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ value, darkMode, fontSize }) => {
  // Ajuste visual: Reducimos ligeramente el tamaño real respecto al prop recibido para que no compita con el código
  const adjustedSize = Math.max(9, fontSize * 0.85);

  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center gap-0.5 font-bold text-slate-500/30 select-none" style={{ fontSize: `${adjustedSize}px` }}>
        <Minus size={adjustedSize} strokeWidth={4} /> 0%
      </div>
    );
  }
  
  const isUp = value > 0;
  
  return (
    <div className={`flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded-sm border select-none leading-none ${
      isUp 
        ? 'text-green-500 bg-green-500/10 border-green-500/20' 
        : 'text-red-500 bg-red-500/10 border-red-500/20'
    }`} style={{ fontSize: `${adjustedSize}px` }}>
      {isUp ? <ArrowUp size={adjustedSize} strokeWidth={4} /> : <ArrowDown size={adjustedSize} strokeWidth={4} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};
