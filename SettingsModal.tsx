
import React, { useState, useEffect } from 'react';
import { X, Server, Key, Globe, Clipboard, ArrowRight, Upload, Layout, Type, Layers, Settings, Factory } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600 flex-none">
          <div className="flex items-center gap-4 text-white">
            <Settings size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Panel de Configuración</h2>
              <p className="text-xs font-bold uppercase opacity-80">Gestión Visual y de Datos V4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-12 overflow-y-auto flex-1">
          
          {/* SECCIÓN 1: IDENTIDAD VISUAL (LOGOS) */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Upload size={16} className="text-red-600" /> Identidad Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Logotipo Modo Claro</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                    {localSettings.logoLight ? <img src={localSettings.logoLight} className="w-full h-full object-contain" /> : <Factory className="text-slate-300" />}
                  </div>
                  <label className="flex-1 cursor-pointer py-3 px-4 bg-red-600 text-white rounded-xl text-center font-black text-xs uppercase hover:bg-red-700 transition-colors">
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
                </div>
              </div>
              <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Logotipo Modo Oscuro</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden">
                    {localSettings.logoDark ? <img src={localSettings.logoDark} className="w-full h-full object-contain" /> : <Factory className="text-slate-600" />}
                  </div>
                  <label className="flex-1 cursor-pointer py-3 px-4 bg-red-600 text-white rounded-xl text-center font-black text-xs uppercase hover:bg-red-700 transition-colors">
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: VISUALIZACIÓN DE PRODUCTOS */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Layout size={16} className="text-red-600" /> Estructura de Datos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Modo de Visualización</p>
                <div className="flex flex-col gap-2">
                  {['name', 'code', 'both'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('displayMode', m)}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${localSettings.displayMode === m ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      {m === 'name' ? 'Solo Nombre' : m === 'code' ? 'Solo Código' : 'Código + Nombre'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Max Productos por Columna</p>
                <div className="flex flex-col gap-4">
                  <input 
                    type="range" min="5" max="40" step="1"
                    value={localSettings.maxRowsPerCol}
                    onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))}
                    className="accent-red-600"
                  />
                  <div className="flex justify-between items-center font-black text-xl">
                    <span className="text-red-600">{localSettings.maxRowsPerCol}</span>
                    <span className="text-slate-400 text-xs">FILAS</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Tamaño Tipografía (PX)</p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Nombre</span>
                    <div className="flex items-center gap-3">
                      <input type="number" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                      <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.nameFontSize/32)*100}%` }} /></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Código</span>
                    <div className="flex items-center gap-3">
                      <input type="number" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                      <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.codeFontSize/32)*100}%` }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: CONEXIÓN MAKE (EXISTENTE) */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Globe size={16} className="text-red-600" /> Conexión HTTP (Make)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">Endpoint URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-red-600 truncate font-bold border border-slate-200 dark:border-slate-700">
                    {webhookUrl}
                  </code>
                  <button onClick={() => copyToClipboard(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">Authorization Header</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate font-bold border border-slate-200 dark:border-slate-700">
                    Bearer {authToken}
                  </code>
                  <button onClick={() => copyToClipboard(`Bearer ${authToken}`)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="p-6 bg-red-600/5 border border-red-600/10 rounded-3xl">
             <div className="flex items-center gap-4 text-red-600">
                <ArrowRight size={20} />
                <p className="text-xs font-bold leading-relaxed uppercase tracking-tight">Los cambios visuales se aplican instantáneamente en el dashboard principal. Asegúrate de que los logotipos tengan fondo transparente para un acabado profesional.</p>
             </div>
          </div>
          
          <div className="pt-4">
             <button onClick={handleFactoryReset} className="w-full py-3 bg-white/5 text-white/30 border border-white/5 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all rounded-md">
                Resetear Fábrica
             </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex-none">
          <button 
            onClick={onClose} 
            className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-[1.01] transition-all"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
