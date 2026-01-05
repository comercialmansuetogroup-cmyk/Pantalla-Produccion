
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

// TABLA DE CONVERSIÓN DE UNIDADES (PIEZAS POR FORMATO)
// Se usa para multiplicar la cantidad de bultos por las piezas que contiene.
export const PRODUCT_UNITS: Record<string, number> = {
  'BUR11': 30,  // BURRATA VASO 80GR
  'BUR13': 40,  // BURRATA VASO 60g
  'BUR4': 2,    // BURRATA 125 GR TARRINA 250 GR
  'BUR5': 8,    // BURRATA 125 GR BANDEJA DE 1 KG
  'BUR6': 3,    // BURRATA 100 GR TARRINA 300 GR
  'BUR7': 10,   // BURRATA 100 GR BANDEJA DE 1 KG
  'MOZ28': 8,   // SCAMORZA IN ACQUA 3.4
  'MOZ30': 9,   // MOZZARELLA BOLA SECA
  'MOZ5': 12,   // MOZZARELLA FIORDILATTE BANDEJA 3.2
  'RIC3': 6,    // RICOTTA FRESCA 350 GR
  'MOZ6': 9,    // MOZZARELLA FIORDILATTE BANDEJA 3.8
  'MOH1': 9,    // MOZ FIORDILAT AHUMADA BANDEJA 3.8
  'MOZ8': 10,   // MOZZARELLA FIORDILATTE SECA BANDEJA 4 KG
  'MOH10': 3    // MOZZARELLA FIORDILATTR AHUMADA BANDEJA1.2
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
