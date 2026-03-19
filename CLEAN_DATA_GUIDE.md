# 🧹 LIMPIEZA DE DATOS LOCALES

Este documento explica cómo limpiar todo el almacenamiento local del software POS Trendo para comenzar con una base de datos limpia.

## ¿Qué se elimina?

Cuando ejecutas la limpieza, se eliminan:

✂️ **LocalStorage** - Preferencias, datos de usuario, configuraciones
✂️ **SessionStorage** - Datos de la sesión actual  
✂️ **IndexedDB (Dexie)** - Base de datos local con todas las transacciones, clientes, productos, etc.

## Formas de Limpiar los Datos

### Opción 1: A través de la UI (Recomendado)

1. **Abre la aplicación POS Trendo**
2. **Ve a Configuración** (ícono de engranaje)
3. **Desplázate a la sección "Gestión de Datos"**
4. **Click en "Limpiar Todo el Almacenamiento"**
5. **Confirma en el modal** (es destructivo, ten cuidado)
6. **La aplicación se recargará automáticamente**

### Opción 2: Consola del Navegador

Si prefieres ejecutar un comando manualmente:

1. **Abre DevTools** (presiona F12)
2. **Ve a la pestaña "Console"**
3. **Copia y pega este comando:**

```javascript
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  Promise.all(dbs.map(db => new Promise(r => indexedDB.deleteDatabase(db.name).onsuccess = r)))
    .then(() => {
      console.log('✅ LIMPIEZA COMPLETA - La aplicación se recargará...');
      location.reload();
    });
});
```

4. **Presiona Enter**
5. **La aplicación se recargará automáticamente**

### Opción 3: Script JavaScript

```javascript
import { clearAllLocalData } from '@/utils/clearAllData'

// Ejecuta la limpieza
await clearAllLocalData()

// La aplicación se recargará
```

## Después de Limpiar

✅ **LocalStorage**: Vacío
✅ **SessionStorage**: Vacío  
✅ **IndexedDB**: Todos los "databases" eliminados
✅ **Aplicación**: Se recarga automáticamente

## Pasos Siguientes

1. **Logéate nuevamente** si es necesario
2. **Ve a las Tablas de Supabase** y elimina los datos que desees:
   - `customer` - Elimina clientes
   - `bill` - Elimina facturas
   - `sale` - Elimina ventas
   - `product` - Elimina productos (opcional)
   - etc.
3. **Comienza a agregar datos nuevamente** desde cero

## ⚠️ IMPORTANTE

🔴 **NO HAY VUELTA ATRÁS** - Esta acción es permanente y no se puede deshacer
🔴 **Haz un backup** antes si tienes datos importantes
🔴 **Esto solo limpia el cliente** - Debes eliminar los datos de Supabase por separado si lo deseas

---

**Creado:** December 10, 2025  
**Última actualización:** December 10, 2025
