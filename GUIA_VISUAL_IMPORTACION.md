# 🎨 Interfaz de Importación - Guía Visual

## Cómo se ve en el Software

### Paso 1: Botón de Importación
```
┌────────────────────────────────────────────────────────────┐
│ Inventario - Productos                                     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  [📥 Importar Excel]  [+ Agregar Producto]                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Código | Nombre | Precio | Stock Total | Acciones │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ...   │  ...   │  ...   │     ...      │    ...   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Paso 2: Modal de Importación - Sección de Descarga
```
╔════════════════════════════════════════════════════════════╗
║  Importar Productos                                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ℹ️  Sube un archivo CSV, TXT o XLSX con tus productos.   ║
║      Usa la plantilla para asegurar el formato correcto.  ║
║                                                            ║
║  [📥 CSV]    [📥 Excel]                                   ║
║                                                            ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ 📂 Seleccionar Archivo                               │ ║
║  │ (O arrastra tu archivo aquí)                         │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  [Cancelar]                                                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Paso 3: Después de Seleccionar Archivo - Vista Previa
```
╔════════════════════════════════════════════════════════════╗
║  Importar Productos                                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✓ 8 productos listos para importar                       ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ Código      │ Nombre           │ Precio  │ Género  │   ║
║  ├─────────────┼──────────────────┼─────────┼─────────┤   ║
║  │ CAMISETA001 │ Camiseta Blanca  │ $25.000 │ Hombre  │   ║
║  │ JEAN002     │ Jean Azul Oscuro │ $65.000 │ Mujer   │   ║
║  │ ZAPATOS003  │ Tenis Deportivos │ $85.000 │ Hombre  │   ║
║  │ VESTIDO004  │ Vestido Negro    │ $95.000 │ Mujer   │   ║
║  │ SUDADERA005 │ Sudadera Gris    │ $45.000 │ Hombre  │   ║
║  │ BOLSO006    │ Bolso Crossbody  │ $55.000 │ Mujer   │   ║
║  │ CORREA007   │ Correa de Cuero  │ $18.000 │ Hombre  │   ║
║  │ GORRO008    │ Gorro Deportivo  │ $22.000 │ Hombre  │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  [Atrás]                [✓ Importar]                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Paso 4: Importación Exitosa
```
╔════════════════════════════════════════════════════════════╗
║  Importar Productos                                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✓ ¡Importación completada!                              ║
║                                                            ║
║  Se importaron 8 productos exitosamente                   ║
║                                                            ║
║  [Cerrar]                                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## Ejemplo de Plantilla Descargada

### plantilla_productos.xlsx (En Excel)
```
┌──────────────┬────────────────────┬───────┬────────┬────────┬────┬────┬────┬────┬────┬──────────────────┐
│ A            │ B                  │ C     │ D      │ E      │ F  │ G  │ H  │ I  │ J  │ K                │
├──────────────┼────────────────────┼───────┼────────┼────────┼────┼────┼────┼────┼────┼──────────────────┤
│ item         │ title              │ price │ gender │stock_xs│ s  │ m  │ l  │ xl │    │ description      │
├──────────────┼────────────────────┼───────┼────────┼────────┼────┼────┼────┼────┼────┼──────────────────┤
│CAMISETA001   │Camiseta Blanca     │25000  │Hombre  │ 5      │10  │15  │8   │3   │    │Algodón 100%      │
├──────────────┼────────────────────┼───────┼────────┼────────┼────┼────┼────┼────┼────┼──────────────────┤
│JEAN002       │Jean Azul Oscuro    │65000  │Mujer   │ 2      │5   │8   │6   │1   │    │Tiro alto         │
├──────────────┼────────────────────┼───────┼────────┼────────┼────┼────┼────┼────┼────┼──────────────────┤
│              │                    │       │        │        │    │    │    │    │    │                  │
│   (más...)   │     (más...)       │       │        │        │    │    │    │    │    │     (más...)     │
│              │                    │       │        │        │    │    │    │    │    │                  │
└──────────────┴────────────────────┴───────┴────────┴────────┴────┴────┴────┴────┴────┴──────────────────┘
```

### plantilla_productos.csv (En Notepad/VSCode)
```csv
item,title,price,gender,stock_xs,stock_s,stock_m,stock_l,stock_xl,description
CAMISETA001,Camiseta Blanca,25000,Hombre,5,10,15,8,3,Algodón 100%
JEAN002,Jean Azul Oscuro,65000,Mujer,2,5,8,6,1,Tiro alto
```

---

## Flujo Completo de Importación

```
INICIO
  │
  ├─→ Usuario abre "Inventario"
  │
  ├─→ Hace clic en botón "📥 Importar Excel"
  │
  ├─→ Se abre modal de importación
  │
  ├─→ OPCIÓN 1: Descargar plantilla
  │   ├─→ Botón "📥 Excel"      → descarga .xlsx
  │   └─→ Botón "📥 CSV"        → descarga .csv
  │
  ├─→ Usuario completa la plantilla
  │
  ├─→ Usuario hace clic "Seleccionar Archivo"
  │   └─→ Selecciona su archivo (.xlsx, .csv o .txt)
  │
  ├─→ Sistema valida los datos
  │   ├─→ ✓ Válido → Muestra vista previa
  │   └─→ ✗ Inválido → Muestra errores
  │
  ├─→ Usuario revisa la vista previa
  │
  ├─→ Usuario hace clic "✓ Importar"
  │
  ├─→ Sistema importa los productos
  │   ├─→ Guarda en base de datos local
  │   ├─→ Sincroniza con Supabase
  │   └─→ Muestra mensaje de éxito
  │
  └─→ FIN - Productos disponibles en inventario
```

---

## Mensajes que Verás

### ✓ Éxito
```
✓ Se importaron 8 productos exitosamente
```

### ⚠️ Parcial (algunos errores)
```
✓ Se importaron 7 productos (1 errores)
```

### ❌ Errores Detectados
```
Errores encontrados:

Fila 2: Falta código/item del producto
Fila 5: Precio inválido o menor a 0
Fila 8: Género debe ser: Hombre o Mujer
```

---

## Validaciones Automáticas

El sistema valida automáticamente:

✅ Que el código (item) no esté vacío
✅ Que el nombre (title) no esté vacío
✅ Que el precio sea un número mayor a 0
✅ Que el género sea válido (Hombre o Mujer)
✅ Que el stock sea un número válido (0 o positivo)
✅ Que el formato del archivo sea correcto

Si hay un error, el sistema:
1. Te lo muestra en la lista de errores
2. Te indica la fila exacta del problema
3. Te sugiere qué corregir
4. Importa solo los productos válidos

---

## Casos de Uso Reales

### 💼 Caso 1: Empezar un negocio nuevo
1. Descarga plantilla Excel
2. Llena 50-100 productos
3. Importa en 2 clics
4. Listo, tu inventario está poblado

### 🔄 Caso 2: Migrar de otro sistema
1. Exporta desde tu sistema anterior como CSV
2. Abre en Excel
3. Ajusta columnas para que coincidan
4. Importa en Trendo POS

### ⚡ Caso 3: Agregar muchos productos
1. Tus proveedores te envían un Excel
2. Lo descargas
3. Lo subes directamente a Trendo POS
4. Sistema valida y importa automáticamente

### 📊 Caso 4: Actualizar datos
1. Descarga plantilla
2. Completa solo los cambios
3. Importa nuevamente
4. El sistema actualiza los registros

---

## Tips Profesionales

💡 **Estandariza tus códigos de producto:**
- CATEGORIA_DESCRIPCION_NUMERO
- Ejemplo: CAMISETA_BLANCA_001

💡 **Mantén los nombres descriptivos pero cortos:**
- ✓ "Camiseta Básica Blanca"
- ✗ "Camiseta color blanca básica hecha en algodón 100%"

💡 **Agrupa productos por género:**
- Primero todos los "Hombre"
- Luego todos los "Mujer"
- Facilita revisión y validación

💡 **Usa plantillas con regularidad:**
- Semanal para nuevos productos
- Mensual para actualizar stock
- Trimestral para cambios de precios

💡 **Guarda copias de seguridad:**
- Copia tu Excel/CSV después de cada importación
- Útil para auditoría y respaldo

---

## Soporte Rápido

**P: ¿Qué extensiones soporta?**
R: .xlsx (Excel), .csv (CSV), .txt (Texto plano)

**P: ¿Puedo importar miles de productos?**
R: Sí, hasta 1000 por archivo (recomendado máximo 500 para mejor rendimiento)

**P: ¿Se sincroniza automáticamente?**
R: Sí, se guarda en tu base de datos local y se sincroniza con la nube

**P: ¿Puedo hacer cambios después de importar?**
R: Sí, edita el producto individual en el sistema o importa nuevamente

**P: ¿Cuál es el mejor formato?**
R: Excel (.xlsx) es más amigable para usuarios; CSV es más universal

