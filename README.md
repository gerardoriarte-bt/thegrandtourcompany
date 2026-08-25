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

El sitio está publicado en **https://grandtour.company**. El apex es el dominio
principal: `www` redirige a él y el alias `thegrandtourcompany.vercel.app`
también, mediante un redirect condicionado por host en `vercel.json`.

Si el dominio cambiara:

```sh
grep -rl 'grandtour.company' . --include='*.dc.html' --include='*.xml' --include='*.txt' \
  | xargs sed -i '' 's|https://grandtour.company|https://NUEVO-DOMINIO|g'
```

Queda pendiente:

1. **Configurar el formulario de Dispatch.** En Vercel → Settings → Environment
   Variables:

   | Variable         | Valor                                            |
   |------------------|--------------------------------------------------|
   | `RESEND_API_KEY` | clave de [Resend](https://resend.com)             |
   | `DISPATCH_TO`    | buzón interno que recibe las solicitudes          |
   | `DISPATCH_FROM`  | remitente verificado en Resend                    |

   Sin ellas, `api/dispatch.js` responde `503` y el botón muestra
   `Failed — retry →`. Nunca confirma un envío que no ocurrió.

## Desarrollo local

```sh
node dev-server.mjs          # http://localhost:3000
PORT=4000 node dev-server.mjs
```

`dev-server.mjs` lee `vercel.json` y aplica los mismos redirects, rewrites y
cabeceras, y ejecuta la función de `api/`. Sin dependencias y sin necesidad de
cuenta de Vercel. Queda fuera del despliegue vía `.vercelignore`.

`vercel dev` también sirve y es la implementación de referencia, pero exige
iniciar sesión en Vercel.

Un `python3 -m http.server` **no** vale: sirve los archivos pero no resuelve `/`
ni las URLs limpias, que solo existen como rewrites de `vercel.json`.

Para probar el formulario de punta a punta:

```sh
RESEND_API_KEY=re_xxx DISPATCH_TO=tu@correo.com DISPATCH_FROM=dispatch@tudominio \
  node dev-server.mjs
```
