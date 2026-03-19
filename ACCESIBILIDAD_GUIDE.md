# 🎯 Guía: Nuevas Opciones de Accesibilidad en Configuración

## ✅ Funcionalidades Implementadas

### 1️⃣ **Tema y Visualización**
- **Modo oscuro**: Activar/desactivar tema oscuro para reducir fatiga visual
- **Alto contraste**: Mayor contraste visual para mejor legibilidad
- **Modo compacto**: Reducir espacios entre elementos para ver más datos
- **Animaciones**: Activar/desactivar transiciones suaves
- **Tamaño de fuente**: 5 opciones de tamaño (S, M, L, XL - 90% a 130%)

### 2️⃣ **Formato de Números y Precios**
- **Separador de miles**: 
  - `1.000.000` (Puntos - Por defecto)
  - `1,000,000` (Comas)
  - `1000000` (Sin separador)
- **Decimales en precios**: 0, 1 o 2 decimales
- **Vista previa**: Ve cómo se verá tu número antes de aplicar

### 3️⃣ **Notificaciones y Sonidos**
- **Sonidos de confirmación**: Reproducer beep al completar acciones
- **Botón de prueba**: Escucha el sonido antes de aplicar
- **Ideal para**: Ambientes ruidosos donde necesitas confirmación auditiva

### 4️⃣ **Sesión y Seguridad**
- **Auto-logout**: Cierra sesión automáticamente si no hay actividad
- **Rango**: 5 a 120 minutos (por defecto 30 minutos)
- **Protección**: Evita que otros usuarios accedan si dejas la máquina desatendida

### 5️⃣ **Cuenta**
- **Editar perfil**: Cambiar nombre, email y contraseña
- **Avatar dinámico**: Muestra la inicial de tu nombre
- **Sincronización**: Los cambios se guardan en Supabase automáticamente

---

## 🔧 Cómo Usar en Otros Componentes

### Importar el gestor de preferencias:

```javascript
import { PreferencesManager } from '@/lib/preferences'

// Obtener todas las preferencias
const prefs = PreferencesManager.getAll()

// Obtener una preferencia específica
const darkMode = PreferencesManager.get('darkMode', false)
const compactMode = PreferencesManager.get('compactMode', false)

// Formatear números
const formatted = PreferencesManager.formatNumber(1500000)  // "1.500.000"

// Formatear precios
const price = PreferencesManager.formatPrice(1500.50)  // "1.500,50"

// Verificar animaciones
if (PreferencesManager.hasAnimations()) {
  // Mostrar animación
}

// Obtener clase CSS para animaciones
const animClass = PreferencesManager.getAnimationClass()  // "transition-all duration-300" o ""

// Obtener padding según modo compacto
const padding = PreferencesManager.getPaddingClass()  // "p-2" o "p-4"
```

### Ejemplo en Componente React:

```javascript
import { PreferencesManager } from '@/lib/preferences'

export function MiComponente() {
  const darkMode = PreferencesManager.get('darkMode', false)
  const compactMode = PreferencesManager.get('compactMode', false)
  const padding = PreferencesManager.getPaddingClass()

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className={`${padding} ${compactMode ? 'space-y-2' : 'space-y-4'}`}>
        {/* Tu contenido */}
      </div>
    </div>
  )
}
```

---

## 📊 Preferencias Guardadas en localStorage

Todas las preferencias se guardan automáticamente en el navegador:

```
pref_dark              → '1' o '0' (Modo oscuro)
pref_contrast          → '1' o '0' (Alto contraste)
pref_font_scale        → '0.9' a '1.3' (Tamaño de fuente)
pref_compact           → '1' o '0' (Modo compacto)
pref_animations        → '1' o '0' (Animaciones)
pref_number_format     → 'dots' | 'commas' | 'none'
pref_decimals          → '0' | '1' | '2'
pref_sound             → '1' o '0' (Sonidos)
pref_session_timeout   → '5' a '120' (Minutos)
```

---

## 🎨 Clases Tailwind Útiles

Para aprovechar las nuevas preferencias en tus componentes:

```jsx
{/* Modo compacto: menos padding */}
<div className={PreferencesManager.get('compactMode') ? 'p-2' : 'p-4'}>

{/* Animaciones suaves */}
<button className={`${PreferencesManager.getAnimationClass()} hover:bg-blue-600`}>
  Click
</button>

{/* Respeta alto contraste */}
<div className={PreferencesManager.get('highContrast') ? 'text-black dark:text-white' : 'text-gray-700'}>
  Texto
</div>
```

---

## 🚀 Próximas Mejoras Sugeridas

1. **Exportar/Importar configuración**: Guardar y restaurar todas las preferencias
2. **Temas predefinidos**: Combinaciones rápidas (light, dark, highcontrast, etc.)
3. **Atajo de teclado**: Ctrl+Shift+P para abrir Configuración rápidamente
4. **Historial de cambios**: Ver cuándo se realizaron cambios de configuración
5. **Perfil de accesibilidad**: Presets para usuarios con diferentes necesidades

---

## 📝 Notas Importantes

- ✅ Todas las preferencias se guardan **localmente en el navegador**
- ✅ Los cambios de perfil se **sincronizan automáticamente** a Supabase
- ✅ El sonido usa un **oscilador de 440Hz** (sonido estándar de confirmación)
- ✅ La sesión se cierra **automáticamente** sin guardar cambios pendientes
- ⚠️ **No olvides guardar** datos importantes antes de que expire la sesión

---

## 💡 Tips de Accesibilidad

1. **Para usuarios con baja visión**: Usa tamaño XL + Alto contraste + Modo oscuro
2. **Para trabajo rápido**: Activar Modo compacto + Desactivar animaciones
3. **Para entornos ruidosos**: Activar Sonidos de confirmación
4. **Para seguridad**: Configurar Auto-logout a 15-20 minutos
5. **Para legibilidad financiera**: Usar formato de números con puntos + 2 decimales

