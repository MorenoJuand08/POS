# 🔧 Guía de Configuración: Sincronización de Ventas con Supabase

## Resumen Rápido

Has solicitado conectar la tabla `trendo.sale` de Supabase para guardar todas las ventas que se generan después de pasar por la pantalla de cobro (Payment). 

**Estado**: ✅ **IMPLEMENTADO EN EL CÓDIGO**
**Falta**: ⏳ Crear la tabla en Supabase

---

## 📋 Cambios realizados en el código

### 1️⃣ Base de datos local (`db.js`)

Se agregaron 2 nuevas funciones para gestionar ventas sincronizables:

```javascript
// Obtiene todas las ventas que aún no se han enviado a Supabase
export async function getDirtySales()

// Marca las ventas como "sincronizadas" después de enviarlas
export async function markSalesClean(saleIds)
```

### 2️⃣ Sincronización (`sync.js`)

Se agregaron 3 nuevas funciones:

```javascript
// Mapea una venta local al formato que espera Supabase
function mapSaleLocalToCloud(sale)

// Obtiene la referencia a la tabla remota 'trendo.sale'
function remoteSaleTable()

// Sincroniza todas las ventas pendientes a Supabase
export async function pushSalesToCloud()
```

Se actualizó `syncAll()` para incluir la sincronización de ventas:
```javascript
export async function syncAll() {
  await pushToCloud()           // Productos ✓
  await pushCustomersToCloud()  // Clientes ✓
  await pushSalesToCloud()      // ← NUEVA ✓
  await pullFromCloud()         // Productos ✓
  await pullCustomersFromCloud()// Clientes ✓
}
```

---

## 🗄️ Próximo paso: Crear la tabla en Supabase

### Opción 1: Via SQL Editor (Recomendado)

1. Abre tu proyecto Supabase
2. Ve a **SQL Editor** (lado izquierdo)
3. Haz click en **"New Query"**
4. Copia y pega este SQL:

```sql
-- Crear tabla de ventas
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

-- Crear índices para mejor performance
CREATE INDEX idx_sale_date ON trendo.sale(sale_date);
CREATE INDEX idx_customer_id ON trendo.sale(customer_id);
CREATE INDEX idx_shift_id ON trendo.sale(shift_id);
CREATE INDEX idx_created_at ON trendo.sale(created_at);

-- Crear comentarios en la tabla (opcional pero útil)
COMMENT ON TABLE trendo.sale IS 'Tabla de todas las transacciones de ventas generadas en el POS';
COMMENT ON COLUMN trendo.sale.id IS 'Identificador único de la venta';
COMMENT ON COLUMN trendo.sale.sale_date IS 'Fecha de la venta';
COMMENT ON COLUMN trendo.sale.amount IS 'Monto total de la venta incluyendo impuestos';
COMMENT ON COLUMN trendo.sale.payment_method IS 'Método de pago utilizado';
COMMENT ON COLUMN trendo.sale.items_count IS 'Total de items/unidades vendidas';
COMMENT ON COLUMN trendo.sale.customer_id IS 'ID del cliente (número de identificación)';
COMMENT ON COLUMN trendo.sale.invoice_type IS 'Tipo de comprobante (Facturación POS, etc)';
COMMENT ON COLUMN trendo.sale.shift_id IS 'ID del turno en que se realizó la venta';
```

5. Haz click en **"Run"**
6. ¡Listo! La tabla está creada

### Opción 2: Via Table Editor (Interfaz gráfica)

1. Ve a **Table Editor**
2. Haz click en el **botón "+"** para crear tabla
3. Nombre: `sale`
4. Schema: `trendo` (del dropdown)
5. Columnas: Agrega manualmente según la tabla anterior

---

## 🔐 Seguridad (Row Level Security - RLS)

**Recomendación**: Habilitar RLS en la tabla `sale` para que:
- Solo usuarios autenticados puedan crear ventas
- Las ventas no se pueden eliminar (solo crear/actualizar)

```sql
-- Habilitar RLS
ALTER TABLE trendo.sale ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver/crear sus propias ventas
CREATE POLICY "Users can insert their own sales"
ON trendo.sale FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política: Usuarios autenticados pueden ver las ventas
CREATE POLICY "Users can select sales"
ON trendo.sale FOR SELECT
USING (auth.role() = 'authenticated');

-- Política: Las ventas no se pueden eliminar directamente
-- (no creamos DELETE policy)
```

---

## ✅ Verificación: ¿Funciona correctamente?

Una vez crees la tabla en Supabase:

### 1. Prueba manual desde la app:

1. Abre la app POS
2. Registra una venta completa (carrito → cobro → generar factura)
3. Debería completarse sin errores
4. Se guardará localmente con `dirty: 1`

### 2. Fuerza la sincronización:

1. Abre la consola del navegador (F12 → Console)
2. Ejecuta: `window.forceSync()`
3. Espera a que termine (sin errores en console)

### 3. Verifica en Supabase:

1. Ve a **Table Editor** → `sale` tabla
2. Deberías ver el registro de tu venta
3. Los campos deben estar completos

### 4. Verifica que se marcó como sincronizada:

1. Abre **DevTools de Dexie** (si la tienes instalada)
2. Ve a tabla `sales` en Dexie
3. El registro debe tener `dirty: 0`

---

## 📊 Campos que se sincronizan

Cuando generas una factura, se sincroniza:

| Campo | Valor ejemplo | Descripción |
|-------|---------|------------|
| `id` | UUID | Generado automáticamente |
| `sale_date` | 2025-12-09 | Fecha de la venta |
| `amount` | 125999.50 | Total a pagar |
| `payment_method` | Efectivo | Forma de pago |
| `items_count` | 5 | Cantidad de items |
| `customer_id` | 123456789 | ID del cliente (si existe) |
| `invoice_type` | Facturación POS | Tipo de comprobante |
| `shift_id` | UUID | ID del turno activo |
| `created_at` | Timestamp | Hora exacta de la venta |
| `updated_at` | Timestamp | Hora de sincronización |

---

## 🔗 Relaciones con otras tablas (Opcional)

Si deseas mantener integridad referencial:

```sql
-- Agregar foreign keys
ALTER TABLE trendo.sale
ADD CONSTRAINT fk_customer_sale 
FOREIGN KEY (customer_id) 
REFERENCES trendo.customer(customer_id) 
ON DELETE SET NULL;

ALTER TABLE trendo.sale
ADD CONSTRAINT fk_shift_sale
FOREIGN KEY (shift_id)
REFERENCES trendo.shift(id)
ON DELETE SET NULL;
```

---

## 📈 Consultas útiles para reporting

Una vez tengas datos en Supabase, puedes hacer consultas como:

```sql
-- Ventas por día
SELECT sale_date, COUNT(*) as total_ventas, SUM(amount) as monto_total
FROM trendo.sale
GROUP BY sale_date
ORDER BY sale_date DESC;

-- Top 10 clientes por monto gastado
SELECT customer_id, COUNT(*) as transacciones, SUM(amount) as total
FROM trendo.sale
WHERE customer_id IS NOT NULL
GROUP BY customer_id
ORDER BY total DESC
LIMIT 10;

-- Ventas por turno
SELECT shift_id, COUNT(*) as transacciones, SUM(amount) as monto
FROM trendo.sale
GROUP BY shift_id;

-- Resumen de métodos de pago
SELECT payment_method, COUNT(*) as cantidad, SUM(amount) as monto
FROM trendo.sale
GROUP BY payment_method;
```

---

## 🐛 Solución de problemas

### Las ventas no se sincronizan

1. **Verifica conexión a internet**: La app necesita estar conectada
2. **Revisa logs**: Abre F12 → Console y busca errores
3. **Fuerza sincronización**: `window.forceSync()` en la consola
4. **Verifica la tabla**: ¿Existe `trendo.sale` en Supabase?

### Error: "Table not found"

- La tabla `trendo.sale` no existe en Supabase
- Solución: Ejecuta el SQL de creación de tabla

### Error: "Permission denied"

- Problema de RLS o permisos
- Solución: Revisa políticas RLS en Supabase

### Las ventas se guardan localmente pero no en Supabase

1. Verifica que `trendo.sale` exista
2. Verifica que el nombre del schema sea exactamente `trendo`
3. Ejecuta `window.forceSync()` para forzar sincronización
4. Revisa la consola para errores detallados

---

## 📚 Documentación completa

Lee estos archivos para más detalles:

- `SUPABASE_SALE_TABLE.md` - Estructura completa de la tabla
- `IMPLEMENTACION_SALES_SYNC.md` - Detalles técnicos de la implementación

---

## ✨ ¿Qué pasa automáticamente?

✓ Cuando generas una factura, se guarda localmente  
✓ Cuando hay conexión a internet, se sincroniza automáticamente  
✓ Cada venta queda asociada con su turno  
✓ Puedes hacer reportes desde Supabase  
✓ Las ventas nunca se pierden (offline-first)  

---

## 🎯 Próximos pasos

1. **Ahora**: Crea la tabla en Supabase (SQL arriba)
2. **Luego**: Prueba generando una venta en la app
3. **Luego**: Verifica que aparezca en Supabase
4. **Luego**: Crea reportes/dashboards con los datos

¡Listo! 🎉

---

**¿Dudas?** Revisa la consola del navegador (F12) para ver mensajes de error detallados.
