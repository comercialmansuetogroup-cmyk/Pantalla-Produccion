import { CLIENT_MAPPING } from './types';

// Evita decimales extraños en javascript
export const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

// Lógica compleja para extraer pesos (KG, Gramos) de descripciones de texto
export const extractUnitsFromDescription = (description: string, totalWeight: any): number => {
  const numericWeight = Number(totalWeight) || 0;
  if (numericWeight === 0) return 0;
  if (!description) return Math.round(numericWeight);

  const weightRegex = /(\d+[.,]?\d*)\s*(KG|KILO|K|G|GR|GRAMOS)/i;
  const match = description.match(weightRegex);

  if (match) {
    let unitWeight = parseFloat(match[1].replace(',', '.'));
    const unitType = match[2].toUpperCase();
    if (unitType.startsWith('G')) {
      unitWeight = unitWeight / 1000;
    }
    if (unitWeight > 0) {
      return Math.round(numericWeight / unitWeight);
    }
  }
  return Math.round(numericWeight);
};

// EL CEREBRO DE DATOS: Transforma los datos crudos del servidor en la estructura visual
export const processDataWithTrends = (rawZones: any[], completedItems: Set<string>) => {
  if (!rawZones || rawZones.length === 0) return [];

  // 1. Agrupar por fecha
  const zonesByDate = new Map<string, any[]>();
  rawZones.forEach(z => {
    const date = z.receivedAt ? z.receivedAt.split('T')[0] : 'legacy';
    if (!zonesByDate.has(date)) zonesByDate.set(date, []);
    zonesByDate.get(date)!.push(z);
  });

  const allDatesSorted = Array.from(zonesByDate.keys()).sort();
  const latestDate = allDatesSorted[allDatesSorted.length - 1];

  // Función interna para procesar un set de datos de una fecha específica
  const processDataSet = (date: string) => {
    const globalStockMap = new Map<string, number>();
    const clientsMap = new Map<string, any>();
    
    (zonesByDate.get(date) || []).forEach(z => {
      const agentCode = String(z.codigo_agente ?? '').trim();
      const clientName = CLIENT_MAPPING[agentCode] || `ZONA ${agentCode || '0'}`;
      
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, { name: clientName, products: new Map<string, any>(), total: 0 });
      }
      
      const c = clientsMap.get(clientName);
      
      // Función auxiliar para procesar items individuales
      const processItem = (p: any, isProductArray: boolean) => {
          let realName = isProductArray ? (p.nombre || z.nombre || '') : (z.nombre || 'ITEM');
          const code = isProductArray ? (p.codigo || '') : agentCode;
          
          // Lógica de nombres vs códigos
          if (!realName || String(realName).trim().toUpperCase() === String(code).trim().toUpperCase()) {
             if (z.nombre && String(z.nombre).trim().toUpperCase() !== String(code).trim().toUpperCase()) {
                realName = z.nombre;
             } else {
                realName = code; 
             }
          }

          const pNameKey = String(p.codigo || p.nombre || z.nombre || 'ITEM').toUpperCase();
          const specificDesc = String(realName).toUpperCase();
          const rawQty = isProductArray ? p.cantidad : z.cantidad;
          const rawStock = isProductArray ? p.stock_fisico : z.stock_fisico;

          const qty = extractUnitsFromDescription(specificDesc, rawQty);
          const stock = extractUnitsFromDescription(specificDesc, rawStock);
          
          if (stock > (globalStockMap.get(pNameKey) || 0)) {
            globalStockMap.set(pNameKey, stock);
          }

          if (!c.products.has(pNameKey)) {
            c.products.set(pNameKey, { name: realName, code: isProductArray ? (p.codigo || 'N/A') : agentCode, qty: 0, stock: 0 }); 
          }
          const prodEntry = c.products.get(pNameKey);
          prodEntry.qty += qty;
          c.total += qty;
      };

      if (Array.isArray(z.productos)) {
        z.productos.forEach((p: any) => processItem(p, true));
      } else {
        processItem(z, false);
      }
    });

    const sortedClients = Array.from(clientsMap.values()).sort((a, b) => {
      if (a.name === 'GRAN CANARIA') return -1;
      if (b.name === 'GRAN CANARIA') return 1;
      return a.name.localeCompare(b.name);
    });

    // Calcular producción restante vs stock
    const runningStock = new Map<string, number>(globalStockMap);

    sortedClients.forEach(client => {
      const visibleProducts = new Map();

      client.products.forEach((p: any, key: string) => {
          const availableStock = runningStock.get(key) || 0;
          const stockAssigned = Math.min(p.qty, availableStock);
          const toProduce = Math.max(0, p.qty - stockAssigned);
          
          const rowId = `${client.name}-${p.code}`;

          // Solo mostramos si hay que producir O si se acaba de completar (para animación)
          if (toProduce > 0 || completedItems.has(rowId)) {
             p.toProduce = toProduce;
             p.stock = availableStock;
             p.rowId = rowId;
             visibleProducts.set(key, p);
          }
          
          if(runningStock.has(key)) {
               runningStock.set(key, Math.max(0, availableStock - stockAssigned));
          }
      });

      client.products = visibleProducts;
      client.productsArray = Array.from(client.products.values()).sort((a: any, b: any) => b.qty - a.qty);
    });

    return { clients: sortedClients, productMap: clientsMap }; 
  };

  const currentData = processDataSet(latestDate);
  
  // Cálculo de tendencias (Comparativa con el periodo anterior)
  let prevProductTotals = new Map<string, number>(); 
  let prevClientTotals = new Map<string, number>();

  if (allDatesSorted.length >= 2) {
    const prevDate = allDatesSorted[allDatesSorted.length - 2];
    const prevRawMap = processDataSet(prevDate).productMap;
    
    prevRawMap.forEach((c: any) => {
        prevClientTotals.set(c.name, c.total);
        c.products.forEach((p: any) => {
            prevProductTotals.set(`${c.name}_${p.name}`, p.qty);
        });
    });
  }

  return currentData.clients.map(client => {
    const prevClientTotal = prevClientTotals.get(client.name) || 0;
    const totalTrend = prevClientTotal > 0 ? ((client.total - prevClientTotal) / prevClientTotal) * 100 : 0;

    const productsWithTrend = client.productsArray.map((p: any) => {
        const prevQty = prevProductTotals.get(`${client.name}_${p.name}`) || 0;
        const trend = prevQty > 0 ? ((p.qty - prevQty) / prevQty) * 100 : 0;
        return { ...p, trend };
    });

    return { ...client, products: productsWithTrend, totalTrend };
  });
};