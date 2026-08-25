# The Grand Tour Company

Sitio estático construido con artboards de **Claude Design** (`.dc.html`) sobre el
runtime `support.js`, que renderiza las plantillas `<x-dc>` con React en el navegador.

## Estructura

| Ruta pública        | Archivo                  |
|---------------------|--------------------------|
| `/`                 | `TGTC Website.dc.html`   |
| `/grand-tour-index` | `Index.dc.html`          |
| `/intelligence`     | `Intelligence.dc.html`   |
| `/governance`       | `Governance.dc.html`     |
| `/desire`           | `Desire.dc.html`         |
| `/production`       | `Production.dc.html`     |
| `/growth`           | `Growth.dc.html`         |

Los nombres de archivo se conservan a propósito: `TGTC Site.dc.html` es el
contenedor del canvas de diseño y referencia cada artboard por nombre
(`data-dc-src`). Renombrar los archivos rompería la edición en Claude Design, así
que las URLs limpias se resuelven con `rewrites` en `vercel.json`.

`TGTC Site.dc.html`, `uploads/` y `.thumbnail` quedan fuera del deploy vía
`.vercelignore`: son herramientas de diseño, no páginas públicas.

## Dependencias de runtime

React 18.3.1 y ReactDOM están auto-hospedados en
`vendor/`. Los hashes SHA-384 coinciden con los SRI que `support.js` espera.
Babel Standalone no se auto-hospeda a propósito: solo lo carga el sistema
`x-import` para módulos JSX, que este sitio no usa en ninguna página. Si algún
día se usara, cae al CDN igual que antes.
El override se inyecta en el `<head>` de cada página mediante
`window.__resources`, el mecanismo que el propio runtime consulta antes de
recurrir al CDN. El sitio ya no depende de `unpkg.com` en runtime.

Las tipografías siguen viniendo de Google Fonts.

## Antes de publicar

1. **Fijar el dominio.** El placeholder `https://thegrandtourcompany.com` aparece
   en los `<link rel="canonical">`, `og:url`, `og:image` de las 7 páginas y en
   `robots.txt` / `sitemap.xml`. Sustituirlo por el dominio real:

   ```sh
   grep -rl 'thegrandtourcompany.com' . --include='*.dc.html' --include='*.xml' --include='*.txt' \
     | xargs sed -i '' 's|https://thegrandtourcompany.com|https://TU-DOMINIO|g'
   ```

2. **Configurar el formulario de Dispatch.** En Vercel → Settings → Environment
   Variables:

   | Variable         | Valor                                            |
   |------------------|--------------------------------------------------|
   | `RESEND_API_KEY` | clave de [Resend](https://resend.com)             |
   | `DISPATCH_TO`    | buzón interno que recibe las solicitudes          |
   | `DISPATCH_FROM`  | remitente verificado en Resend                    |

   Sin ellas, `api/dispatch.js` responde `503` y el botón muestra
   `Failed — retry →`. Nunca confirma un envío que no ocurrió.

## Desarrollo local

`vercel dev` aplica los rewrites y levanta la función de `api/`.
Un `python3 -m http.server` sirve los archivos pero **no** resuelve `/` ni las
URLs limpias — hay que pedir `TGTC Website.dc.html` directamente.
