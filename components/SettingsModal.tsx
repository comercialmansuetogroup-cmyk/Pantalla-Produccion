
import React, { useState, useEffect } from 'react';
import { X, Globe, Clipboard, ArrowRight, Upload, Layout, Settings, Factory, Grid, Type, PanelBottom, Ruler } from 'lucide-react';
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
    if (confirm('⚠️ PELIGRO: ¿Estás seguro de borrar TODOS los datos de la base de datos?\n\nEsta acción es irreversible y reiniciará el dashboard a cero.')) {
      try {
        const response = await fetch('/api/reset', {
          method: 'POST',
        });
        
        if (response.ok) {
           localStorage.clear();
           window.location.reload();
        } else {
           alert('Error al intentar resetear la base de datos.');
        }
      } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
      }
    }
  };

  // Helper para controles de rango
  const RangeControl = ({ label, valueKey, min, max, step = 1, unit = 'px' }: { label: string, valueKey: keyof VisualSettings, min: number, max: number, step?: number, unit?: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</span>
        <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">{localSettings[valueKey]}{unit}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={Number(localSettings[valueKey]) || 0}
        onChange={(e) => updateSetting(valueKey, Number(e.target.value))}
        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600 hover:accent-red-500 transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-6xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col h-[95vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600 flex-none shadow-lg z-10">
          <div className="flex items-center gap-4 text-white">
            <div className="p-2 bg-white/10 rounded-lg">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight leading-none">Configuración Maestra</h2>
              <p className="text-[10px] font-bold uppercase opacity-70 mt-1">Control Total de Interfaz V4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scroll bg-slate-50/50 dark:bg-black/20">
          
          {/* SECCIÓN 1: IDENTIDAD VISUAL */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Upload size={14} className="text-red-600" /> Identidad Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center overflow-hidden p-1">
                  {localSettings.logoLight ? <img src={localSettings.logoLight} className="w-full h-full object-contain" /> : <Factory className="text-slate-300" />}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500">Logo Modo Claro</p>
                  <label className="block w-full cursor-pointer py-2 px-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-center font-bold text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors">
                    Cambiar Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
                </div>
              </div>
              <div className="p-4 bg-slate-950 dark:bg-slate-900 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-xl border border-dashed border-slate-700 flex items-center justify-center overflow-hidden p-1">
                  {localSettings.logoDark ? <img src={localSettings.logoDark} className="w-full h-full object-contain" /> : <Factory className="text-slate-500" />}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500">Logo Modo Oscuro</p>
                  <label className="block w-full cursor-pointer py-2 px-3 bg-slate-800 text-slate-400 rounded-lg text-center font-bold text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors">
                    Cambiar Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA 1: ESTRUCTURA Y GRID */}
            <div className="space-y-6">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Grid size={14} className="text-red-600" /> Estructura & Grid
               </h3>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                  
                  {/* Display Mode */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modo de Visualización</span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                      {['name', 'code', 'both'].map((m) => (
                        <button
                          key={m}
                          onClick={() => updateSetting('displayMode', m)}
                          className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase transition-all ${localSettings.displayMode === m ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {m === 'name' ? 'Nombre' : m === 'code' ? 'Código' : 'Ambos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <RangeControl label="Filas por Columna" valueKey="maxRowsPerCol" min={5} max={50} unit="" />
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler size={12} className="text-red-500" />
                      <span className="text-[10px] font-bold uppercase text-red-500">Dimensiones Físicas</span>
                    </div>
                    <RangeControl label="Ancho Columna Simple (Pingüino)" valueKey="colWidthSingle" min={200} max={600} step={10} />
                    <RangeControl label="Ancho Columna Múltiple (GC)" valueKey="colWidthMulti" min={300} max={1000} step={10} />
                    <RangeControl label="Padding Vertical Fila" valueKey="rowVerticalPadding" min={0} max={30} step={1} />
                  </div>
               </div>
            </div>

            {/* COLUMNA 2: TIPOGRAFÍAS */}
            <div className="space-y-6">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Type size={14} className="text-red-600" /> Tipografías
               </h3>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Layout size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold uppercase text-slate-400">Cabeceras Cliente</span>
                    </div>
                    <RangeControl label="Tamaño Nombre Cliente" valueKey="clientNameFontSize" min={16} max={80} />
                    <RangeControl label="Tamaño Tendencia Cliente" valueKey="clientTrendFontSize" min={10} max={40} />
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-6">
                     <div className="flex items-center gap-2 mb-2">
                        <Layout size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase text-slate-400">Listado Productos</span>
                     </div>
                     <RangeControl label="Tamaño Código" valueKey="codeFontSize" min={10} max={40} />
                     <RangeControl label="Tamaño Nombre" valueKey="nameFontSize" min={8} max={24} />
                     <RangeControl label="Tamaño Badge Tendencia" valueKey="trendFontSize" min={8} max={20} />
                  </div>
               </div>
            </div>

            {/* COLUMNA 3: PIE DE PÁGINA Y EXTRAS */}
            <div className="space-y-6">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <PanelBottom size={14} className="text-red-600" /> Pie de Página (Totales)
               </h3>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                  <RangeControl label="Tamaño Número TOTAL (Rojo)" valueKey="footerTotalFontSize" min={20} max={120} />
                  <RangeControl label="Tamaño Etiquetas Métricas" valueKey="footerMetricsFontSize" min={8} max={20} />
               </div>

               <div className="pt-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                    <Globe size={14} className="text-red-600" /> Conexión
                  </h3>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500">Webhook URL</span>
                        <button onClick={() => copyToClipboard(webhookUrl)} className="text-[10px] font-bold text-red-600 hover:underline">COPIAR</button>
                     </div>
                     <div className="text-[9px] font-mono text-slate-400 truncate select-all">{webhookUrl}</div>
                     <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500">Auth Token</span>
                        <button onClick={() => copyToClipboard(authToken)} className="text-[10px] font-bold text-red-600 hover:underline">COPIAR</button>
                     </div>
                     <div className="text-[9px] font-mono text-slate-400 truncate select-all">{authToken}</div>
                  </div>
               </div>
            </div>
          </div>

          {/* Reset Zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
             <div className="flex items-center gap-2 text-slate-400">
                <ArrowRight size={14} />
                <span className="text-[10px] font-bold uppercase">Los cambios se aplican automáticamente en tiempo real.</span>
             </div>
             <button onClick={handleFactoryReset} className="px-6 py-2 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">
                Resetear Fábrica
             </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-none z-10">
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:shadow-2xl hover:scale-[1.005] transition-all"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
