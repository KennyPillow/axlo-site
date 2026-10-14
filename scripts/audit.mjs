// Auditoria visual e de layout com o Chrome instalado (puppeteer-core).
// Requer o servidor local rodando:  npm run build && npm run dev   (outro terminal)  →  node scripts/audit.mjs [--shots]
// Para cada página × largura: rolagem lateral, elementos fora da tela, texto cortado, toque pequeno, imagem ampliada e erros de console.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.AUDIT_URL || 'http://localhost:3040';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.argv.includes('--shots');
const ONLY = (process.argv.find(a => a.startsWith('--pages=')) || '').slice(8).split(',').filter(Boolean);
const VIEWS = [
  { w: 360, h: 780, dpr: 3, mobile: true }, { w: 390, h: 844, dpr: 3, mobile: true }, { w: 414, h: 896, dpr: 2, mobile: true },
  { w: 768, h: 1024, dpr: 2, mobile: true }, { w: 1024, h: 768, dpr: 2 }, { w: 1366, h: 768, dpr: 1 }, { w: 1920, h: 1080, dpr: 1 },
];
const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
let rotas = [...sitemap.matchAll(/<loc>[^<]*?(\/[^<]*)<\/loc>/g)].map(m => new URL(m[0].replace(/<\/?loc>/g, '')).pathname);
if (ONLY.length) rotas = rotas.filter(r => ONLY.some(o => r === o || r.startsWith(o)));
const SHOT_PAGES = ['/', '/saude-e-beneficios/plano-de-saude-empresarial', '/seguros-corporativos', '/blog', '/blog/reajuste-plano-de-saude-empresarial', '/contato', '/sobre'];

fs.mkdirSync('_shots/audit', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const resultado = [];
for (const v of VIEWS) {
  const page = await browser.newPage();
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: v.dpr, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  const erros = [];
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('pageerror', e => erros.push(e.message));
  for (const rota of rotas) {
    erros.length = 0;
    await page.goto(`${BASE}${rota}?shot=1`, { waitUntil: 'networkidle0', timeout: 60000 });
    // rola até o fim para disparar revelações e imagens sob demanda, depois volta
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 80)); }
      scrollTo({ top: 0, behavior: 'instant' }); await new Promise(r => setTimeout(r, 400));
    });
    const r = await page.evaluate(({ mobile, dpr }) => {
      const W = document.documentElement.clientWidth;
      const visivel = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const ignora = el => el.closest('.marquee,.post-grid-scroll,.chips,.sr-only,.drawer,.x-mark,.mega,.bell-panel,.cookie,.hs-slide:not(.on),.tab-panel:not(.on),.hp,.skip,.post-card[hidden],.tl-line');
      const desc = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 60);
      const fora = [], cortado = [], toque = [], ampliada = [];
      for (const el of document.querySelectorAll('body *')) {
        if (ignora(el) || !visivel(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.right > W + 1 || b.left < -1) fora.push(desc(el));
        const s = getComputedStyle(el);
        if (/^(H1|H2|H3|P|A|BUTTON|LI|LABEL|SPAN|B|SMALL|STRONG)$/.test(el.tagName) && el.children.length === 0 && el.textContent.trim()
            && (el.scrollWidth > el.clientWidth + 2) && /hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis') cortado.push(desc(el) + ' "' + el.textContent.trim().slice(0, 30) + '"');
        if (mobile && (el.tagName === 'A' || el.tagName === 'BUTTON') && !el.closest('p,li.dl,.prose,.crumbs,.f-legal,.check,.cookie') && (b.height < 40 || b.width < 24) && !el.closest('.toc')) toque.push(desc(el) + ` ${Math.round(b.width)}×${Math.round(b.height)}`);
        if (el.tagName === 'IMG' && el.complete && el.naturalWidth && !el.src.endsWith('.svg')) {
          const preciso = b.width * Math.min(dpr, 2);
          // em srcset o naturalWidth vem corrigido pela densidade; a largura real está no nome do arquivo gerado
          const real = Number((el.currentSrc.match(/-(\d+)\.(avif|webp)$/) || [])[1]) || el.naturalWidth;
          if (real < preciso * 0.92) ampliada.push(`${el.currentSrc.split('/').pop()} ${real}px para ${Math.round(preciso)}px`);
        }
      }
      return { rolagem: document.documentElement.scrollWidth > W, fora: [...new Set(fora)].slice(0, 6), cortado: [...new Set(cortado)].slice(0, 6), toque: [...new Set(toque)].slice(0, 8), ampliada: [...new Set(ampliada)].slice(0, 4), altura: document.documentElement.scrollHeight };
    }, { mobile: !!v.mobile, dpr: v.dpr });
    r.erros = [...new Set(erros)].slice(0, 3);
    resultado.push({ rota, w: v.w, ...r });
    if (SHOTS && SHOT_PAGES.includes(rota)) {
      const nome = `_shots/audit/${(rota === '/' ? 'home' : rota.slice(1).replaceAll('/', '_'))}-${v.w}.png`;
      await page.screenshot({ path: nome, fullPage: true, captureBeyondViewport: true });
    }
  }
  await page.close();
}
await browser.close();
fs.writeFileSync('_shots/audit/resultado.json', JSON.stringify(resultado, null, 2));
let problemas = 0;
for (const r of resultado) {
  const p = [r.rolagem && 'ROLAGEM LATERAL', r.fora.length && `fora da tela: ${r.fora.join(', ')}`, r.cortado.length && `texto cortado: ${r.cortado.join('; ')}`, r.toque.length && `toque pequeno: ${r.toque.join(', ')}`, r.ampliada.length && `imagem ampliada: ${r.ampliada.join('; ')}`, r.erros.length && `erros: ${r.erros.join(' | ')}`].filter(Boolean);
  if (p.length) { problemas++; console.log(`✖ ${r.rota} @${r.w}\n    ${p.join('\n    ')}`); }
}
console.log(`\n${resultado.length} combinações página × largura verificadas · ${problemas} com apontamentos.`);
