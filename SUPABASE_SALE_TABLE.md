# Tabla de Ventas (trendo.sale) - Supabase

## Descripción
Esta tabla almacena todas las transacciones de ventas (facturas) generadas en el POS.

## Estructura de la tabla

```sql
CREATE TABLE trendo.sale (
  consecutive INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sale_date DATE NOT NULL,
  customer_document VARCHAR(50),
  employee_document VARCHAR(50)
);
```

## Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `consecutive` | INTEGER | Identificador único auto-incrementado (PK) | `1`, `2`, `3` |
| `sale_date` | DATE | Fecha de la venta | `2025-12-09` |
| `customer_document` | VARCHAR(50) | Número de identificación del cliente | `123456789`, `987654321` |
| `employee_document` | VARCHAR(50) | Número de identificación del empleado que registró la venta | `111222333` |

## Flujo de sincronización

### Desde la aplicación (Local → Supabase)

1. **Registro local**: Al generar una factura en Payment.jsx, se llama `addSale()` que:
   - Crea un registro en la tabla local `sales` (Dexie)
   - Marca el registro como `dirty: 1`
   - Guarda: `customerId` (documento del cliente), `total`, `items`, `method`, `tipoComprobante`

2. **Sincronización**: La función `pushSalesToCloud()` en sync.js:
   - Obtiene todas las ventas locales con `dirty: 1`
   - Mapea los datos con `mapSaleLocalToCloud()`
   - Hace un INSERT a la tabla `trendo.sale` en Supabase
   - El `consecutive` se genera automáticamente
   - Marca los registros como `dirty: 0` (limpios)

3. **Mapeo de campos**:
   ```javascript
   {
     local: {
       id,
       total,
       items,
       method,
       created_at,      // → sale_date
       customerId,      // → customer_document
       tipoComprobante,
       shiftId,
       dirty,
       deleted
     },
     cloud: {
       // consecutive se genera automáticamente
       sale_date,       // extraído de created_at
       customer_document, // = customerId
       employee_document  // null (puede agregarse del contexto)
     }
   }
   ```

## Integración con la aplicación

### En db.js (Base de datos local)

```javascript
// Agregar venta
export async function addSale({ total, items, method, created_at, customerId, tipoComprobante }) {
  // Se crea con dirty: 1
  // Se asocia el shift actual si está activo
}

// Obtener ventas sucias para sincronizar
export async function getDirtySales() {
  return db.table('sales').where('dirty').equals(1).toArray()
}

// Marcar ventas como limpias después de sincronizar
export async function markSalesClean(saleIds) {
  await db.table('sales').bulkUpdate(saleIds.map(id => ({ key: id, changes: { dirty: 0 } })))
}
```

### En sync.js (Sincronización)

```javascript
// Mapear venta local a formato Supabase
function mapSaleLocalToCloud(sale) {
  return {
    sale_date: new Date(sale.created_at || new Date()).toISOString().split('T')[0],
    customer_document: sale.customerId || null,
    employee_document: null  // Se puede obtener del contexto si es necesario
  }
}

// Sincronizar ventas a Supabase
export async function pushSalesToCloud() {
  const dirty = await getDirtySales()
  // Se procesan y marcan como limpias
  // El consecutive se genera automáticamente en Supabase
}

// syncAll() llama a pushSalesToCloud() automáticamente
```

## Consideraciones importantes

1. **Consecutive Auto-generado**: El campo `consecutive` se genera automáticamente en Supabase (IDENTITY)
2. **Sale Date**: Se extrae de la fecha de creación de la venta local
3. **Customer Document**: Guardado desde el documento del cliente en el carrito
4. **Employee Document**: Actualmente NULL, pero puede agregarse del contexto de usuario si es necesario
5. **Una venta por registro**: Cada vez que se genera una factura, se crea un nuevo registro en `trendo.sale`

## Row Level Security (RLS)

Se recomienda configurar políticas RLS para que:
- Solo usuarios autenticados puedan insertar ventas
- Las ventas no puedan ser eliminadas, solo creadas/actualizadas
- Cada usuario solo vea las ventas de su empresa/sucursal

## Reportes y consultas útiles

```sql
-- Ventas por día
SELECT sale_date, COUNT(*) as total_ventas
FROM trendo.sale
GROUP BY sale_date
ORDER BY sale_date DESC;

-- Ventas por cliente
SELECT customer_document, COUNT(*) as transacciones
FROM trendo.sale
WHERE customer_document IS NOT NULL
GROUP BY customer_document
ORDER BY transacciones DESC;

-- Ventas por empleado
SELECT employee_document, COUNT(*) as transacciones
FROM trendo.sale
WHERE employee_document IS NOT NULL
GROUP BY employee_document
ORDER BY transacciones DESC;

-- Total de ventas en un rango de fechas
SELECT COUNT(*) as total_ventas
FROM trendo.sale
WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31';
```
