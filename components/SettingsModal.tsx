
import React, { useState, useEffect } from 'react';
import { X, Globe, Clipboard, ArrowRight, Upload, Layout, Settings, Factory, Grid, Type, PanelBottom, Ruler, Trash2 } from 'lucide-react';
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

  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = 'DASHBOARD_V4_KEY_2026';

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

  const handleFactoryReset = async () => {
    if (confirm('⚠️ PELIGRO CRÍTICO\n\n¿Estás seguro de borrar TODOS los datos de la base de datos?\n\nEsta acción eliminará todo el historial de pedidos e inventario de forma irreversible.')) {
      try {
        const response = await fetch('/api/reset', { method: 'POST' });
        if (response.ok) {
           localStorage.clear();
           window.location.reload();
        } else {
           alert('Error al intentar resetear la base de datos.');
        }
      } catch (error) {
        alert('Error de conexión con el servidor.');
      }
    }
  };

  // Helper para controles deslizantes estilizados
  const RangeControl = ({ label, valueKey, min, max, step = 1, unit = 'px' }: { label: string, valueKey: keyof VisualSettings, min: number, max: number, step?: number, unit?: string }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{label}</span>
        <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{localSettings[valueKey]}{unit}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={Number(localSettings[valueKey]) || 0}
        onChange={(e) => updateSetting(valueKey, Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:accent-red-500 transition-all"
      />
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 right-0 w-[420px] bg-[#0f111a] border-l border-slate-800 shadow-2xl z-[200] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header Fijo */}
        <div className="px-6 py-6 border-b border-slate-800 bg-[#0f111a] flex justify-between items-center flex-none">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Configuración</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Panel de Control V4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8">
          
          {/* SECCIÓN: IDENTIDAD VISUAL */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2 mb-4">
              <Upload size={12} /> Logotipos
            </h3>
            <div className="grid grid-cols-2 gap-3">
               {/* Logo Light */}
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="h-20 bg-white rounded-lg border border-slate-700 flex items-center justify-center p-2 overflow-hidden">
                     {localSettings.logoLight ? <img src={localSettings.logoLight} className="max-h-full max-w-full object-contain" /> : <span className="text-[9px] text-slate-400 font-bold">VACÍO</span>}
                  </div>
                  <label className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black uppercase text-center rounded cursor-pointer transition-colors">
                     Modo Claro
                     <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
               </div>
               {/* Logo Dark */}
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="h-20 bg-[#080a0f] rounded-lg border border-slate-700 flex items-center justify-center p-2 overflow-hidden">
                     {localSettings.logoDark ? <img src={localSettings.logoDark} className="max-h-full max-w-full object-contain" /> : <span className="text-[9px] text-slate-600 font-bold">VACÍO</span>}
                  </div>
                  <label className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black uppercase text-center rounded cursor-pointer transition-colors">
                     Modo Oscuro
                     <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
               </div>
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* SECCIÓN: ESTRUCTURA */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
              <Grid size={12} /> Grid & Estructura
            </h3>
            
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-6">
               <div className="space-y-2">
                 <span className="text-[10px] font-bold uppercase text-slate-400">Modo Visualización</span>
                 <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {['name', 'code', 'both'].map((m) => (
                      <button
                        key={m}
                        onClick={() => updateSetting('displayMode', m)}
                        className={`py-1.5 px-1 rounded text-[9px] font-black uppercase transition-all ${localSettings.displayMode === m ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {m === 'name' ? 'Nombre' : m === 'code' ? 'Código' : 'Ambos'}
                      </button>
                    ))}
                 </div>
               </div>

               <RangeControl label="Filas Máximas por Columna" valueKey="maxRowsPerCol" min={5} max={60} unit="" />
               <RangeControl label="Padding Vertical (Filas)" valueKey="rowVerticalPadding" min={0} max={30} step={1} />
               
               <div className="pt-2 border-t border-slate-800 mt-2">
                 <p className="text-[9px] font-black text-slate-500 uppercase mb-4 mt-2">Dimensiones de Tarjeta</p>
                 <div className="space-y-4">
                    <RangeControl label="Ancho Columna Simple" valueKey="colWidthSingle" min={200} max={600} step={10} />
                    <RangeControl label="Ancho Columna Múltiple" valueKey="colWidthMulti" min={300} max={1000} step={10} />
                 </div>
               </div>
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* SECCIÓN: TIPOGRAFÍA */}
          <section className="space-y-6">
             <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                <Type size={12} /> Tipografías
             </h3>
             <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-5">
                <RangeControl label="Nombre Cliente (Cabecera)" valueKey="clientNameFontSize" min={20} max={100} />
                <RangeControl label="Tendencia Cliente (%)" valueKey="clientTrendFontSize" min={10} max={40} />
                
                <div className="h-px bg-slate-800 my-2"></div>
                
                <RangeControl label="Código Producto" valueKey="codeFontSize" min={10} max={40} />
                <RangeControl label="Nombre Producto" valueKey="nameFontSize" min={8} max={24} />
                <RangeControl label="Tendencia Producto (%)" valueKey="trendFontSize" min={8} max={20} />
             </div>
          </section>

          <hr className="border-slate-800" />

          {/* SECCIÓN: PIE DE PÁGINA */}
          <section className="space-y-6">
             <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                <PanelBottom size={12} /> Pie de Página
             </h3>
             <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-5">
                <RangeControl label="Tamaño Total (Rojo)" valueKey="footerTotalFontSize" min={20} max={120} />
                <RangeControl label="Tamaño Etiquetas Métricas" valueKey="footerMetricsFontSize" min={8} max={20} />
             </div>
          </section>

          <hr className="border-slate-800" />

          {/* SECCIÓN: CONEXIÓN */}
          <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                <Globe size={12} /> Conexión API
              </h3>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase text-slate-500">Webhook URL</span>
                    <button onClick={() => copyToClipboard(webhookUrl)} className="text-[9px] font-bold text-red-500 hover:text-white">COPIAR</button>
                 </div>
                 <div className="text-[9px] font-mono text-slate-600 truncate">{webhookUrl}</div>
              </div>
          </section>

          {/* ZONA DE PELIGRO */}
          <section className="pt-4">
             <button 
                onClick={handleFactoryReset}
                className="w-full py-4 bg-red-900/10 border border-red-900/30 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
             >
                <Trash2 size={14} /> Resetear Base de Datos
             </button>
          </section>

          <div className="h-20"></div> {/* Espacio extra scroll */}
        </div>

        {/* Footer Fixed */}
        <div className="p-4 bg-[#0f111a] border-t border-slate-800 flex-none">
           <button onClick={onClose} className="w-full py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
              Guardar Cambios
           </button>
        </div>

      </div>
    </>
  );
};
