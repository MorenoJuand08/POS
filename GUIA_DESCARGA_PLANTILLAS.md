# 📥 Guía de Descarga y Uso de Plantillas

## 🎯 Resumen Rápido

El sistema proporciona dos formas de importar productos:

| Formato | Botón | Archivo | Ventaja |
|---------|-------|---------|---------|
| **Excel** | 📥 Excel | `plantilla_productos.xlsx` | Interfaz visual, fácil de usar |
| **CSV** | 📥 CSV | `plantilla_productos.csv` | Compatible con todo, universal |

---

## 📥 Descarga de Plantillas

### Paso 1: Abre la sección de Inventario
En el software Trendo POS, ve a: **Inventario** → Botón "📥 Importar Excel"

### Paso 2: Elige tu formato
Se abrirá un modal. Tienes dos opciones:

#### Opción A: Descargar Plantilla Excel
- Haz clic en el botón **"📥 Excel"**
- Se descarga: `plantilla_productos.xlsx`
- Tamaño: ~10 KB
- Compatible con: Excel, LibreOffice, Google Sheets

#### Opción B: Descargar Plantilla CSV
- Haz clic en el botón **"📥 CSV"**
- Se descarga: `plantilla_productos.csv`
- Tamaño: ~2 KB
- Compatible con: Excel, Sheets, Notepad, cualquier editor

---

## 💻 Cómo Completar tu Plantilla

### Usando Excel (Recomendado)

```
1. Descargar → plantilla_productos.xlsx
2. Abrir en Excel (doble clic)
3. Ver estructura:
   
   ┌─────────────┬──────────────────┬─────────┬────────┬─────────┐
   │ item        │ title            │ price   │ gender │ stock_m │
   ├─────────────┼──────────────────┼─────────┼────────┼─────────┤
   │ CAMISETA001 │ Camiseta Blanca  │ 25000   │ Hombre │ 15      │
   │ JEAN002     │ Jean Azul        │ 65000   │ Mujer  │ 8       │
   │ ZAPATOS003  │ Tenis Deportivos │ 85000   │ Hombre │ 5       │
   └─────────────┴──────────────────┴─────────┴────────┴─────────┘

4. Agregar tus productos en las filas siguientes
5. Guardar: Ctrl+S
6. Importar en el software
```

### Usando CSV en Excel

```
1. Descargar → plantilla_productos.csv
2. Abrir con Excel
3. Completar datos (igual que Excel normal)
4. Guardar Como → CSV (Delimitado por comas)
5. Importar en el software
```

### Usando Google Sheets

```
1. Descargar → plantilla_productos.csv
2. Ir a https://sheets.google.com
3. Crear nuevo documento
4. Archivo → Importar → Subir → Seleccionar CSV
5. Completar datos
6. Descargar como CSV
7. Importar en el software
```

### Usando Editor de Texto (Notepad, VSCode)

```
1. Descargar → plantilla_productos.csv
2. Abrir con Notepad o VSCode
3. Ver formato:

item,title,price,gender,stock_xs,stock_s,stock_m,stock_l,stock_xl,description
CAMISETA001,Camiseta Blanca,25000,Hombre,5,10,15,8,3,Algodón 100%
JEAN002,Jean Azul,65000,Mujer,2,5,8,6,1,Tiro alto

4. Agregar tus productos (mantén el mismo formato)
5. Guardar como .csv o .txt
6. Importar en el software
```

---

## 📋 Campos a Completar

Cada columna requiere información específica:

### `item` (Obligatorio)
- **Qué es:** Código único del producto (SKU)
- **Ejemplo:** `CAMISETA001`, `JEAN_BLU_28`, `ZAPATO-NIKE`
- **Reglas:**
  - Máximo 15 caracteres
  - Sin espacios (usa guiones o guiones bajos)
  - Único (no puede repetirse)

### `title` (Obligatorio)
- **Qué es:** Nombre del producto
- **Ejemplo:** `Camiseta Básica Blanca`, `Jean Azul Oscuro`
- **Reglas:**
  - Descriptivo y claro
  - Puede tener espacios

### `price` (Obligatorio)
- **Qué es:** Precio en pesos colombianos
- **Ejemplo:** `25000`, `65500`, `99999`
- **Reglas:**
  - Solo números (sin $ ni puntos)
  - Debe ser mayor a 0
  - No se aceptan decimales

### `gender` (Obligatorio)
- **Qué es:** Género del producto
- **Opciones:** `Hombre` o `Mujer`
- **Ejemplo:** `Hombre`, `Mujer`
- **Nota:** El sistema es flexible con mayúsculas/minúsculas

### `stock_xs` hasta `stock_xl` (Opcional)
- **Qué es:** Stock por talla
- **Tallas disponibles:**
  - `stock_xs` = Talla XS
  - `stock_s` = Talla S
  - `stock_m` = Talla M
  - `stock_l` = Talla L
  - `stock_xl` = Talla XL
- **Ejemplo:** `5`, `10`, `0`
- **Reglas:**
  - Solo números
  - Pueden ser 0
  - Si los dejas vacíos, se asumen como 0
- **Total de stock:** La suma de todas las tallas

### `description` (Opcional)
- **Qué es:** Descripción adicional del producto
- **Ejemplo:** `Algodón 100%`, `Con cierre`, `Tiro alto`
- **Reglas:**
  - Completamente opcional
  - Puede tener espacios y caracteres especiales

---

## ✅ Ejemplo Completo

### Excel Visual:

```
A              B                    C      D        E E    F  G  H  I         J
item           title                price  gender   xs s  m  l  xl description
CAMISETA001    Camiseta Blanca      25000  Hombre   5  10 15 8  3  Algodón 100%
JEAN002        Jean Azul Oscuro     65000  Mujer    2  5  8  6  1  Tiro alto
ZAPATOS003     Tenis Deportivos     85000  Hombre   0  3  5  4  2  Cuero importado
VESTIDO004     Vestido Negro        95000  Mujer    1  2  3  2  1  Para ocasiones
SUDADERA005    Sudadera Gris        45000  Hombre   8  10 12 9  6  Con cierre
BOLSO006       Bolso Crossbody      55000  Mujer    0  0  0  0  0
CORREA007      Correa de Cuero      18000  Hombre   0  0  0  0  0  Ajustable
GORRO008       Gorro Deportivo      22000  Unisex*  5  5  5  5  5  (*se normalizará)
```

### CSV Texto:

```csv
item,title,price,gender,stock_xs,stock_s,stock_m,stock_l,stock_xl,description
CAMISETA001,Camiseta Blanca,25000,Hombre,5,10,15,8,3,Algodón 100%
JEAN002,Jean Azul Oscuro,65000,Mujer,2,5,8,6,1,Tiro alto
ZAPATOS003,Tenis Deportivos,85000,Hombre,0,3,5,4,2,Cuero importado
VESTIDO004,Vestido Negro,95000,Mujer,1,2,3,2,1,Para ocasiones
SUDADERA005,Sudadera Gris,45000,Hombre,8,10,12,9,6,Con cierre
BOLSO006,Bolso Crossbody,55000,Mujer,0,0,0,0,0
CORREA007,Correa de Cuero,18000,Hombre,0,0,0,0,0,Ajustable
GORRO008,Gorro Deportivo,22000,Hombre,5,5,5,5,5
```

---

## 🔄 Proceso de Importación Completo

### 1. Descargar
```
Inventario → 📥 Importar Excel → Elige formato
   ↓
Opción A: 📥 Excel → plantilla_productos.xlsx
Opción B: 📥 CSV   → plantilla_productos.csv
```

### 2. Completar
```
Abre el archivo → Llena tus productos → Guarda
```

### 3. Subir
```
Inventario → 📥 Importar Excel → Seleccionar Archivo
   ↓
Elige tu archivo (puede ser .xlsx, .csv o .txt)
```

### 4. Revisar
```
Sistema valida → Muestra vista previa
   ↓
Confirma que los datos sean correctos
```

### 5. Importar
```
Haz clic en "✓ Importar"
   ↓
Sistema carga los productos
   ↓
¡Listo! Tus productos están en el inventario
```

---

## ⚠️ Errores Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Formato no soportado" | Archivo .doc, .pdf, etc. | Usa .xlsx, .csv o .txt |
| "Falta código/item" | Columna vacía | Llena la columna `item` |
| "Falta nombre" | Columna `title` vacía | Agrega el nombre del producto |
| "Precio inválido" | Precio = 0 o tiene $ | Usa solo números, ej: 25000 |
| "Género debe ser Hombre o Mujer" | Usaste "Unisex" | Elige Hombre o Mujer |
| "Stock debe ser un número" | Escribiste "mucho" | Usa números: 0, 5, 10, etc. |

---

## 💡 Tips Útiles

✅ **Guarda siempre con UTF-8** para evitar problemas con caracteres especiales

✅ **Verifica que el archivo tenga extensión correcta:**
   - `.xlsx` para Excel
   - `.csv` para CSV
   - `.txt` para texto plano

✅ **No borres la fila de encabezados** (item, title, price, etc.)

✅ **Usa la vista previa** antes de confirmar para revisar errores

✅ **Para cambios grandes,** mejor importar que editar manualmente

✅ **Si hay errores,** el sistema te mostrará exactamente qué fila tiene problemas

---

## 🚀 Casos de Uso

### Caso 1: Cargar 50 productos nuevos
→ Descarga plantilla Excel → Llena en Excel → Importa masivamente

### Caso 2: Actualizar precios de 100 productos
→ Exporta desde tu sistema anterior como CSV → Ajusta precios → Importa

### Caso 3: Agregar 5 productos rápido
→ Usa plantilla CSV en Notepad → Agrega 5 filas → Importa

### Caso 4: Migrar de otro software
→ Exporta de tu software anterior como CSV → Ajusta columnas para que coincidan → Importa

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que el archivo sea .xlsx, .csv o .txt
2. Revisa que los datos obligatorios estén llenos
3. Usa la vista previa para identificar qué está mal
4. Intenta con la plantilla descargada desde el software
5. Si persiste, prueba con CSV (formato más simple)
