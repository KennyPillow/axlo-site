// Performance com o Lighthouse (Chrome instalado). Requer o servidor local rodando (npm run dev).
//   node scripts/perf.mjs            →  _shots/perf/*.json e uma tabela no terminal
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.env.AUDIT_URL || 'http://localhost:3040';
const PAGINAS = ['/', '/saude-e-beneficios', '/seguros-corporativos', '/saude-e-beneficios/plano-de-saude-empresarial', '/seguros-corporativos/d-o', '/blog', '/blog/reajuste-plano-de-saude-empresarial', '/contato', '/sobre'];
fs.mkdirSync('_shots/perf', { recursive: true });
const linhas = [];
for (const modo of ['mobile', 'desktop']) {
  for (const p of PAGINAS) {
    const out = `_shots/perf/${modo}${p === '/' ? '_home' : p.replaceAll('/', '_')}.json`;
    const args = ['-y', 'lighthouse@13.5.0', `${BASE}${p}`, '--quiet', '--chrome-flags=--headless=new', '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${out}`];
    if (modo === 'desktop') args.push('--preset=desktop');
    try { execFileSync('npx', args, { stdio: 'ignore', shell: true, env: { ...process.env, CHROME_PATH: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } }); } catch { linhas.push(`${modo} ${p}: falhou`); continue; }
    const r = JSON.parse(fs.readFileSync(out, 'utf8'));
    const c = r.categories, a = r.audits;
    linhas.push({ modo, pagina: p, perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100), lcp: a['largest-contentful-paint'].displayValue, cls: a['cumulative-layout-shift'].displayValue, tbt: a['total-blocking-time'].displayValue, fcp: a['first-contentful-paint'].displayValue, peso: Math.round((a['total-byte-weight'].numericValue || 0) / 1024) + ' KB' });
  }
}
fs.writeFileSync('_shots/perf/resumo.json', JSON.stringify(linhas, null, 2));
console.log('modo     página                                          perf a11y bp  seo  FCP     LCP     TBT     CLS    peso');
for (const l of linhas) {
  if (typeof l === 'string') { console.log(l); continue; }
  console.log(`${l.modo.padEnd(8)} ${l.pagina.padEnd(47)} ${String(l.perf).padStart(4)} ${String(l.a11y).padStart(4)} ${String(l.bp).padStart(3)} ${String(l.seo).padStart(4)}  ${l.fcp.padEnd(7)} ${l.lcp.padEnd(7)} ${l.tbt.padEnd(7)} ${l.cls.padEnd(6)} ${l.peso}`);
}
