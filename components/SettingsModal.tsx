
import React, { useState, useEffect } from 'react';
import { X, Upload, Settings as SettingsIcon, Type, Layout, TrendingUp, Image, MoveHorizontal, ArrowUpDown, Columns, RectangleHorizontal, PanelBottom, Trash2, Globe, Clipboard } from 'lucide-react';
import { VisualSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);

  useEffect(() => {
    setLocalSettings(visualSettings);
  }, [visualSettings, isOpen]);

  if (!isOpen) return null;

  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = 'DASHBOARD_V3_KEY_2025';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
        alert('Formato no válido. Utilice PNG o JPG.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSettings = { ...localSettings, [mode === 'light' ? 'logoLight' : 'logoDark']: reader.result as string };
        setLocalSettings(newSettings);
        onSaveSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  // LÓGICA DE RESET REAL (CONECTADA A SERVIDOR)
  const handleFactoryReset = async () => {
    if (confirm('⚠️ PELIGRO CRÍTICO\n\n¿Estás seguro de borrar TODOS los pedidos e inventario de la base de datos?\n\nEsta acción es irreversible.')) {
      try {
        const response = await fetch('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
           localStorage.clear();
           // Forzar recarga desde el servidor ignorando caché
           window.location.reload();
        } else {
           alert('Error: El servidor no pudo borrar los datos.');
        }
      } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor. Verifica tu internet.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12151c] w-[600px] h-full shadow-2xl border-l border-white/10 flex flex-col p-10 animate-slide-in overflow-hidden">
        
        <div className="flex justify-between items-center mb-8 flex-none border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <SettingsIcon size={28} className="text-red-600" />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Configuración Visual</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-500 transition-colors">
             <X size={32} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scroll">
          
          {/* LOGOS DUALES */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/80">
              <Upload size={18} className="text-red-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Logotipos (PNG/JPG)</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Logo Light Mode */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-red-500 transition-colors">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 text-center">Para Fondo Blanco</p>
                <label className="cursor-pointer block">
                  <div className="h-24 bg-white border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                     {localSettings.logoLight ? (
                        <img src={localSettings.logoLight} className="w-full h-full object-contain p-2" />
                     ) : (
                        <div className="text-center text-slate-300">
                           <Image className="mx-auto mb-1" size={20} />
                           <span className="text-[9px] font-bold">SUBIR</span>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-[10px]">CAMBIAR</div>
                  </div>
                  <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} />
                </label>
              </div>

              {/* Logo Dark Mode */}
              <div className="bg-[#080a0f] p-4 rounded-lg border border-white/10 hover:border-red-500 transition-colors">
                <p className="text-[10px] font-bold text-white/40 uppercase mb-3 text-center">Para Fondo Oscuro</p>
                <label className="cursor-pointer block">
                  <div className="h-24 bg-black/20 border border-dashed border-white/20 flex items-center justify-center overflow-hidden relative group">
                     {localSettings.logoDark ? (
                        <img src={localSettings.logoDark} className="w-full h-full object-contain p-2" />
                     ) : (
                        <div className="text-center text-white/20">
                           <Image className="mx-auto mb-1" size={20} />
                           <span className="text-[9px] font-bold">SUBIR</span>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-[10px]">CAMBIAR</div>
                  </div>
                  <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} />
                </label>
              </div>
            </div>
          </section>

          {/* FUENTES Y TENDENCIAS */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 text-white/80 border-t border-white/5 pt-6">
              <Type size={18} className="text-red-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Tamaños de Fuente (PX)</h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                 {/* Controles Básicos */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase block">Título Cliente</label>
                    <input type="number" value={localSettings.clientNameFontSize} onChange={(e) => updateSetting('clientNameFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase block">Código Producto</label>
                    <input type="number" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase block">Nombre Producto</label>
                    <input type="number" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                 </div>
                 
                 {/* % Clientes y Productos */}
                 <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase block flex items-center gap-2"><TrendingUp size={12}/> % Global Cliente</label>
                        <input type="number" value={localSettings.clientTrendFontSize || 18} onChange={(e) => updateSetting('clientTrendFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase block flex items-center gap-2"><TrendingUp size={12}/> % Por Producto</label>
                        <input type="number" value={localSettings.trendFontSize} onChange={(e) => updateSetting('trendFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                    </div>
                 </div>

                 {/* NUEVA SECCIÓN: PIE DE PÁGINA */}
                 <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-2 col-span-2 mb-2">
                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2"><PanelBottom size={12} /> Pie de Página (Footer)</h4>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase block">Total (Número Grande)</label>
                        <input type="number" value={localSettings.footerTotalFontSize || 60} onChange={(e) => updateSetting('footerTotalFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase block">Métricas (Prod/Stock/Pend)</label>
                        <input type="number" value={localSettings.footerMetricsFontSize || 11} onChange={(e) => updateSetting('footerMetricsFontSize', Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none" />
                    </div>
                 </div>
            </div>
          </section>

          {/* DENSIDAD Y ESTRUCTURA */}
          <section className="space-y-6 pt-6 border-t border-white/5">
             <div className="flex items-center gap-2 text-white/80">
              <Layout size={18} className="text-red-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Estructura Dinámica</h3>
            </div>
            
            {/* 1. Filas por Columna */}
            <div className="bg-white/5 p-4 rounded-lg space-y-3">
               <div className="flex justify-between text-[10px] font-bold text-white/50">
                 <span className="flex items-center gap-2"><Layout size={12}/> Productos por Columna</span>
                 <span className="text-white">{localSettings.maxRowsPerCol}</span>
               </div>
               <input type="range" min="5" max="50" value={localSettings.maxRowsPerCol} onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))} className="w-full accent-red-600 h-2 bg-white/10 rounded-full cursor-pointer" />
            </div>

            {/* 2A. Ancho de Columna SIMPLE */}
            <div className="bg-white/5 p-4 rounded-lg space-y-3">
               <div className="flex justify-between text-[10px] font-bold text-white/50">
                 <span className="flex items-center gap-2"><RectangleHorizontal size={12}/> Ancho Columna Simple (Pingüino, etc)</span>
                 <span className="text-white">{localSettings.colWidthSingle || 340}px</span>
               </div>
               <input type="range" min="250" max="600" step="10" value={localSettings.colWidthSingle || 340} onChange={(e) => updateSetting('colWidthSingle', parseInt(e.target.value))} className="w-full accent-blue-500 h-2 bg-white/10 rounded-full cursor-pointer" />
            </div>

            {/* 2B. Ancho de Columna MULTIPLE */}
            <div className="bg-white/5 p-4 rounded-lg space-y-3 border border-white/5">
               <div className="flex justify-between text-[10px] font-bold text-white/50">
                 <span className="flex items-center gap-2 text-blue-400"><Columns size={12}/> Ancho Columna Doble (Gran Canaria)</span>
                 <span className="text-white">{localSettings.colWidthMulti || 520}px</span>
               </div>
               <input type="range" min="400" max="1000" step="10" value={localSettings.colWidthMulti || 520} onChange={(e) => updateSetting('colWidthMulti', parseInt(e.target.value))} className="w-full accent-blue-400 h-2 bg-white/10 rounded-full cursor-pointer" />
            </div>

             {/* 3. Espaciado Vertical */}
             <div className="bg-white/5 p-4 rounded-lg space-y-3">
               <div className="flex justify-between text-[10px] font-bold text-white/50">
                 <span className="flex items-center gap-2"><ArrowUpDown size={12}/> Sangría / Separación Filas (PX)</span>
                 <span className="text-white">{localSettings.rowVerticalPadding || 8}px</span>
               </div>
               <input type="range" min="2" max="30" step="1" value={localSettings.rowVerticalPadding || 8} onChange={(e) => updateSetting('rowVerticalPadding', parseInt(e.target.value))} className="w-full accent-orange-500 h-2 bg-white/10 rounded-full cursor-pointer" />
            </div>

          </section>

          {/* SECCIÓN 3: CONEXIÓN MAKE (EXISTENTE) */}
          <section className="space-y-6 pt-6 border-t border-white/5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Globe size={16} className="text-red-600" /> Conexión HTTP (Make)
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">Endpoint URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-black/20 rounded-xl font-mono text-[10px] text-red-600 truncate font-bold border border-white/5">
                    {webhookUrl}
                  </code>
                  <button onClick={() => copyToClipboard(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-4 pb-4">
             <button onClick={handleFactoryReset} className="group w-full py-4 bg-red-900/10 text-red-500 border border-red-900/20 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all rounded-xl flex items-center justify-center gap-3">
                <Trash2 size={16} className="group-hover:animate-bounce" /> ELIMINAR BASE DE DATOS (FACTORY RESET)
             </button>
          </div>
        </div>

        <div className="mt-8 flex-none pt-6 border-t border-white/10">
           <button onClick={onClose} className="w-full py-5 bg-red-600 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-white hover:text-red-600 transition-all shadow-lg rounded-sm">
             Guardar Configuración
           </button>
        </div>
      </div>
    </div>
  );
};
