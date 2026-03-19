# 📊 Formato de Importación de Productos - Excel/CSV

## Formatos Aceptados: **EXCEL (.xlsx), CSV o TXT**

El sistema acepta archivos Excel (.xlsx), CSV (delimitado por comas) o TXT.

---

## 📋 Estructura de Columnas

Tu archivo CSV debe tener las siguientes columnas en este orden:

| Columna | Campo | Tipo | Requerido | Descripción |
|---------|-------|------|-----------|-------------|
| 1 | `item` | Texto | ✅ Sí | Código único del producto (SKU). Máximo 15 caracteres. Ej: `CAMISETA001` |
| 2 | `title` | Texto | ✅ Sí | Nombre del producto. Ej: `Camiseta Básica Blanca` |
| 3 | `price` | Número | ✅ Sí | Precio en pesos (sin símbolo). Ej: `25000` |
| 4 | `gender` | Texto | ✅ Sí | Género: `Hombre` o `Mujer` |
| 5 | `stock_xs` | Número | ❌ No | Stock talla XS. Por defecto 0 |
| 6 | `stock_s` | Número | ❌ No | Stock talla S. Por defecto 0 |
| 7 | `stock_m` | Número | ❌ No | Stock talla M. Por defecto 0 |
| 8 | `stock_l` | Número | ❌ No | Stock talla L. Por defecto 0 |
| 9 | `stock_xl` | Número | ❌ No | Stock talla XL. Por defecto 0 |
| 10 | `description` | Texto | ❌ No | Descripción del producto (opcional) |

---

## 📝 Ejemplo de Archivo CSV

```csv
item,title,price,gender,stock_xs,stock_s,stock_m,stock_l,stock_xl,description
CAMISETA001,Camiseta Básica Blanca,25000,Hombre,5,10,15,8,3,Camiseta de algodón 100%
JEAN002,Jean Azul Oscuro,65000,Mujer,2,5,8,6,1,Jean tiro alto
ZAPATOS003,Tenis Deportivos,85000,Hombre,0,3,5,4,2,Tenis en cuero
VESTIDO004,Vestido Negro Elegante,95000,Mujer,1,2,3,2,1,Vestido para ocasiones especiales
SUDADERA005,Sudadera Gris,45000,Hombre,8,10,12,9,6,Sudadera con cierre
```

---

## ✅ Reglas de Validación

1. **Código (item)**: 
   - No puede estar vacío
   - Máximo 15 caracteres
   - Debe ser único (no puede haber duplicados en tu archivo)

2. **Nombre (title)**:
   - No puede estar vacío
   - Se recomienda ser descriptivo

3. **Precio (price)**:
   - Debe ser un número entero
   - Debe ser mayor a 0
   - No incluyas símbolo de pesos ($) ni puntos de separación de miles

4. **Género (gender)**:
   - Solo: `Hombre` o `Mujer`
   - El sistema normalizará variaciones como "hombre", "masculino", "mujer", "femenino"

5. **Stock (stock_xs, stock_s, stock_m, stock_l, stock_xl)**:
   - Deben ser números enteros >= 0
   - Si no especificas, se asume 0

---

## 🎯 Pasos para Importar

1. **Descarga la plantilla** desde el software:
   - Opción 1: Botón "📥 CSV" para descargar plantilla CSV
   - Opción 2: Botón "📥 Excel" para descargar plantilla XLSX
2. **Completa tus datos** en la plantilla (Excel o CSV)
3. **Guarda el archivo** en el formato que descargaste
4. **En el software**, ve a "Inventario" → Botón "📥 Importar Excel"
5. **Selecciona tu archivo** (puede ser .xlsx, .csv o .txt)
6. **Revisa la vista previa** de los productos a importar
7. **Confirma** la importación con el botón "✓ Importar"

---

## ❌ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Falta código/item" | Columna `item` está vacía | Completa el código único |
| "Falta nombre del producto" | Columna `title` está vacía | Agrega el nombre |
| "Precio inválido" | Precio = 0 o no es número | Asegúrate de poner un número > 0 |
| "Género debe ser: Hombre o Mujer" | Campo `gender` tiene otro valor | Usa solo "Hombre" o "Mujer" |
| "Stock debe ser un número >= 0" | Campos de stock tienen letras/negativos | Usa números positivos o deja en blanco |

---

## 📥 Plantilla Descargable

El software genera automáticamente plantillas que puedes descargar:

### **Opción 1: Plantilla Excel** (Recomendado)
- Clic en "📥 Importar Excel" → "📥 Excel"
- Se descarga: `plantilla_productos.xlsx`
- Abre en Excel
- Completa tus productos
- Guarda el archivo
- Sube directamente desde el software

**Ventajas:**
- ✅ Interfaz visual familiar de Excel
- ✅ Validación de datos integrada
- ✅ Fácil formateo y edición
- ✅ Estructura clara con columnas

### **Opción 2: Plantilla CSV** 
- Clic en "📥 Importar Excel" → "📥 CSV"
- Se descarga: `plantilla_productos.csv`
- Abre en Excel, Google Sheets, Notepad, etc.
- Completa tus productos
- Guarda como CSV
- Sube desde el software

**Ventajas:**
- ✅ Compatible con cualquier editor
- ✅ Formato universal
- ✅ Tamaño de archivo pequeño

---

## 📋 Cómo Completar la Plantilla

### Si usas **Excel**:
1. Descarga `plantilla_productos.xlsx`
2. Abre el archivo en Excel
3. Mantén el encabezado (primera fila)
4. Llena tus productos en las siguientes filas
5. Guarda: **Ctrl+S** o **File → Save**
6. Sube el archivo `.xlsx`

### Si usas **CSV en Excel**:
1. Descarga `plantilla_productos.csv`
2. Abre en Excel (click derecho → Abrir con → Excel)
3. Llena tus datos
4. **Guardar Como → CSV (Delimitado por comas) (.csv)**
5. Sube el archivo `.csv`

### Si usas **Notepad o editor de texto**:
1. Descarga `plantilla_productos.csv`
2. Abre con Notepad o VSCode
3. Completa los datos (separados por comas)
4. Guarda como `.txt` o `.csv`
5. Sube el archivo

### Si usas **Google Sheets**:
1. Descarga `plantilla_productos.csv`
2. Ve a **Google Sheets** → Nuevo documento
3. **Archivo → Importar → Subir → Reemplazar hojas**
4. Llena tus datos
5. **Descargar → CSV**
6. Sube a Trendo POS

---

## 📊 Características de Importación

✅ Importación desde Excel (.xlsx)
✅ Importación desde CSV (.csv)
✅ Importación desde TXT (.txt)
✅ Descarga de plantillas (Excel o CSV)
✅ Validación automática de datos
✅ Vista previa antes de importar
✅ Sincronización con Supabase
✅ Manejo de datos en línea y sin conexión
✅ Mensajes de error detallados
✅ Importación masiva (hasta 1000 productos)

---

## 💡 Tips

- La columna `description` es completamente opcional
- Si dejas campos de stock en blanco, se asumirán como 0
- El sistema normalizará automáticamente ciertos valores (género)
- Los códigos (item) deben ser únicos en tu negocio
- Si hay un error, el sistema te mostrará qué productos no se importaron

---

## 📞 Soporte

Si tienes problemas con la importación:
1. Verifica que el archivo sea CSV o TXT
2. Asegúrate de que los datos requeridos estén completos
3. Valida que los números sean correctos
4. Revisa la vista previa antes de confirmar
5. Si persiste, intenta importar productos manualmente

