# Net Income Dashboard

Dashboard de Operating Income con React, Tailwind CSS y datos del CSV.

## Cómo abrir el dashboard (localhost)

**No abras el archivo `index.html` directamente** (doble clic o abrir en el navegador). Eso no funciona. Tienes que levantar el servidor de desarrollo.

### 1. Instalar Node.js (si no lo tienes)

- Entra en [nodejs.org](https://nodejs.org/) y descarga la versión **LTS**.
- Instálalo. Con Homebrew (Mac): `brew install node`.

### 2. Instalar dependencias e iniciar el servidor

Abre una **terminal** (Terminal, iTerm, o la terminal integrada de Cursor), ve a la carpeta del proyecto y ejecuta:

```bash
cd "/Users/m.bianchi/Net Income Project"
npm install
npm run dev
```

### 3. Abrir en el navegador

Cuando termine, verás algo como:

```
  ➜  Local:   http://localhost:5173/
```

**Abre esa URL en el navegador** (http://localhost:5173 o la que muestre). Ahí se verá el dashboard.

Si no se abre nada o ves pantalla en blanco, asegúrate de:
- Haber ejecutado `npm install` y luego `npm run dev`.
- Abrir la URL que muestra Vite (no el archivo `index.html`).
- Usar la misma terminal hasta que quieras cerrar el servidor (Ctrl+C para parar).
