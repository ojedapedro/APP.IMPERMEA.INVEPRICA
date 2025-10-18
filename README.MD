# Informe de Inspección - Impermeabilización (Web App)

Proyecto: web app que captura inspecciones, fotos, genera presupuesto con desglose y exporta PDF. Además guarda registros en Google Sheets.

## Estructura
- `index.html` — UI principal
- `styles.css` — estilos
- `app.js` — lógica front-end (previsualización, cálculo, PDF, POST a Apps Script)
- `config.js` — URL del Apps Script (API)

## Requisitos
- Google Spreadsheet con ID: `1WXClyKWUMIzNedfWvbrS7PLAUOyb9UFlgp94BkAMZ98` (o usa tu propio ID y actualiza `Code.gs` y `config.js`)
- Apps Script deploy: pegar `Code.gs` en un proyecto de Apps Script y desplegar como Web App
  - Ejecutar como: **TÚ** (propietario)
  - Acceso: **Anyone, even anonymous** (si quieres acceso público desde la web)
  - Conceder permisos: acceso a Drive y Sheets

## Despliegue frontend
Puedes publicar este repo en GitHub y activar GitHub Pages (branch `main`) o hostear en Netlify/Vercel.

## Notas
- Si la organización limita "Anyone", deberás autenticar y usar OAuth; este ejemplo usa acceso público del Web App.
