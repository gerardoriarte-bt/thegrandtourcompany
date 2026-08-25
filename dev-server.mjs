#!/usr/bin/env node
// Servidor de desarrollo local. Reproduce las reglas de vercel.json
// (redirects, rewrites, headers) y ejecuta las funciones de api/.
//
//   node dev-server.mjs                 -> http://localhost:3000
//   PORT=4000 node dev-server.mjs
//
// A diferencia de `vercel dev` no requiere cuenta de Vercel, y a diferencia de
// `python3 -m http.server` si resuelve "/" y las URLs limpias.
//
// Para probar el formulario de Dispatch de punta a punta:
//   RESEND_API_KEY=re_xxx DISPATCH_TO=tu@correo.com DISPATCH_FROM=dispatch@dominio \
//     node dev-server.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const require = createRequire(import.meta.url);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const REDIRECTS = new Map((cfg.redirects || []).map(r => [decodeURIComponent(r.source), r.destination]));
const REWRITES  = new Map((cfg.rewrites  || []).map(r => [r.source, decodeURIComponent(r.destination)]));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8'
};

// Cabeceras globales de vercel.json. HSTS se omite: no tiene sentido sobre http
// y dejaria el localhost fijado a https en el navegador.
const GLOBAL_HEADERS = (cfg.headers || [])
  .filter(h => h.source === '/(.*)')
  .flatMap(h => h.headers)
  .filter(h => h.key !== 'Strict-Transport-Security');

function shimResponse(res) {
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}

async function runFunction(file, req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
  delete require.cache[require.resolve(file)];   // recarga en cada peticion
  await require(file)(req, shimResponse(res));
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  for (const h of GLOBAL_HEADERS) res.setHeader(h.key, h.value);

  if (REDIRECTS.has(pathname)) {
    res.statusCode = 308;
    res.setHeader('Location', REDIRECTS.get(pathname));
    console.log(`308 ${pathname} -> ${REDIRECTS.get(pathname)}`);
    return res.end();
  }

  if (pathname.startsWith('/api/')) {
    const fn = path.join(ROOT, pathname.replace(/^\//, '') + '.js');
    if (fn.startsWith(ROOT) && fs.existsSync(fn)) {
      try { await runFunction(fn, req, res); }
      catch (e) { console.error(e); res.statusCode = 500; res.end('function error'); }
      return console.log(`${res.statusCode} ${req.method} ${pathname}  (api)`);
    }
  }

  const target = REWRITES.get(pathname) || pathname;
  const file = path.join(ROOT, target);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end('forbidden'); }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    if (target.startsWith('/vendor/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    console.log(`200 ${pathname}${target !== pathname ? '  -> ' + target : ''}`);
    return fs.createReadStream(file).pipe(res);
  }

  res.statusCode = 404;
  console.log(`404 ${pathname}`);
  res.end('404');
});

server.listen(PORT, () => {
  console.log(`\n  The Grand Tour Company — dev local`);
  console.log(`  http://localhost:${PORT}\n`);
  for (const s of REWRITES.keys()) console.log(`    http://localhost:${PORT}${s}`);
  if (!process.env.RESEND_API_KEY) console.log(`\n  (api/dispatch responde 503: faltan RESEND_API_KEY / DISPATCH_TO / DISPATCH_FROM)`);
  console.log('');
});
