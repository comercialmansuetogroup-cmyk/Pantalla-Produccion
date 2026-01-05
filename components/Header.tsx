
import React from 'react';
import { Layout, BarChart, Settings, Sun, Moon } from 'lucide-react';
import { VisualSettings } from '../types';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  view: 'live' | 'stats';
  setView: (val: 'live' | 'stats') => void;
  onSettings: () => void;
  total: number;
  settings: VisualSettings;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode, view, setView, onSettings, total, settings }) => {
  // Selección del logo basada en el modo
  const logo = darkMode ? settings.logoDark : settings.logoLight;

  return (
    <header className={`flex-none h-24 flex items-center justify-between px-8 border-b z-[100] transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#080a0f]' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-8 h-full">
        <div className="flex items-center">
          {logo ? (
            <img src={logo} className="h-20 object-contain max-w-[320px] w-auto transition-all" alt="Company Logo" />
          ) : (
            <div className={`font-black text-5xl tracking-tighter italic select-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AN<span className="text-red-600">SUETO</span>
            </div>
          )}
        </div>
        <div className={`h-12 w-px hidden 2xl:block ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
        <div className="hidden 2xl:block">
          <h1 className={`text-sm font-black uppercase tracking-[0.3em] leading-none ${darkMode ? 'text-white/90' : 'text-slate-900'}`}>Sistema de Control</h1>
          <span className="text-[10px] font-bold opacity-30 tracking-[0.5em] uppercase mt-1 block text-red-600">Real-Time V20</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className={`flex p-1 border rounded-sm ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
          <button 
            onClick={() => setView('live')} 
            className={`px-6 py-2.5 text-[11px] font-black uppercase transition-all flex items-center gap-2 ${view === 'live' ? 'bg-red-600 text-white' : (darkMode ? 'opacity-40 hover:opacity-100 text-white' : 'opacity-40 hover:opacity-100 text-slate-900')}`}
          >
            <Layout size={14} /> PEDIDOS
          </button>
          <button 
            onClick={() => setView('stats')} 
            className={`px-6 py-2.5 text-[11px] font-black uppercase transition-all flex items-center gap-2 ${view === 'stats' ? 'bg-red-600 text-white' : (darkMode ? 'opacity-40 hover:opacity-100 text-white' : 'opacity-40 hover:opacity-100 text-slate-900')}`}
          >
            <BarChart size={14} /> ANALÍTICA
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className={`text-[11px] font-black opacity-40 uppercase tracking-[0.3em] ${darkMode ? 'text-white' : 'text-slate-900'}`}>Producción Global</span>
          <span className="text-6xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
            {total.toLocaleString()}
          </span>
        </div>

        <div className={`flex items-center gap-2 pl-6 border-l ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <button onClick={onSettings} className={`p-3 border hover:bg-opacity-10 transition-colors ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-900'}`}>
            <Settings size={20} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-3 border hover:bg-opacity-10 transition-colors ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-900'}`}>
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};
