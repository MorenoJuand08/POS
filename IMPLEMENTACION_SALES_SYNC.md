# Integración de Tabla Sales con Supabase - Resumen de Implementación

## ✅ Lo que se ha implementado

### 1. En `db.js` - Base de datos local (Dexie)
Se agregaron **3 nuevas funciones**:

```javascript
// Obtener todas las ventas que aún no se han sincronizado
export async function getDirtySales()

// Marcar ventas como sincronizadas después de enviarlas a Supabase
export async function markSalesClean(saleIds)

// Ya existía - crear una nueva venta
export async function addSale({ total, items, method, created_at, customerId, tipoComprobante })
```

### 2. En `sync.js` - Sincronización bidireccional
Se agregaron **3 nuevas funciones y constantes**:

```javascript
// Constante para identificar la tabla de ventas
const SALE_TABLE = 'sale'
const SALE_REMOTE_TABLE = 'trendo.sale'
const SALE_LAST_SYNC_KEY = 'trendo.sale:lastSyncedAt'

// Mapear datos locales al formato de Supabase
function mapSaleLocalToCloud(sale)

// Obtener tabla remota de ventas
function remoteSaleTable()

// Sincronizar todas las ventas pendientes a Supabase
export async function pushSalesToCloud()
```

### 3. Integración en `syncAll()`
La función `syncAll()` ahora incluye:
```javascript
export async function syncAll() {
  await pushToCloud()           // Productos
  await pushCustomersToCloud()  // Clientes
  await pushSalesToCloud()      // ← NUEVA: Ventas
  await pullFromCloud()         // Productos
  await pullCustomersFromCloud()// Clientes
}
```

## 🔄 Flujo de datos

```
Payment.jsx (Interfaz de cobro)
    ↓
    Llama: addSale({total, items, method, customerId, tipoComprobante})
    ↓
db.js - addSale()
    ↓
    Crea registro en tabla local 'sales' (Dexie)
    Marca: dirty: 1, deleted: 0
    Asocia: shiftId del turno activo
    ↓
    Retorna record creado
    ↓
[Sincronización automática]
    ↓
sync.js - pushSalesToCloud()
    ↓
    getDirtySales() obtiene ventas con dirty: 1
    ↓
    mapSaleLocalToCloud() transforma campos
    ↓
    remoteSaleTable().upsert() envía a Supabase
    ↓
    markSalesClean() marca dirty: 0
    ↓
✓ Venta sincronizada a Supabase
```

## 📊 Mapeo de campos

| Campo Local (Dexie) | Campo Supabase | Descripción |
|-------------------|-------------------|-------------|
| `id` | `id` | UUID único |
| `total` | `amount` | Monto de la venta |
| `items` | `items_count` | Cantidad de items |
| `method` | `payment_method` | Efectivo, Tarjeta, etc |
| `created_at` | `created_at` | Timestamp creación |
| `created_at` (date part) | `sale_date` | Fecha sin hora |
| `customerId` | `customer_id` | ID del cliente |
| `tipoComprobante` | `invoice_type` | Facturación POS, etc |
| `shiftId` | `shift_id` | ID del turno |
| N/A | `updated_at` | Actualizado al sincronizar |

## 🚀 Cómo funciona

### Cuando generas una factura en Payment:
1. Usuario ingresa métodos de pago
2. Hace click en "Generar Factura"
3. Se descuenta stock del inventario
4. Se llama a `addSale()` con los datos
5. Se guarda localmente con `dirty: 1`
6. Se navega a la pantalla de caja

### Sincronización automática (cuando hay conexión):
1. La app ejecuta `syncAll()` periódicamente
2. `pushSalesToCloud()` se ejecuta
3. Obtiene todas las ventas no sincronizadas
4. Las mapea y envía a Supabase
5. Las marca como sincronizadas

## 📋 Lo que necesitas hacer en Supabase

### 1. Crear la tabla `trendo.sale` con la siguiente estructura:

```sql
CREATE TABLE trendo.sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(100),
  items_count INTEGER DEFAULT 0,
  customer_id VARCHAR(50),
  invoice_type VARCHAR(100),
  shift_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Crear índices para mejor performance:
```sql
CREATE INDEX idx_sale_date ON trendo.sale(sale_date);
CREATE INDEX idx_customer_id ON trendo.sale(customer_id);
CREATE INDEX idx_shift_id ON trendo.sale(shift_id);
CREATE INDEX idx_created_at ON trendo.sale(created_at);
```

### 3. (Opcional) Configurar RLS para seguridad:
- Solo usuarios autenticados pueden ver/crear ventas
- Las ventas son inmutables (no se eliminan)

## 🔗 Relaciones con otras tablas

- `customer_id` → Referencia a `trendo.customer(customer_id)`
- `shift_id` → Referencia a `trendo.shift(id)`

## 📱 Datos de ejemplo de una venta sincronizada

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sale_date": "2025-12-09",
  "amount": 125999.50,
  "payment_method": "Efectivo",
  "items_count": 5,
  "customer_id": "123456789",
  "invoice_type": "Facturación POS",
  "shift_id": "550e8400-e29b-41d4-a716-446655440001",
  "created_at": "2025-12-09T14:30:45.123Z",
  "updated_at": "2025-12-09T14:30:50.456Z"
}
```

## ✨ Beneficios

✓ Todas las ventas se guardan automáticamente en la nube  
✓ Reportes en tiempo real desde Supabase  
✓ Sincronización automática cuando hay conexión  
✓ Funciona offline (se sincroniza cuando hay conexión)  
✓ Cada venta asociada con su turno para contabilidad  
✓ Seguimiento de clientes por ventas  
✓ Auditoría completa con timestamps  

## 🐛 Debugging

Si quieres ver si las ventas se están sincronizando:

1. Abre la consola del navegador (F12)
2. Ejecuta: `window.forceSync()` para forzar sincronización
3. Revisa en Supabase si los registros aparecen en `trendo.sale`
4. Verifica en Dexie DevTools que `dirty: 0` en la tabla sales

---

**Próximos pasos**: Una vez crees la tabla en Supabase, las ventas se sincronizarán automáticamente.
