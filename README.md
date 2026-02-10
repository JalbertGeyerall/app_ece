# 📚 App de Horarios de Profesores

Una aplicación web para consultar horarios de profesores de forma rápida y sencilla.

## 🚀 Cómo usar la app en tu móvil

### Opción 1: Probar en el navegador (MÁS RÁPIDO)

1. Abre VS Code en la carpeta del proyecto
2. Instala la extensión "Live Server" en VS Code
3. Haz clic derecho en `index.html` → "Open with Live Server"
4. En tu móvil, abre el navegador y ve a la IP que te muestra (ej: http://192.168.1.100:5500)
5. ¡Ya funciona! Puedes añadirla a tu pantalla de inicio

### Opción 2: Convertir a APK (APP NATIVA)

#### Método A: PWA Builder (más fácil, gratis)
1. Sube tu proyecto a GitHub o a un hosting gratuito como Netlify
2. Ve a https://www.pwabuilder.com/
3. Introduce la URL de tu app
4. Descarga el APK para Android
5. Instala el APK en tu móvil

#### Método B: Capacitor (más profesional)
1. Instala Node.js desde https://nodejs.org
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta estos comandos:
```bash
npm install -g @capacitor/cli
npm init -y
npm install @capacitor/core @capacitor/android
npx cap init "Horarios" "com.tuescuela.horarios" --web-dir .
npx cap add android
npx cap copy
npx cap open android
```
4. En Android Studio, genera el APK

## 📱 Funcionalidades

- **¿Quién da clase AHORA?**: Detecta automáticamente la hora actual y muestra qué profesores están dando clase
- **Buscar profesor**: Encuentra un profesor por nombre
- **Buscar por materia**: Encuentra todas las clases de una materia específica
- **Buscar por curso**: Encuentra todos los profesores que dan clase a un curso

## 📂 Archivos del proyecto

- `index.html` - Estructura de la app
- `styles.css` - Diseño visual
- `app.js` - Lógica y funcionalidad
- `horarios.csv` - Datos de horarios (actualízalo cuando cambie el horario)
- `manifest.json` - Configuración para instalar como app

## 🔄 Actualizar los horarios

Simplemente reemplaza el archivo `horarios.csv` con el nuevo archivo exportado de tu hoja de cálculo.

## 💡 Consejos

- La app funciona offline una vez cargada
- Puedes añadirla a la pantalla de inicio desde el navegador
- Funciona en cualquier dispositivo (móvil, tablet, ordenador)
- No necesita conexión a internet después de la primera carga

## 🆘 Problemas comunes

**No carga los datos**: Asegúrate de que `horarios.csv` está en la misma carpeta que `index.html`

**No se ve bien en el móvil**: Asegúrate de usar Live Server o un servidor web, no abras el archivo directamente

**Quiero cambiar los colores**: Edita el archivo `styles.css` en la sección `:root`

---

Creado con ❤️ para facilitar la consulta de horarios
