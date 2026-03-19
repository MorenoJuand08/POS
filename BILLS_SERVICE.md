# Servicio de Facturas/Bills (trendo.bill)

## Descripción
Este documento describe la integración de la tabla `trendo.bill` en Supabase con la aplicación POS.

## Archivos creados/modificados

### 1. `bills.js` (NUEVO)
Servicio de operaciones CRUD con la tabla `trendo.bill` en Supabase.

**Ubicación**: `src/renderer/src/services/bills.js`

### 2. `db.js` (MODIFICADO)
- Versión 11: Agregada tabla `bills` a Dexie
- Funciones de gestión local de bills (CRUD, sincronización)

### 3. `sync.js` (MODIFICADO)
- Importados: `getDirtyBills`, `markBillsClean`, `bulkUpsertBills`
- Nuevas funciones: `pushBillsToCloud()`, `pullBillsFromCloud()`
- Actualizada: `syncAll()` para incluir bills

## Estructura de la tabla

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `line_item` | INTEGER | Número de línea en la factura |
| `quantity` | DECIMAL | Cantidad de productos |
| `price` | DECIMAL | Precio unitario o total |
| `type_transaction` | VARCHAR | 'sale' o 'buy' |
| `sale_consecutive` | INTEGER | Número consecutivo de la venta (FK) |
| `buy_consecutive` | INTEGER | Número consecutivo de la compra (FK) |
| `product_id` | VARCHAR | ID del producto (FK) |
| `customer_document` | VARCHAR | Documento del cliente |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |
| `deleted` | BOOLEAN | Marcador de eliminación lógica |

## API - Funciones principales

### Operaciones en Supabase (bills.js)

#### Insertar
```javascript
import { insertBill } from '@/services/bills'

const bill = await insertBill({
  line_item: 1,
  quantity: 2,
  price: 50000,
  type_transaction: 'sale',
  sale_consecutive: 123,
  product_id: 'PROD001',
  customer_document: '1234567890'
})
```

#### Actualizar
```javascript
import { updateBill } from '@/services/bills'

const updated = await updateBill(billId, {
  quantity: 3,
  price: 60000
})
```

#### Obtener por consecutivo de venta
```javascript
import { getBillsByConsecutive } from '@/services/bills'

const bills = await getBillsByConsecutive(123)
// Retorna array de detalles de esa factura
```

#### Obtener por consecutivo de compra
```javascript
import { getBillsByBuyConsecutive } from '@/services/bills'

const bills = await getBillsByBuyConsecutive(456)
```

#### Obtener por producto
```javascript
import { getBillsByProduct } from '@/services/bills'

const bills = await getBillsByProduct('PROD001')
```

#### Obtener por cliente
```javascript
import { getBillsByCustomer } from '@/services/bills'

const bills = await getBillsByCustomer('1234567890')
```

#### Obtener por ID
```javascript
import { getBillById } from '@/services/bills'

const bill = await getBillById('bill-uuid-here')
```

#### Eliminar (soft delete)
```javascript
import { deleteBill } from '@/services/bills'

const deleted = await deleteBill(billId)
```

#### Listar todos
```javascript
import { listBills } from '@/services/bills'

const bills = await listBills(limit = 100, offset = 0)
```

#### Insertar múltiples (batch)
```javascript
import { insertBillsBatch } from '@/services/bills'

const bills = await insertBillsBatch([
  {
    line_item: 1,
    quantity: 2,
    price: 50000,
    type_transaction: 'sale',
    sale_consecutive: 123,
    product_id: 'PROD001',
    customer_document: '1234567890'
  },
  {
    line_item: 2,
    quantity: 1,
    price: 75000,
    type_transaction: 'sale',
    sale_consecutive: 123,
    product_id: 'PROD002',
    customer_document: '1234567890'
  }
])
```

#### Calcular total de factura
```javascript
import { getTotal } from '@/services/bills'

const total = await getTotal(saleConsecutive)
// Suma: quantity * price para cada item
```

#### Contar items en factura
```javascript
import { countItems } from '@/services/bills'

const count = await countItems(saleConsecutive)
```

### Operaciones locales (db.js)

#### Agregar bill local
```javascript
import { addBill } from '@/services/db'

const bill = await addBill({
  line_item: 1,
  quantity: 2,
  price: 50000,
  type_transaction: 'sale',
  sale_consecutive: 123,
  product_id: 'PROD001',
  customer_document: '1234567890'
})
```

#### Obtener bills de una venta (local)
```javascript
import { getBillsBySaleConsecutive } from '@/services/db'

const bills = await getBillsBySaleConsecutive(123)
```

#### Obtener bills de una compra (local)
```javascript
import { getBillsByBuyConsecutive } from '@/services/db'

const bills = await getBillsByBuyConsecutive(456)
```

#### Obtener bills de un cliente (local)
```javascript
import { getBillsByCustomer } from '@/services/db'

const bills = await getBillsByCustomer('1234567890')
```

#### Obtener bills de un producto (local)
```javascript
import { getBillsByProduct } from '@/services/db'

const bills = await getBillsByProduct('PROD001')
```

### Sincronización (sync.js)

#### Push a Supabase
```javascript
import { pushBillsToCloud } from '@/services/sync'

const result = await pushBillsToCloud()
// result: { count: número de bills sincronizados }
```

#### Pull desde Supabase
```javascript
import { pullBillsFromCloud } from '@/services/sync'

const result = await pullBillsFromCloud()
// result: { count: número de bills descargados }
```

#### Sincronización automática
```javascript
import { syncAll } from '@/services/sync'

// Sincroniza productos, clientes, ventas Y bills
await syncAll()
```

## Flujo de operación

### 1. Crear factura (dentro de Payment.jsx o Contabilidad.jsx)

```javascript
import { addBill } from '@/services/db'
import { insertBill } from '@/services/bills'

// Crear bill local
const localBill = await addBill({
  line_item: 1,
  quantity: cart.items[0].quantity,
  price: cart.items[0].price,
  type_transaction: 'sale',
  sale_consecutive: 123, // Obtenido de la venta creada
  product_id: cart.items[0].product_id,
  customer_document: customer.document
})

// Sincronizar a Supabase
await insertBill(localBill)
```

### 2. Obtener detalles de factura

```javascript
import { getBillsByConsecutive } from '@/services/bills'

const billDetails = await getBillsByConsecutive(saleConsecutive)
console.log(billDetails)
// [
//   { id: 'uuid', line_item: 1, quantity: 2, price: 50000, ... },
//   { id: 'uuid', line_item: 2, quantity: 1, price: 75000, ... }
// ]
```

### 3. Calcular total

```javascript
import { getTotal } from '@/services/bills'

const total = await getTotal(saleConsecutive)
console.log(`Total de factura #${saleConsecutive}: $${total}`)
```

## Integración en Contabilidad.jsx

```javascript
import { getBillsByConsecutive, getTotal, countItems } from '@/services/bills'

// En useEffect cuando se carga una factura
useEffect(() => {
  const loadBillDetails = async () => {
    if (!saleConsecutive) return
    
    try {
      const [details, total, itemCount] = await Promise.all([
        getBillsByConsecutive(saleConsecutive),
        getTotal(saleConsecutive),
        countItems(saleConsecutive)
      ])
      
      setBillDetails(details)
      setBillTotal(total)
      setItemCount(itemCount)
    } catch (error) {
      console.error('Error cargando detalles:', error)
    }
  }
  
  loadBillDetails()
}, [saleConsecutive])

// Renderizar detalles
return (
  <div>
    <h2>Detalles de Factura #{saleConsecutive}</h2>
    <table>
      <thead>
        <tr>
          <th>Línea</th>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {billDetails.map(bill => (
          <tr key={bill.id}>
            <td>{bill.line_item}</td>
            <td>{bill.product_id}</td>
            <td>{bill.quantity}</td>
            <td>${bill.price.toLocaleString()}</td>
            <td>${(bill.quantity * bill.price).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p>Total items: {itemCount}</p>
    <p><strong>Total: ${billTotal.toLocaleString()}</strong></p>
  </div>
)
```

## Sincronización automática

La función `syncAll()` se ejecuta automáticamente:
- Al cargar la aplicación (en App.jsx)
- Periodicamente cada X minutos
- Cuando el usuario pide sincronizar manualmente

La sincronización de bills incluye:
1. **Push**: Envía todos los bills locales marcados como `dirty: 1` a Supabase
2. **Pull**: Descarga cambios recientes de Supabase (últimas 24h o desde última sync)

## Consideraciones

1. **UUID vs INTEGER**: La tabla local usa UUID, Supabase puede usar SERIAL si lo prefieres
2. **Soft Delete**: Las eliminaciones marcan `deleted: true` en lugar de borrar
3. **Sincronización**: Solo sincroniza registros que no están sincronizados (`dirty: 1`)
4. **Transactions**: Dentro de una factura, todos los bills deberían tener el mismo `sale_consecutive`

## Próximas columnas recomendadas (opcional)

Si necesitas agregar más información, estas columnas serían útiles:

```sql
-- Descuento por línea
ALTER TABLE trendo.bill ADD COLUMN discount DECIMAL(12,2) DEFAULT 0;

-- Impuesto (IVA)
ALTER TABLE trendo.bill ADD COLUMN tax DECIMAL(12,2) DEFAULT 0;

-- Descripción del producto (desnormalizado para reportes)
ALTER TABLE trendo.bill ADD COLUMN product_name VARCHAR(255);

-- Notas/comentarios
ALTER TABLE trendo.bill ADD COLUMN notes TEXT;

-- Talla del producto (si aplica)
ALTER TABLE trendo.bill ADD COLUMN size VARCHAR(10);

-- Color del producto (si aplica)
ALTER TABLE trendo.bill ADD COLUMN color VARCHAR(100);
```

Si quieres que agregue estas columnas, usa estos comandos en Supabase SQL Editor:

```sql
ALTER TABLE trendo.bill ADD COLUMN discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE trendo.bill ADD COLUMN tax DECIMAL(12,2) DEFAULT 0;
ALTER TABLE trendo.bill ADD COLUMN product_name VARCHAR(255);
ALTER TABLE trendo.bill ADD COLUMN notes TEXT;
ALTER TABLE trendo.bill ADD COLUMN size VARCHAR(10);
ALTER TABLE trendo.bill ADD COLUMN color VARCHAR(100);

-- Crear índices para mejor performance
CREATE INDEX idx_bill_sale_consecutive ON trendo.bill(sale_consecutive);
CREATE INDEX idx_bill_buy_consecutive ON trendo.bill(buy_consecutive);
CREATE INDEX idx_bill_product_id ON trendo.bill(product_id);
CREATE INDEX idx_bill_customer_document ON trendo.bill(customer_document);
CREATE INDEX idx_bill_created_at ON trendo.bill(created_at);
```
