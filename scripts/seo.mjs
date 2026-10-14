// Auditoria de SEO técnico do dist/ (roda depois do build):  node scripts/seo.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const site = JSON.parse(fs.readFileSync('content/site.json', 'utf8'));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pages = walk(DIST).filter(f => f.endsWith('.html') && !f.includes(`${path.sep}admin${path.sep}`));
const problemas = [], titulos = new Map(), descs = new Map();
const linhas = [];

for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = '/' + path.relative(DIST, f).replaceAll('\\', '/').replace(/index\.html$/, '').replace(/\.html$/, '');
  const pega = re => (html.match(re) || [])[1] || '';
  const title = pega(/<title>([^<]*)<\/title>/), desc = pega(/<meta name="description" content="([^"]*)"/);
  const canonical = pega(/<link rel="canonical" href="([^"]*)"/), robots = pega(/<meta name="robots" content="([^"]*)"/);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  const semAlt = (html.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const err = [];
  const t = title.replace(/&amp;/g, '&'), d = desc.replace(/&amp;/g, '&');
  if (rel !== '/404') {
    if (t.length < 20 || t.length > 65) err.push(`title com ${t.length} caracteres`);
    if (d.length < 110 || d.length > 165) err.push(`description com ${d.length} caracteres`);
    if (titulos.has(t)) err.push(`title repetido de ${titulos.get(t)}`);
    if (descs.has(d)) err.push(`description repetida de ${descs.get(d)}`);
    titulos.set(t, rel); descs.set(d, rel);
    if (!canonical.startsWith(site.url)) err.push('canonical fora do domínio');
    if (!/index/.test(robots) && !process.env.PREVIEW) err.push(`robots "${robots}"`);
  }
  if (h1 !== 1) err.push(`${h1} H1`);
  if (semAlt) err.push(`${semAlt} imagem(ns) sem alt`);
  for (const [, j] of ld) { try { JSON.parse(j); } catch { err.push('JSON-LD inválido'); } }
  const tipos = ld.flatMap(([, j]) => { try { const o = JSON.parse(j); return (o['@graph'] || [o]).map(x => x['@type']); } catch { return []; } });
  linhas.push(`${err.length ? '✖' : '✔'} ${rel.padEnd(46)} ${String(t.length).padStart(2)}/${String(d.length).padStart(3)}  ${tipos.join(', ')}${err.length ? '\n    ' + err.join('; ') : ''}`);
  if (err.length) problemas.push(rel);
}
console.log('página'.padEnd(48), 'title/desc  dados estruturados');
console.log(linhas.sort().join('\n'));
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
console.log(`\nsitemap.xml: ${urls.length} URLs · robots.txt: ${fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8').split('\n')[1]}`);
if (problemas.length) { console.log(`\n${problemas.length} página(s) com problema.`); process.exit(1); }
console.log('Nenhum problema de SEO técnico.');
