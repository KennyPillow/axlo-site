// Servidor local para testes: serve dist/ como a Vercel (URLs sem .html), roda as funções de api/
// e simula o Kommo em /__kommo, gravando tudo o que chega em .kommo-mock.json.
//   npm run build && npm run dev   →  http://localhost:3040

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const PORT = Number(process.env.PORT || 3040);
const DIST = path.resolve('dist');
const LOG = path.resolve('.kommo-mock.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.yml': 'text/yaml',
  '.webmanifest': 'application/manifest+json',
};

// por padrão as funções falam com o Kommo simulado deste servidor
process.env.KOMMO_BASE_URL ??= `http://localhost:${PORT}/__kommo`;
process.env.KOMMO_TOKEN ??= 'token-de-teste';
process.env.KOMMO_PIPELINE_ID ??= '1001';
process.env.KOMMO_STATUS_ID ??= '2002';

const readBody = req =>
  new Promise(r => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => r(b));
  });

async function mockKommo(req, res, url) {
  const body = await readBody(req);
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
  const entry = {
    at: new Date().toISOString(),
    method: req.method,
    path: url.pathname.replace('/__kommo', ''),
    auth: req.headers.authorization,
    body: body ? JSON.parse(body) : null,
  };
  log.push(entry);
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
  res.setHeader('content-type', 'application/json');
  if (process.env.MOCK_FAIL === '1') {
    res.statusCode = 500;
    return res.end('{"title":"falha simulada"}');
  }
  if (entry.path === '/api/v4/leads/complex')
    return res.end(
      JSON.stringify([{ id: 900000 + log.length, contact_id: 1, company_id: 2, request_id: ['0'], merged: false }]),
    );
  if (entry.path === '/api/v4/leads/notes') return res.end(JSON.stringify({ _embedded: { notes: [{ id: 1 }] } }));
  res.statusCode = 404;
  res.end('{}');
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith('/__kommo')) return mockKommo(req, res, url);
    if (url.pathname.startsWith('/api/')) {
      const file = path.resolve('api', `${url.pathname.slice(5)}.js`);
      if (!fs.existsSync(file)) {
        res.statusCode = 404;
        return res.end('não encontrado');
      }
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      return mod.default(req, res);
    }
    const p = decodeURIComponent(url.pathname);
    const candidates = p.endsWith('/') ? [`${p}index.html`] : [p, `${p}.html`, `${p}/index.html`];
    for (const c of candidates) {
      const f = path.join(DIST, c);
      if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        const ext = path.extname(f);
        res.setHeader('content-type', TYPES[ext] || 'application/octet-stream');
        // comprime texto como a Vercel faz em produção, para as medições de performance serem realistas
        if (
          /\.(html|css|js|json|svg|xml|txt|yml|webmanifest)$/.test(ext) &&
          /gzip/.test(req.headers['accept-encoding'] || '')
        ) {
          res.setHeader('content-encoding', 'gzip');
          return fs.createReadStream(f).pipe(zlib.createGzip()).pipe(res);
        }
        return fs.createReadStream(f).pipe(res);
      }
    }
    res.statusCode = 404;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
  })
  .listen(PORT, () =>
    console.log(`AXLO local em http://localhost:${PORT} (Kommo simulado em ${process.env.KOMMO_BASE_URL})`),
  );
