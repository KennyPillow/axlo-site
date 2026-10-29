// Gera o site estático em dist/ a partir de content/ (editado pelo painel Decap) e src/.
//   node scripts/build.mjs                              produção (Vercel)
//   BASE_PATH=/axlo-site PREVIEW=1 node scripts/build.mjs   prévia no GitHub Pages (noindex)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { renderSite, palavras } from '../src/templates.mjs';

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

// blog: mais recente primeiro; no mesmo dia, segue a ordem editorial abaixo (os temas centrais do cliente na frente)
const ORDEM_BLOG = ['reajuste-plano-de-saude-empresarial', 'seguro-d-o-o-que-cobre', 'nr-01-riscos-psicossociais', 'sinistralidade-plano-de-saude', 'seguro-riscos-ciberneticos-lgpd', 'plano-de-saude-pme', 'gestao-de-beneficios-rh', 'seguro-garantia-tipos', 'coparticipacao-plano-de-saude-empresarial', 'seguro-responsabilidade-civil-empresas', 'seguro-de-vida-em-grupo-empresas', 'telemedicina-beneficio-corporativo', 'seguro-de-frota-empresas', 'como-escolher-corretora-de-seguros-corporativos'];
const blogDir = 'content/blog';
const posts = (fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.json')).map(f => readJSON(blogDir + '/' + f)) : [])
  .filter(p => !p.rascunho)
  .map(p => ({ ...p, leitura: Math.max(2, Math.round(palavras(p.corpo) / 200)) }))
  .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm) || ((ORDEM_BLOG.indexOf(a.slug) + 1 || 99) - (ORDEM_BLOG.indexOf(b.slug) + 1 || 99)));
const buildDate = new Date().toISOString().slice(0, 10);

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

/* ---------- imagens: AVIF + WebP em vários tamanhos, qualidade alta ---------- */
// As fotos atuais vieram pelo WhatsApp (1600 px, já comprimidas): por isso a qualidade é alta,
// há uma nitidez leve e nunca se gera tamanho maior que o original. Fotos originais em alta trocam isso sozinhas.
const images = {};
const WIDTHS = [480, 720, 960, 1280, 1600, 2000, 2400];
const cacheDir = path.join(ROOT, 'node_modules/.cache/axlo-img');
fs.mkdirSync(cacheDir, { recursive: true });
fs.mkdirSync(path.join(DIST, '_img'), { recursive: true });
async function prepareImages(dir, publicPrefix) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    const file = path.join(dir, f);
    const meta = await sharp(file).metadata();
    const name = f.replace(/\.[^.]+$/, '');
    const stamp = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
    // fotos do topo ocupam a tela inteira no desktop: se o original for menor, gera também 2000 px com reamostragem lanczos,
    // mais nítida que deixar o navegador ampliar (não cria detalhe; o ideal continua sendo o original em alta)
    const amplia = /^hero-/.test(name) && meta.width < 2000;
    const widths = [...new Set(WIDTHS.filter(w => w < meta.width).concat(meta.width <= 2400 ? [meta.width] : [], amplia ? [2000] : []))];
    const variants = { avif: [], webp: [] };
    for (const w of widths) {
      for (const fmt of ['avif', 'webp']) {
        const out = `_img/${name}-${stamp}-${w}.${fmt}`;
        const cached = path.join(cacheDir, path.basename(out));
        if (!fs.existsSync(cached)) {
          let img = sharp(file).resize({ width: w, withoutEnlargement: !amplia, kernel: 'lanczos3' });
          if (w < meta.width) img = img.sharpen({ sigma: 0.5 });
          else if (w > meta.width) img = img.sharpen({ sigma: 0.9, m1: 0.6, m2: 2 });
          img = fmt === 'avif' ? img.avif({ quality: 62, effort: 4 }) : img.webp({ quality: 86, smartSubsample: true });
          await img.toFile(cached);
        }
        fs.copyFileSync(cached, path.join(DIST, out));
        variants[fmt].push({ w, url: `${BASE}/${out}` });
      }
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
const pages = renderSite({ site, paginas, produtos, posts, images, base: BASE, preview: PREVIEW, assets: hashed, buildDate });
const routes = [];
const lastmod = Object.fromEntries(posts.map(p => [`/blog/${p.slug}`, p.atualizadoEm]));
for (const p of pages) {
  const file = p.route === '/' ? 'index.html' : p.route === '/404' ? '404.html' : p.route.slice(1) + '.html';
  const full = path.join(DIST, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, p.html);
  if (!p.noindex) routes.push(p.route);
}

/* ---------- imagem de compartilhamento de cada página (título sobre o fundo da marca) ---------- */
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const quebra = (txt, max) => {
  const linhas = []; let l = '';
  for (const w of txt.split(' ')) { if ((l + ' ' + w).trim().length > max) { linhas.push(l.trim()); l = w; } else l += ' ' + w; }
  if (l.trim()) linhas.push(l.trim());
  return linhas.slice(0, 3);
};
const logoNeg = fs.readFileSync('src/assets/brand/axlo-horizontal-negativa.svg', 'utf8');
async function ogImage(route, titulo, rotulo) {
  const linhas = quebra(titulo, 30);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#140A3F"/>
    <g opacity="0.08" transform="translate(184 -1130) scale(9)">${xInner}</g>
    ${logoNeg.replace(/<svg /, '<svg x="80" y="64" width="330" height="62" ')}
    <text x="80" y="${270 - (linhas.length - 1) * 20}" font-family="Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="3" fill="#E2A9F1">${xmlEsc(rotulo.toUpperCase())}</text>
    ${linhas.map((l, i) => `<text x="80" y="${340 - (linhas.length - 1) * 20 + i * 72}" font-family="Arial, sans-serif" font-size="62" font-weight="700" fill="#FFFFFF">${xmlEsc(l)}</text>`).join('')}
    <text x="80" y="566" font-family="Arial, sans-serif" font-size="26" fill="#FFFFFF" opacity="0.75">${xmlEsc(site.tagline)}  ·  SUSEP nº ${site.empresa.susep}</text>
  </svg>`;
  const out = path.join(DIST, 'og', (route === '/' ? 'home' : route.slice(1)) + '.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
}
for (const p of pages) {
  const h1 = (p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || site.nome;
  const titulo = h1.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  const rotulo = p.route.startsWith('/blog/') ? 'Blog AXLO' : p.route.startsWith('/seguros-corporativos') ? 'Seguros Corporativos' : p.route.startsWith('/saude-e-beneficios') ? 'Saúde & Benefícios' : site.descritor;
  await ogImage(p.route, titulo, rotulo);
}

/* ---------- GEO/AIO: llms.txt (mapa para assistentes de IA) e llms-full.txt (conteúdo completo em markdown) ---------- */
const prodUrlB = p => `/${p.categoria === 'seguros' ? 'seguros-corporativos' : 'saude-e-beneficios'}/${p.slug}`;
const e = site.empresa;
const sobreTxt = `${site.nome} é uma corretora de saúde e seguros corporativos com sede em ${e.cidade}/${e.uf}, registrada na SUSEP sob o nº ${e.susep}. Compara operadoras e seguradoras, contrata e acompanha o contrato o ano inteiro, da pequena empresa ao grande contrato. A ${site.nome} não é operadora de planos de saúde nem seguradora.`;
const llms = `# ${site.nome} | ${site.descritor}

> ${sobreTxt}

Contato: ${site.contato.telefone} · ${site.contato.email} · ${site.url}/contato

## Saúde e benefícios corporativos
${produtos.filter(p => p.categoria === 'beneficios').map(p => `- [${p.titulo}](${site.url}${prodUrlB(p)}): ${p.resumo}`).join('\n')}

## Seguros corporativos
${produtos.filter(p => p.categoria === 'seguros').map(p => `- [${p.titulo}](${site.url}${prodUrlB(p)}): ${p.resumo}`).join('\n')}

## Institucional
- [Sobre a ${site.nome}](${site.url}/sobre): propósito, método, valores e registro na SUSEP.
- [Gestão e relatórios](${site.url}/gestao-e-inteligencia): acompanhamento mensal do contrato e programas de saúde.
- [Contato e proposta](${site.url}/contato)

## Blog
${posts.map(p => `- [${p.titulo}](${site.url}/blog/${p.slug}): ${p.resumo}`).join('\n')}

## Opcional
- [Conteúdo completo em texto](${site.url}/llms-full.txt)
`;
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);
const full = [`# ${site.nome} | ${site.descritor}\n\n${sobreTxt}\n`];
for (const p of produtos) {
  full.push(`\n---\n\n# ${p.titulo}\n\nURL: ${site.url}${prodUrlB(p)}\n\n${p.hero.subtitulo}\n\n## Para quem é\n\n${p.paraQuem}\n\n## O que ${p.categoria === 'seguros' ? 'a apólice pode proteger' : 'está incluído'}\n\n${p.protege.map(x => `- **${x.titulo}:** ${x.texto}`).join('\n')}\n\n## Como a ${site.nome} atua\n\n${p.comoAxloAtua.map(x => `- **${x.titulo}:** ${x.texto}`).join('\n')}\n\n## Perguntas frequentes\n\n${p.faq.map(f => `**${f.pergunta}**\n${f.resposta}`).join('\n\n')}\n`);
}
for (const p of posts) {
  full.push(`\n---\n\n# ${p.titulo}\n\nURL: ${site.url}/blog/${p.slug} · Atualizado em ${p.atualizadoEm}\n\n## Em resumo\n\n${(p.emResumo || []).map(t => `- ${t}`).join('\n')}\n\n${p.corpo}\n\n## Perguntas frequentes\n\n${(p.faq || []).map(f => `**${f.pergunta}**\n${f.resposta}`).join('\n\n')}\n`);
}
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), full.join(''));

/* ---------- RSS do blog ---------- */
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Blog ${xmlEsc(site.nome)}</title><link>${site.url}/blog</link><language>pt-BR</language>
<description>Saúde, benefícios e seguros corporativos explicados sem jargão.</description>
<atom:link href="${site.url}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map(p => `<item><title>${xmlEsc(p.titulo)}</title><link>${site.url}/blog/${p.slug}</link><guid>${site.url}/blog/${p.slug}</guid><pubDate>${new Date(p.publicadoEm + 'T09:00:00-03:00').toUTCString()}</pubDate><category>${xmlEsc(p.categoria)}</category><description>${xmlEsc(p.resumo)}</description></item>`).join('\n')}
</channel></rss>
`;
fs.mkdirSync(path.join(DIST, 'blog'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'blog/feed.xml'), rss);

/* ---------- painel Decap ---------- */
fs.mkdirSync(path.join(DIST, 'admin'), { recursive: true });
fs.copyFileSync('admin/index.html', path.join(DIST, 'admin/index.html'));
const cmsRepo = process.env.CMS_REPO || 'KennyPillow/axlo-site';
const cmsBranch = process.env.CMS_BRANCH || 'main';
fs.writeFileSync(path.join(DIST, 'admin/config.yml'),
  fs.readFileSync('admin/config.yml', 'utf8').replaceAll('__CMS_REPO__', cmsRepo).replaceAll('__CMS_BRANCH__', cmsBranch).replaceAll('__SITE_URL__', site.url));

/* ---------- sitemap e robots ---------- */
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  routes.map(r => `  <url><loc>${site.url}${r === '/' ? '/' : r}</loc><lastmod>${lastmod[r] || buildDate}</lastmod><image:image><image:loc>${site.url}/og/${r === '/' ? 'home' : r.slice(1)}.png</image:loc></image:image></url>`).join('\n') +
  `\n</urlset>\n`);
// buscadores e assistentes de IA podem ler o site; o painel e as funções ficam de fora
const IA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];
fs.writeFileSync(path.join(DIST, 'robots.txt'), PREVIEW
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\n${IA.map(b => `User-agent: ${b}\nAllow: /\nDisallow: /admin/\nDisallow: /api/`).join('\n\n')}\n\nSitemap: ${site.url}/sitemap.xml\n`);

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
