
# FactorySync Dashboard

Sistema de control de producción en tiempo real.

## Características
- Conexión SSE (Server-Sent Events)
- Base de datos PostgreSQL
- Visualización reactiva sin etapa de compilación compleja (ESM)
- Modo Oscuro/Claro
- Filtros de Analítica

## Estructura
- `/api/webhook`: Endpoint para recibir datos de Make.com
- `/api/events`: Canal de eventos en tiempo real para el frontend.
- `/api/data`: Endpoint de persistencia.
