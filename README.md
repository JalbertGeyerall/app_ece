# 📚 Eina Cap Estudis - Horaris SMA

Aplicació web per consultar horaris de professors i alumnes de l'escola Santa Maria dels Apòstols.

## 🚀 Funcionalitats

- **Qui fa classe ara?** - Consulta automàtica de classes en curs
- **Qui fa classe / hora?** - Cercar per dia i hora específics
- **Horari Professor** - Veure horari complet de qualsevol professor
- **Horari Curs** - Consultar horari d'un curs amb optatives desplegables
- **Suplències** - Llistat de suplències actualitzat diàriament

## 💾 Dades

- **Horaris:** Google Sheets publicat com CSV (caché localStorage)
- **Suplències:** Apps Script que concatena totes les pestanyes
- **Actualització:** Automàtica cada cop que s'obre l'app

## 🎨 Tecnologies

- HTML5 + CSS3 + Vanilla JavaScript
- PWA (Progressive Web App)
- Icones: Phosphor Icons
- Tipografia: Playfair Display + DM Sans

## 📱 Instal·lació

### Web
Simplement obre `index.html` en un navegador modern.

### Android APK
1. Puja els fitxers a un servidor web o GitHub Pages
2. Usa [PWA Builder](https://www.pwabuilder.com/) per generar l'APK
3. Instal·la l'APK directament (no cal Play Store)

## 📂 Estructura

```
/
├── index.html          # Interfície principal
├── styles.css          # Estils i paleta corporativa
├── app.js              # Lògica de l'aplicació
├── horarios.csv        # Horaris locals (fallback)
├── manifest.json       # Config PWA
└── README.md
```

## 🔧 Configuració

### URL dels horaris
Edita `app.js` línia 8:
```javascript
const CSV_URL = 'URL_DEL_TEU_GOOGLE_SHEET';
```

### URL de suplències
Edita `app.js` línia 9:
```javascript
const SUPLENCIES_URL = 'URL_DEL_TEU_APPS_SCRIPT';
```

### Apps Script per suplències
```javascript
function doGet() {
  const ss = SpreadsheetApp.openById('ID_DEL_SHEET');
  const sheets = ss.getSheets();
  let csvContent = '';
  
  for (const sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    for (const row of data) {
      csvContent += row.map(cell => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',') + '\n';
    }
    csvContent += '\n\n';
  }
  
  return ContentService.createTextOutput(csvContent).setMimeType(ContentService.MimeType.TEXT);
}
```

Desplegar com a **Aplicació web** amb accés **Qualsevol persona**.

## 🎨 Paleta de colors

- **Granat** (#7B1C2E) - Capçalera
- **Or** (#E8B84B) - Logo i accents
- **Gris** (#888888) - Subcapçaleres
- **Antracita** (#2C2C3A) - Textos
- **Blau pissarra** (#4A90A4) - Dies senars
- **Verd sàlvia** (#5D8A6A) - Dies parells

## 📄 Llicència

© 2025 Santa Maria dels Apòstols. Tots els drets reservats.

---

Desenvolupat amb ❤️ per l'escola SMA
