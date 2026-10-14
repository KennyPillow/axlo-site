// Gera o site estático em dist/ a partir de content/ (editado pelo painel Decap) e src/.
//   node scripts/build.mjs                              produção (Vercel)
//   BASE_PATH=/axlo-site PREVIEW=1 node scripts/build.mjs   prévia no GitHub Pages (noindex)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { renderSite } from '../src/templates.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const PREVIEW = process.env.PREVIEW === '1';

const readJSON = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const site = readJSON('content/site.json');
if (process.env.SITE_URL) site.url = process.env.SITE_URL;
site.url = site.url.replace(/\/$/, '');

const paginas = Object.fromEntries(
  fs.readdirSync('content/paginas').filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), readJSON('content/paginas/' + f)])
);
const prodDir = 'content/produtos';
const produtos = fs.existsSync(prodDir)
  ? fs.readdirSync(prodDir).filter(f => f.endsWith('.json')).map(f => readJSON(prodDir + '/' + f)).sort((a, b) => a.ordem - b.ordem)
  : [];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* ---------- arquivos estáticos ---------- */
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true, filter: s => !s.endsWith('.gitkeep') });
};
copyDir('src/fonts', path.join(DIST, 'assets/fonts'));
copyDir('src/assets', path.join(DIST, 'assets'));
copyDir('src/uploads', path.join(DIST, 'uploads'));

// CSS e JS com hash no nome, para o cache do navegador nunca servir versão velha
const hashed = {};
for (const [src, name] of [['src/css/site.css', 'site'], ['src/js/site.js', 'site']]) {
  const ext = path.extname(src);
  let body = fs.readFileSync(src, 'utf8');
  if (ext === '.css') body = body.replaceAll('url(/assets/', `url(${BASE}/assets/`);
  if (ext === '.css') {
    // minifica e guarda para embutir no <head> (CSS bloqueia a renderização; embutido economiza uma ida ao servidor)
    body = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}').trim();
    hashed.inline = body;
  }
  const h = crypto.createHash('md5').update(body).digest('hex').slice(0, 8);
  const out = `assets/${name}.${h}${ext}`;
  fs.writeFileSync(path.join(DIST, out), body);
  hashed[ext.slice(1)] = `${BASE}/${out}`;
}

/* ---------- imagens: WebP em vários tamanhos ---------- */
const images = {};
const WIDTHS = [480, 800, 1200, 1600];
async function prepareImages(dir, publicPrefix) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    const file = path.join(dir, f);
    const meta = await sharp(file).metadata();
    const name = f.replace(/\.[^.]+$/, '');
    const widths = WIDTHS.filter(w => w < meta.width).concat(meta.width > 1600 ? [] : [meta.width]);
    const variants = [];
    for (const w of [...new Set(widths)]) {
      const out = `_img/${name}-${w}.webp`;
      fs.mkdirSync(path.join(DIST, '_img'), { recursive: true });
      await sharp(file).resize({ width: w }).webp({ quality: 78 }).toFile(path.join(DIST, out));
      variants.push({ w, url: `${BASE}/${out}` });
    }
    images[`${publicPrefix}/${f}`] = { w: meta.width, h: meta.height, variants, fallback: `${BASE}${publicPrefix}/${f}` };
  }
}
await prepareImages('src/assets/img', '/assets/img');
await prepareImages('src/uploads', '/uploads');

/* ---------- favicon e imagem de compartilhamento ---------- */
const xBranco = fs.readFileSync('src/assets/brand/axlo-x-branco.svg', 'utf8');
const xInner = xBranco.replace(/^[\s\S]*?<svg[^>]*viewBox="([^"]+)"[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const xViewBox = xBranco.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const faviconSvg = size => {
  const [vx, vy, vw, vh] = xViewBox;
  const s = 0.62 * size / Math.max(vw, vh);
  const tx = (size - vw * s) / 2 - vx * s, ty = (size - vh * s) / 2 - vy * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#280F91"/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">${xInner}</g></svg>`;
};
fs.writeFileSync(path.join(DIST, 'favicon.svg'), faviconSvg(64));
for (const s of [16, 32, 48, 180, 192, 512]) {
  await sharp(Buffer.from(faviconSvg(s))).png().toFile(path.join(DIST, s === 180 ? 'apple-touch-icon.png' : `favicon-${s}.png`));
}
// .ico com PNG 32px embutido (formato aceito por todos os navegadores)
{
  const png = await sharp(Buffer.from(faviconSvg(32))).png().toBuffer();
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(DIST, 'favicon.ico'), Buffer.concat([head, png]));
}
{
  const logo = fs.readFileSync('src/assets/brand/axlo-horizontal-negativa.svg', 'utf8')
    .replace(/<svg /, '<svg x="96" y="200" width="640" height="120" ');
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#140A3F"/>
    <g opacity="0.1" transform="translate(184 -1130) scale(9)">${xInner}</g>
    ${logo}
    <text x="96" y="420" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF">${site.tagline}</text>
    <text x="96" y="476" font-family="Arial, sans-serif" font-size="26" fill="#E2A9F1">${site.descritor.replace('&', '&amp;')}</text>
  </svg>`;
  fs.mkdirSync(path.join(DIST, 'assets/og'), { recursive: true });
  await sharp(Buffer.from(og)).png().toFile(path.join(DIST, 'assets/og/axlo-og.png'));
}
fs.writeFileSync(path.join(DIST, 'site.webmanifest'), JSON.stringify({
  name: `${site.nome} | ${site.descritor}`, short_name: site.nome,
  icons: [{ src: `${BASE}/favicon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${BASE}/favicon-512.png`, sizes: '512x512', type: 'image/png' }],
  theme_color: '#280F91', background_color: '#FFFFFF', display: 'browser', start_url: `${BASE}/`,
}, null, 2));

/* ---------- páginas ---------- */
const pages = renderSite({ site, paginas, produtos, images, base: BASE, preview: PREVIEW, assets: hashed });
const routes = [];
for (const p of pages) {
  const file = p.route === '/' ? 'index.html' : p.route === '/404' ? '404.html' : p.route.slice(1) + '.html';
  const full = path.join(DIST, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, p.html);
  if (!p.noindex) routes.push(p.route);
}

/* ---------- painel Decap ---------- */
fs.mkdirSync(path.join(DIST, 'admin'), { recursive: true });
fs.copyFileSync('admin/index.html', path.join(DIST, 'admin/index.html'));
const cmsRepo = process.env.CMS_REPO || 'KennyPillow/axlo-site';
const cmsBranch = process.env.CMS_BRANCH || 'main';
fs.writeFileSync(path.join(DIST, 'admin/config.yml'),
  fs.readFileSync('admin/config.yml', 'utf8').replaceAll('__CMS_REPO__', cmsRepo).replaceAll('__CMS_BRANCH__', cmsBranch).replaceAll('__SITE_URL__', site.url));

/* ---------- sitemap e robots ---------- */
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.map(r => `  <url><loc>${site.url}${r === '/' ? '/' : r}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), PREVIEW
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${site.url}/sitemap.xml\n`);

/* ---------- checagem de links internos ---------- */
const broken = [];
const exists = url => {
  let p = url.split('#')[0].split('?')[0];
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  if (p === '' || p === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const f = path.join(DIST, decodeURIComponent(p));
  return fs.existsSync(f) && fs.statSync(f).isFile() || fs.existsSync(f + '.html') || fs.existsSync(path.join(f, 'index.html'));
};
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(DIST).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
    for (const raw of m[1].split(',').map(s => s.trim().split(' ')[0])) {
      if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/api/')) continue;
      if (!exists(raw)) broken.push(`${path.relative(DIST, f)} → ${raw}`);
    }
  }
}
console.log(`✔ ${pages.length} páginas, ${Object.keys(images).length} imagens otimizadas, ${routes.length} URLs no sitemap${PREVIEW ? ' (prévia, noindex)' : ''}`);
if (broken.length) {
  console.error(`✖ ${broken.length} link(s) quebrado(s):\n  ` + [...new Set(broken)].join('\n  '));
  process.exit(1);
}
console.log('✔ nenhum link interno quebrado');
