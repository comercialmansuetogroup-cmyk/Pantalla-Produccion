
import { IncomingDataPayload } from './types';

// Client Mapping based on Agent Codes
// Sincronizado V3: 27 Pingüino, 26 Tenerife Sur. GC: 10,14,5,0,8
export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO',
  '27': 'PINGÜINO',
  '26': 'TENERIFE SUR',
  '23': 'LA PALMA',
  '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA', '05': 'GRAN CANARIA',
  '0': 'GRAN CANARIA', '00': 'GRAN CANARIA',
  '8': 'GRAN CANARIA', '08': 'GRAN CANARIA'
};

// Colors for charts
export const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#4b5563', '#1f2937'];

// Mock Data Generator to simulate Make webhook
export const generateMockData = (): IncomingDataPayload => {
  const productNames = [
    'Coca Cola Zero 33cl',
    'Fanta Naranja 33cl',
    'Agua Mineral 1.5L',
    'Cerveza Especial',
    'Zumo Piña',
    'Nestea Limón',
    'Aquarius',
    'Monster Energy'
  ];

  // Updated mock codes to test new mapping
  const agentCodes = ['24', '27', '26', '23', '15', '10', '14', '5', '0', '8'];

  const zones = Array.from({ length: 20 }).map(() => {
    const randomProduct = productNames[Math.floor(Math.random() * productNames.length)];
    const randomAgent = agentCodes[Math.floor(Math.random() * agentCodes.length)];
    
    return {
      nombre: randomProduct,
      codigo_agente: randomAgent,
      nombre_agente: 'Agent Name Placeholder',
      productos: [
        {
          codigo: `P-${Math.floor(Math.random() * 1000)}`,
          cantidad: Math.floor(Math.random() * 50) + 1
        },
        {
            codigo: `P-${Math.floor(Math.random() * 1000)}`,
            cantidad: Math.floor(Math.random() * 10)
        }
      ]
    };
  });

  return { zonas: zones };
};
