
import { CLIENT_MAPPING } from '../constants.ts';

/**
 * Procesa el JSON crudo de Make y agrupa los productos por Cliente.
 */
export const processIncomingData = (data) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) {
    return [];
  }

  const clientMap = new Map();

  data.zonas.forEach((zona) => {
    // 1. Identificar Cliente (Agent Code Mapping)
    // FIX: Usar ?? para que el número 0 no sea tratado como false y pase a string "0"
    const agentCodeRaw = String(zona.codigo_agente ?? '').trim();
    
    // El cliente es la entidad que agrupa varios códigos (Ej: 10, 14, 5, 0, 8 -> Gran Canaria)
    const clientName = CLIENT_MAPPING[agentCodeRaw] || `Zona ${agentCodeRaw}`;
    const mapKey = clientName;

    if (!clientMap.has(mapKey)) {
      clientMap.set(mapKey, {
        clientId: mapKey,
        clientName: clientName,
        products: [],
        grandTotal: 0
      });
    }

    const clientGroup = clientMap.get(mapKey);

    // 2. Calcular total de productos en esta línea
    let entryTotal = 0;
    if (Array.isArray(zona.productos)) {
      entryTotal = zona.productos.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
    }

    // 3. Agrupar por nombre de producto
    const productName = String(zona.nombre || 'Producto').trim();
    const existingProductIndex = clientGroup.products.findIndex(p => p.name === productName);

    if (existingProductIndex >= 0) {
      clientGroup.products[existingProductIndex].totalQuantity += entryTotal;
    } else {
      clientGroup.products.push({
        name: productName,
        totalQuantity: entryTotal
      });
    }

    // 4. Actualizar Gran Total
    clientGroup.grandTotal += entryTotal;
  });

  return Array.from(clientMap.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
};
