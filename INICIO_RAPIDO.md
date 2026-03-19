# ⚡ INICIO RÁPIDO - Accesibilidad en Configuración

## 🎯 En 30 segundos

**¿Cómo acceder?**
1. Abre la aplicación POS
2. Ve a → **Configuración** (en el menú)
3. ¡Listo! Todas las opciones visibles

---

## 🎮 Opciones Principales

### 1️⃣ TEMA
```
Modo oscuro (ON/OFF)
Alto contraste (ON/OFF)
Modo compacto (ON/OFF)
Animaciones (ON/OFF)
Tamaño: S, M, L, XL (90%-130%)
```

### 2️⃣ NÚMEROS Y PRECIOS
```
Separador:    1.000.000 | 1,000,000 | 1000000
Decimales:    0 | 1 | 2
Preview:      $1.500,00 (actualiza en tiempo real)
```

### 3️⃣ SONIDOS
```
Sonidos: ON/OFF
Probar: Escucha beep de 440Hz
```

### 4️⃣ SESIÓN
```
Auto-logout: 5-120 minutos (default 30)
Slider interactivo
```

### 5️⃣ CUENTA
```
Editar Perfil:
├── Cambiar nombre
├── Cambiar email
└── Cambiar contraseña (mínimo 6 caracteres)
```

---

## 💡 Recomendaciones Rápidas

### Para **Ver Más Datos**
- ✅ Activa Modo compacto
- ✅ Tamaño de fuente: Normal (M)
- ✅ Desactiva animaciones

### Para **Mejor Legibilidad**
- ✅ Tamaño de fuente: Grande (L)
- ✅ Alto contraste: ON
- ✅ Modo oscuro: ON

### Para **Velocidad**
- ✅ Modo compacto: ON
- ✅ Animaciones: OFF
- ✅ Sonidos: OFF

### Para **Ambientes Ruidosos**
- ✅ Sonidos: ON
- ✅ Prueba el sonido primero
- ✅ Auto-logout: 15 min

---

## 🔍 Verificar Configuración

**DevTools (F12):**
1. Application → LocalStorage
2. Busca claves `pref_*`
3. Verifica que se guardaron

---

## ⚙️ Para Desarrolladores

**Usar en tu componente:**

```javascript
import { PreferencesManager } from '@/lib/preferences'

// Obtener preferencia
const darkMode = PreferencesManager.get('darkMode')

// Formatear número
const num = PreferencesManager.formatNumber(1500000) // "1.500.000"

// Formatear precio
const price = PreferencesManager.formatPrice(1500.99) // "1.500,99"
```

**Más ejemplos en**: `EJEMPLOS_PREFERENCES.js`

---

## 📚 Documentación

| Archivo | Para |
|---------|------|
| **ACCESIBILIDAD_GUIDE.md** | 📖 Guía de usuario |
| **RESUMEN_ACCESIBILIDAD.md** | 🔧 Documentación técnica |
| **EJEMPLOS_PREFERENCES.js** | 💻 Código de ejemplo |
| **TEST_CHECKLIST.md** | ✅ Pruebas |
| **IMPLEMENTACION_COMPLETA.md** | 📊 Resumen ejecutivo |

---

## 🆘 Problemas Comunes

**P: No veo las opciones nuevas**  
R: Recarga la página (F5)

**P: Los cambios no se guardan**  
R: Verifica DevTools → Application → LocalStorage

**P: El sonido no funciona**  
R: Revisa si está activado en preferencias

**P: Quiero usar esto en otro componente**  
R: Importa `PreferencesManager` desde `@/lib/preferences`

---

**¡Disfruta de las nuevas opciones de accesibilidad!** 🚀
