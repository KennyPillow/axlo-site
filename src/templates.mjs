// Templates do site AXLO. Cada função recebe os dados de content/ e devolve HTML.
import { icon } from './icons.mjs';

let C; // contexto do build: site, base, images, preview, assets

/* ================= utilidades ================= */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const u = p => (!p ? '#' : /^(https?:|mailto:|tel:|#)/.test(p) ? p : C.base + p);
const abs = p => C.site.url + (p === '/' ? '/' : p);
const br = n => Number(n).toLocaleString('pt-BR');
const digits = s => String(s || '').replace(/\D/g, '');
const tel = s => { const d = digits(s); return d ? '+55' + d : ''; };

const md = src => {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, (_, t, h) => `<a href="${u(h)}">${t}</a>`);
  return src.split(/\n{2,}/).map(block => {
    if (/^## /.test(block)) return `<h2>${inline(block.slice(3))}</h2>`;
    if (/^- /m.test(block)) return `<ul>${block.split('\n').map(l => `<li>${inline(l.replace(/^- /, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(block)}</p>`;
  }).join('\n');
};

function picture(src, { alt = '', sizes = '100vw', cls = '', eager = false, style = '' } = {}) {
  const im = C.images[src];
  if (!im) return `<img src="${u(src)}" alt="${esc(alt)}" class="${cls}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${style ? ` style="${style}"` : ''}>`;
  const srcset = im.variants.map(v => `${v.url} ${v.w}w`).join(', ');
  const prio = eager === 'low' ? ' fetchpriority="low"' : eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${im.fallback}" alt="${esc(alt)}" width="${im.w}" height="${im.h}" class="${cls}"${prio} decoding="async"${style ? ` style="${style}"` : ''}></picture>`;
}

const eyebrow = t => t ? `<p class="eyebrow">${esc(t)}</p>` : '';
const prodUrl = p => `/${p.categoria === 'seguros' ? 'seguros-corporativos' : 'saude-e-beneficios'}/${p.slug}`;
const byCat = cat => C.produtos.filter(p => p.categoria === cat);

/* ================= SEO e dados estruturados ================= */
function orgLD() {
  const s = C.site, e = s.empresa;
  return {
    '@type': 'InsuranceAgency',
    '@id': `${s.url}/#organizacao`,
    name: s.nome,
    alternateName: `${s.nome} | ${s.descritor}`,
    slogan: s.tagline,
    url: `${s.url}/`,
    logo: `${s.url}/assets/brand/axlo-horizontal.svg`,
    image: `${s.url}${s.seo.imagemPadrao}`,
    telephone: tel(s.contato.telefone) || undefined,
    email: s.contato.email || undefined,
    ...(e.razaoSocial ? { legalName: e.razaoSocial } : {}),
    ...(e.cnpj ? { taxID: e.cnpj } : {}),
    address: { '@type': 'PostalAddress', streetAddress: e.endereco || undefined, addressLocality: e.cidade, addressRegion: e.uf, postalCode: e.cep || undefined, addressCountry: 'BR' },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    sameAs: Object.values(s.redes).filter(Boolean),
    identifier: { '@type': 'PropertyValue', propertyID: 'SUSEP', value: e.susep },
  };
}
const crumbsLD = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, item: abs(it.url) })) });
const faqLD = itens => ({ '@type': 'FAQPage', mainEntity: itens.map(f => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })) });

/* ================= layout ================= */
function head({ seo, route, ld = [], noindex = false }) {
  const s = C.site, r = s.rastreamento;
  const title = seo.title, desc = seo.description;
  const img = s.url + (seo.imagem || s.seo.imagemPadrao);
  const graph = { '@context': 'https://schema.org', '@graph': [orgLD(), { '@type': 'WebSite', '@id': `${s.url}/#site`, url: `${s.url}/`, name: s.nome, inLanguage: 'pt-BR', publisher: { '@id': `${s.url}/#organizacao` } }, ...ld] };
  const robots = C.preview || noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${abs(route)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(s.nome)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(route)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#280F91">
${r.searchConsole ? `<meta name="google-site-verification" content="${esc(r.searchConsole)}">` : ''}
<link rel="icon" href="${C.base}/favicon.ico" sizes="32x32">
<link rel="icon" href="${C.base}/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${C.base}/apple-touch-icon.png">
<link rel="manifest" href="${C.base}/site.webmanifest">
<link rel="preload" href="${C.base}/assets/fonts/poppins-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${C.base}/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${C.assets.css}">
<script>
document.documentElement.classList.add('js');
window.AXLO = ${JSON.stringify({ base: C.base, whatsapp: digits(s.contato.whatsapp), whatsappMensagem: s.contato.whatsappMensagem, gtm: r.gtmId, ga4: r.ga4Id, preview: C.preview })};
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500 });
try { var c = JSON.parse(localStorage.getItem('axlo_consent')); if (c) gtag('consent', 'update', { analytics_storage: c.medicao ? 'granted' : 'denied', ad_storage: c.marketing ? 'granted' : 'denied', ad_user_data: c.marketing ? 'granted' : 'denied', ad_personalization: c.marketing ? 'granted' : 'denied' }); } catch (e) {}
${r.gtmId ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(r.gtmId)}');`
    : r.ga4Id ? `(function(){var j=document.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id=${esc(r.ga4Id)}';document.head.appendChild(j);gtag('js', new Date());gtag('config', '${esc(r.ga4Id)}');})();` : ''}
</script>
<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>`;
}

function header(route) {
  const s = C.site;
  const menuCol = (cat, hub, titulo) => `
    <div class="mega-col">
      <a class="mega-hub" href="${u(hub)}">${esc(titulo)} ${icon('arrow-right')}</a>
      ${byCat(cat).map(p => `<a class="mega-item" href="${u(prodUrl(p))}">${icon(p.icone)}<span><b>${esc(p.titulo)}</b><small>${esc(p.resumo)}</small></span></a>`).join('')}
    </div>`;
  const cur = r => route === r || route.startsWith(r + '/') ? ' aria-current="page"' : '';
  const novidades = s.novidades.map(n => `<a href="${u(n.link)}" class="bp-item"><span class="bp-ic">${icon('bell')}</span><span><b>${esc(n.titulo)}</b><small>${esc(n.texto)}</small></span></a>`).join('');
  return `
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<div class="progress" aria-hidden="true"></div>
${C.preview ? '<div class="preview-bar">Prévia para aprovação · os formulários não enviam dados nesta versão</div>' : ''}
<header class="site-header">
  <div class="wrap nav">
    <a href="${u('/')}" class="logo" aria-label="${esc(s.nome)}, página inicial"><img src="${C.base}/assets/brand/axlo-horizontal.svg" alt="${esc(s.nome)} Health &amp; Insurance" width="172" height="32"></a>
    <nav class="menu" aria-label="Principal">
      <div class="has-mega">
        <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mega-saude"${cur('/saude-e-beneficios')}>Saúde &amp; Benefícios ${icon('chevron-down')}</button>
        <div class="mega" id="mega-saude">${menuCol('beneficios', '/saude-e-beneficios', 'Ver saúde e benefícios')}</div>
      </div>
      <div class="has-mega">
        <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mega-seguros"${cur('/seguros-corporativos')}>Seguros Corporativos ${icon('chevron-down')}</button>
        <div class="mega mega-wide" id="mega-seguros">${menuCol('seguros', '/seguros-corporativos', 'Ver seguros corporativos')}</div>
      </div>
      <a href="${u('/gestao-e-inteligencia')}"${cur('/gestao-e-inteligencia')}>Gestão &amp; Inteligência</a>
      <a href="${u('/sobre')}"${cur('/sobre')}>Sobre</a>
      <a href="${u('/contato')}"${cur('/contato')}>Contato</a>
    </nav>
    <div class="nav-cta">
      <div class="bell-wrap">
        <button class="bell" type="button" aria-label="Novidades: ${s.novidades.length} novas" aria-expanded="false" aria-controls="bellPanel">${icon('bell')}<span class="bell-dot">${s.novidades.length}</span></button>
        <div class="bell-panel" id="bellPanel" hidden><p class="bp-title">Novidades</p>${novidades}</div>
      </div>
      <a href="${u('/contato')}" class="btn btn-primary btn-sm nav-diag">Pedir diagnóstico</a>
      <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<nav class="drawer" id="drawer" aria-label="Menu">
  <details><summary>Saúde &amp; Benefícios ${icon('chevron-down')}</summary>
    <a href="${u('/saude-e-beneficios')}">Visão geral</a>${byCat('beneficios').map(p => `<a href="${u(prodUrl(p))}">${esc(p.titulo)}</a>`).join('')}</details>
  <details><summary>Seguros Corporativos ${icon('chevron-down')}</summary>
    <a href="${u('/seguros-corporativos')}">Visão geral</a>${byCat('seguros').map(p => `<a href="${u(prodUrl(p))}">${esc(p.titulo)}</a>`).join('')}</details>
  <a class="dl" href="${u('/gestao-e-inteligencia')}">Gestão &amp; Inteligência</a>
  <a class="dl" href="${u('/sobre')}">Sobre</a>
  <a class="dl" href="${u('/contato')}">Contato</a>
  <a href="${u('/contato')}" class="btn btn-primary">Pedir diagnóstico</a>
</nav>`;
}

function footer() {
  const s = C.site, e = s.empresa, ct = s.contato;
  const col = (t, links) => `<div><h2 class="f-h">${t}</h2><ul>${links.map(([n, l]) => `<li><a href="${u(l)}">${esc(n)}</a></li>`).join('')}</ul></div>`;
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="f-top">
      <div class="f-brand">
        <img src="${C.base}/assets/brand/axlo-horizontal-negativa.svg" alt="${esc(s.nome)} Health &amp; Insurance" width="190" height="36" loading="lazy">
        <p class="f-tag">${esc(s.tagline)}</p>
        <p class="f-desc">${esc(s.nome)} | ${esc(s.descritor)}</p>
      </div>
      ${col('Saúde &amp; Benefícios', [['Visão geral', '/saude-e-beneficios'], ...byCat('beneficios').map(p => [p.titulo, prodUrl(p)])])}
      ${col('Seguros Corporativos', [['Visão geral', '/seguros-corporativos'], ...byCat('seguros').map(p => [p.titulo, prodUrl(p)])])}
      ${col('AXLO', [['Gestão &amp; Inteligência'.replace('&amp;', '&'), '/gestao-e-inteligencia'], ['Sobre', '/sobre'], ['Contato', '/contato'], ['Política de privacidade', '/politica-de-privacidade']])}
      <div>
        <h2 class="f-h">Fale com a AXLO</h2>
        <ul class="f-contact">
          ${ct.telefone ? `<li><a href="tel:${tel(ct.telefone)}">${icon('phone')}${esc(ct.telefone)}</a></li>` : ''}
          ${ct.whatsapp ? `<li><a href="#" class="js-wa" data-origem="rodape">${icon('whatsapp')}WhatsApp</a></li>` : ''}
          ${ct.email ? `<li><a href="mailto:${esc(ct.email)}">${icon('mail')}${esc(ct.email)}</a></li>` : ''}
          <li>${icon('map-pin')}${esc([e.endereco, `${e.cidade}/${e.uf}`].filter(Boolean).join(', '))}</li>
        </ul>
        ${Object.entries(s.redes).filter(([, v]) => v).map(([k, v]) => `<a class="f-social" href="${esc(v)}" rel="noopener" target="_blank">${k === 'linkedin' ? 'LinkedIn' : 'Instagram'}</a>`).join(' ')}
      </div>
    </div>
    <div class="f-bottom">
      <p>© ${new Date().getFullYear()} ${esc(e.razaoSocial || s.nome)}${e.cnpj ? ` · CNPJ ${esc(e.cnpj)}` : ''} · Corretora de seguros registrada na SUSEP sob o nº ${esc(e.susep)}</p>
      <p><a href="${u('/politica-de-privacidade')}">Política de privacidade</a> · <button type="button" class="link-btn js-cookie-prefs">Preferências de cookies</button></p>
    </div>
    <p class="f-legal">A ${esc(s.nome)} é uma corretora de seguros e não é operadora de planos de saúde nem seguradora. Coberturas, carências, rede e preços dependem do contrato e da apólice de cada operadora ou seguradora. Marcas citadas pertencem aos seus titulares.</p>
  </div>
</footer>
${waButton()}
${cookieBanner()}
<script src="${C.assets.js}" defer></script>
</body>
</html>`;
}

const waButton = () => C.site.contato.whatsapp ? `
<a class="wa js-wa" href="#" data-origem="botao-flutuante" aria-label="Falar com a AXLO pelo WhatsApp">${icon('whatsapp')}</a>` : '';

const cookieBanner = () => `
<div class="cookie" id="cookie" role="dialog" aria-live="polite" aria-label="Aviso de cookies" hidden>
  <div class="cookie-main">
    <p><b>Privacidade.</b> Usamos cookies necessários para o site funcionar e, com a sua autorização, cookies de medição e de marketing. Saiba mais na <a href="${u('/politica-de-privacidade')}">Política de privacidade</a>.</p>
    <div class="cookie-btns">
      <button type="button" class="btn btn-ghost btn-sm" data-cookie="prefs">Preferências</button>
      <button type="button" class="btn btn-ghost btn-sm" data-cookie="recusar">Recusar</button>
      <button type="button" class="btn btn-primary btn-sm" data-cookie="aceitar">Aceitar todos</button>
    </div>
  </div>
  <form class="cookie-prefs" hidden>
    <label class="switch"><input type="checkbox" checked disabled><span></span><b>Necessários</b><small>Mantêm o site funcionando. Sempre ativos.</small></label>
    <label class="switch"><input type="checkbox" name="medicao" id="ck-medicao"><span></span><b>Medição</b><small>Google Analytics, para entender o uso do site de forma agregada.</small></label>
    <label class="switch"><input type="checkbox" name="marketing" id="ck-marketing"><span></span><b>Marketing</b><small>Medição de campanhas e anúncios.</small></label>
    <button type="submit" class="btn btn-primary btn-sm">Salvar escolhas</button>
  </form>
</div>`;

function layout({ route, seo, ld, body, noindex, cls = '' }) {
  return head({ seo, route, ld, noindex }) + `\n<body class="${cls}">` + header(route) + `\n<main id="conteudo">${body}</main>` + footer();
}

/* ================= componentes ================= */
function breadcrumb(items) {
  return `<nav class="crumbs wrap" aria-label="Você está em"><ol>${items.map((it, i) => i < items.length - 1 ? `<li><a href="${u(it.url)}">${esc(it.nome)}</a></li>` : `<li aria-current="page">${esc(it.nome)}</li>`).join('')}</ol></nav>`;
}

function produtoCard(p) {
  return `<a class="p-card rv" href="${u(prodUrl(p))}">
    <span class="p-ic">${icon(p.icone)}</span>
    <h3>${esc(p.titulo)}</h3>
    <p>${esc(p.resumo)}</p>
    <span class="p-more">Saiba mais ${icon('arrow-right')}</span>
  </a>`;
}

// fecha a grade de seguros quando sobra espaço na última linha (7 seguros em 4 colunas)
function gradeSeguros() {
  const lista = byCat('seguros');
  const extra = lista.length % 4 ? `<a class="p-card p-card-cta rv" href="${u('/contato')}"><span class="p-ic">${icon('shield')}</span><h3>Outros ramos</h3><p>Vida, transporte, equipamentos, eventos e outros seguros empresariais. Conte o que a empresa precisa.</p><span class="p-more">Falar com a AXLO ${icon('arrow-right')}</span></a>` : '';
  return `<div class="p-grid">${lista.map(produtoCard).join('')}${extra}</div>`;
}

function faqBlock(titulo, itens, id = 'duvidas') {
  return `<section class="sec sec-nevoa" id="${id}">
    <div class="wrap faq-grid">
      <div><h2 class="rv">${esc(titulo)}</h2></div>
      <div class="faq rv">${itens.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.pergunta)}<span class="plus" aria-hidden="true"></span></summary><div class="ans"><div><p>${esc(f.resposta)}</p></div></div></details>`).join('')}</div>
    </div>
  </section>`;
}

const OPCOES_INTERESSE = ['Plano de saúde empresarial', 'Benefícios corporativos', 'Seguros corporativos', 'Gestão de NR-01', 'Diagnóstico do contrato atual', 'Outro assunto'];

function leadForm({ origem, interesse = '', titulo = '', id = 'diagnostico', nivel = 3 } = {}) {
  const opts = [...new Set([interesse, ...OPCOES_INTERESSE].filter(Boolean))];
  const f = C.paginas.contato.formulario;
  return `<form class="lead-form" novalidate data-origem="${esc(origem)}" aria-labelledby="${id}-titulo">
    <h${nivel} id="${id}-titulo" class="lf-title">${esc(titulo || f.titulo)}</h${nivel}>
    <div class="lf-grid">
      <div class="field"><label for="${id}-nome">Nome completo</label><input id="${id}-nome" name="nome" autocomplete="name" required maxlength="120"></div>
      <div class="field"><label for="${id}-empresa">Empresa</label><input id="${id}-empresa" name="empresa" autocomplete="organization" required maxlength="120"></div>
      <div class="field"><label for="${id}-email">E-mail corporativo</label><input id="${id}-email" name="email" type="email" autocomplete="email" required maxlength="160"></div>
      <div class="field"><label for="${id}-telefone">Telefone ou WhatsApp</label><input id="${id}-telefone" name="telefone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="(11) 90000-0000"></div>
      <div class="field"><label for="${id}-cargo">Cargo</label><select id="${id}-cargo" name="cargo" required><option value="">Selecione</option><option>Sócio ou CEO</option><option>Financeiro</option><option>RH e Benefícios</option><option>Jurídico</option><option>Outro</option></select></div>
      <div class="field"><label for="${id}-porte">Número de colaboradores</label><select id="${id}-porte" name="colaboradores" required><option value="">Selecione</option><option>Até 29</option><option>30 a 99</option><option>100 a 499</option><option>500 ou mais</option></select></div>
      <div class="field field-full"><label for="${id}-interesse">Assunto</label><select id="${id}-interesse" name="interesse" required>${opts.map(o => `<option${o === interesse ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
      <div class="field field-full"><label for="${id}-mensagem">Mensagem <span class="opt">(opcional)</span></label><textarea id="${id}-mensagem" name="mensagem" rows="3" maxlength="1500"></textarea></div>
      <div class="hp" aria-hidden="true"><label for="${id}-site">Site</label><input id="${id}-site" name="website" tabindex="-1" autocomplete="off"></div>
      <label class="check field-full"><input type="checkbox" name="consentimento" required> <span>Li e concordo com a <a href="${u('/politica-de-privacidade')}">Política de privacidade</a>. A AXLO usa estes dados só para responder ao seu pedido.</span></label>
    </div>
    <p class="lf-error" role="alert" hidden></p>
    <button type="submit" class="btn btn-primary btn-block">${esc(f.botao)} ${icon('arrow-right')}</button>
    <p class="lf-note">${icon('lock')} Seus dados ficam protegidos conforme a LGPD.</p>
    <div class="lf-ok" hidden tabindex="-1">
      <span class="lf-ok-ic">${icon('check')}</span>
      <h3>${esc(f.sucessoTitulo)}</h3>
      <p>${esc(f.sucessoTexto)}</p>
      ${C.site.contato.whatsapp ? `<a href="#" class="btn btn-ghost js-wa" data-origem="${esc(origem)}-sucesso">${icon('whatsapp')} Falar pelo WhatsApp</a>` : ''}
    </div>
  </form>`;
}

function ctaForm({ eyebrow: eb = 'Primeiro passo', titulo, texto, origem, interesse }) {
  return `<section class="sec sec-indigo cta-sec" id="diagnostico">
    <div class="x-mark" aria-hidden="true"></div>
    <div class="wrap cta-grid">
      <div class="cta-copy">
        ${eyebrow(eb)}
        <h2 class="rv">${esc(titulo)}</h2>
        <p class="rv">${esc(texto)}</p>
        <ul class="cta-steps">${C.paginas.contato.proximosPassos.itens.map((t, i) => `<li><span>${i + 1}</span>${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="cta-form rv">${leadForm({ origem, interesse })}</div>
    </div>
  </section>`;
}

/* ================= HOME ================= */
function heroSlider(slides) {
  const COR = ['var(--violeta)', 'var(--lilas-forte)', 'var(--indigo)'];
  return `<div class="hs" id="hs" aria-roledescription="carrossel" aria-label="Exemplos de como a AXLO mostra o contrato">
    <div class="hs-stage">
      ${slides.map((s, k) => {
        const tot = s.card.itens.reduce((a, b) => a + Number(b.valor), 0) || 1;
        const side = s.lado === 'esquerda' ? 'left' : 'right';
        return `<article class="hs-slide${k ? '' : ' on'}" data-side="${side}" aria-roledescription="slide" aria-label="${k + 1} de ${slides.length}: ${esc(s.papel)}">
          <div class="hs-media">
            ${picture(s.foto, { alt: '', sizes: '(max-width: 640px) 100vw, 1200px', eager: k === 0 ? true : 'low', style: `--mx:${esc(s.posicaoMobile)}` })}
            <div class="hs-notif"><span class="ni">${icon('check')}</span><span><small>${esc(s.notificacao.titulo)}</small>${esc(s.notificacao.texto)}</span></div>
            <div class="hs-tags">${s.etiquetas.map((t, i) => `<span style="--k:${i}">${esc(t)}</span>`).join('')}</div>
          </div>
          <div class="hs-side">
            <div class="hs-card">
              <div class="hs-head">${picture(s.avatar, { alt: '', sizes: '40px', cls: 'hs-av' })}<span><b>${esc(s.nome)}</b><small>${esc(s.papel)}</small></span></div>
              <p class="hs-label">${esc(s.card.titulo)}</p>
              <p class="hs-total"><span data-count="${s.card.valor}">${br(s.card.valor)}</span>${esc(s.card.sufixo)}</p>
              <p class="hs-leg">${esc(s.card.legenda)}</p>
              <div class="sbar">${s.card.itens.map((it, i) => `<i style="--w:${(it.valor / tot * 100).toFixed(1)}%;--c:${COR[i % 3]};--k:${i}"></i>`).join('')}</div>
              <ul>${s.card.itens.map((it, i) => `<li style="--k:${i}"><span class="dot" style="--c:${COR[i % 3]}"></span>${esc(it.rotulo)}<b><span data-count="${it.valor}">${br(it.valor)}</span>${esc(it.sufixo)}</b></li>`).join('')}</ul>
              <p class="hs-ilustr">Exemplo ilustrativo</p>
            </div>
            <div class="hs-stats">${s.indicadores.map((t, i) => `<div class="hs-stat" style="--k:${i}"><strong><span data-count="${t.valor}">${br(t.valor)}</span>${esc(t.sufixo)}</strong><span>${esc(t.rotulo)}</span></div>`).join('')}</div>
          </div>
        </article>`;
      }).join('')}
    </div>
    <div class="hs-nav">
      <div class="hs-bars">${slides.map((s, i) => `<button type="button" aria-label="Ver exemplo ${i + 1}: ${esc(s.papel)}"><span><i></i></span>${esc(s.papel)}</button>`).join('')}</div>
      <span class="hs-count" aria-hidden="true">01 / ${String(slides.length).padStart(2, '0')}</span>
      <div class="arrows"><button class="prev" type="button" aria-label="Exemplo anterior">${icon('arrow-left')}</button><button class="next" type="button" aria-label="Próximo exemplo">${icon('arrow-right')}</button></div>
    </div>
  </div>`;
}

function operadoras() {
  const o = C.site.operadoras;
  if (!o.mostrar || !o.logos.length) return '';
  const row = hid => o.logos.map(l => `<div class="op"><img src="${u(l.arquivo)}" alt="${hid ? '' : esc(l.nome)}" loading="lazy" height="32"></div>`).join('');
  return `<div class="logos"><p class="eyebrow wrap">${esc(o.titulo)}</p><div class="marquee"><div class="mq-track">${row(false)}${row(true)}</div></div></div>`;
}

function home() {
  const h = C.paginas.home;
  const body = `
  <section class="hero">
    <div class="x-mark x-hero" aria-hidden="true"></div>
    <div class="wrap hero-copy">
      ${eyebrow(h.hero.eyebrow)}
      <h1>${esc(h.hero.titulo)}</h1>
      <p class="lead">${esc(h.hero.subtitulo)}</p>
      <div class="hero-ctas">
        <a href="${u('/contato')}" class="btn btn-primary">${esc(h.hero.cta)} ${icon('arrow-right')}</a>
        <a href="${u(h.hero.linkUrl)}" class="btn btn-ghost">${esc(h.hero.linkTexto)}</a>
      </div>
      <p class="hero-susep">${icon('shield')} Corretora registrada na SUSEP nº ${esc(C.site.empresa.susep)}</p>
    </div>
    ${heroSlider(h.slides)}
  </section>
  ${operadoras()}

  <section class="sec sec-noite manifesto">
    <div class="x-mark" aria-hidden="true"></div>
    <div class="wrap">
      ${eyebrow(h.manifesto.eyebrow)}
      <h2 class="rv display">${esc(h.manifesto.titulo)}</h2>
      <p class="rv lead-dark">${esc(h.manifesto.texto)}</p>
      <div class="msg-grid">${h.manifesto.mensagens.map((m, i) => `<div class="msg rv" style="--d:${i * 0.06}s"><p class="label">${esc(m.para)}</p><p>${esc(m.texto)}</p></div>`).join('')}</div>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.frentes.eyebrow)}<h2 class="rv">${esc(h.frentes.titulo)}</h2></div>
      <div class="frentes">${h.frentes.itens.map((f, i) => `<a class="frente rv" style="--d:${i * 0.06}s" href="${u(f.link)}"><span class="f-ic">${icon(f.icone)}</span><span class="label">AXLO</span><h3>${esc(f.titulo)}</h3><p>${esc(f.texto)}</p><span class="p-more">Conhecer ${icon('arrow-right')}</span></a>`).join('')}</div>
    </div>
  </section>

  <section class="sec sec-nevoa" id="seguros">
    <div class="wrap">
      <div class="sec-head sec-head-split">
        <div>${eyebrow(h.seguros.eyebrow)}<h2 class="rv">${esc(h.seguros.titulo)}</h2></div>
        <p class="rv">${esc(h.seguros.texto)}</p>
      </div>
      ${gradeSeguros()}
      <p class="sec-link"><a href="${u('/seguros-corporativos')}" class="link-arrow">${esc(h.seguros.linkTexto)} ${icon('arrow-right')}</a></p>
    </div>
  </section>

  <section class="sec" id="beneficios">
    <div class="wrap">
      <div class="sec-head sec-head-split">
        <div>${eyebrow(h.beneficios.eyebrow)}<h2 class="rv">${esc(h.beneficios.titulo)}</h2></div>
        <p class="rv">${esc(h.beneficios.texto)}</p>
      </div>
      <div class="p-grid p-grid-5">${byCat('beneficios').map(produtoCard).join('')}</div>
      <div class="servicos">${h.beneficios.servicos.map(s => `<div class="servico rv"><span class="p-ic">${icon(s.icone)}</span><div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></div>`).join('')}</div>
      <p class="sec-link"><a href="${u('/saude-e-beneficios')}" class="link-arrow">${esc(h.beneficios.linkTexto)} ${icon('arrow-right')}</a></p>
    </div>
  </section>

  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.metodo.eyebrow)}<h2 class="rv">${esc(h.metodo.titulo)}</h2></div>
      ${steps(h.metodo.etapas)}
      <p class="sec-link"><a href="${u('/gestao-e-inteligencia')}" class="link-arrow">${esc(h.metodo.linkTexto)} ${icon('arrow-right')}</a></p>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.porte.eyebrow)}<h2 class="rv">${esc(h.porte.titulo)}</h2></div>
      <div class="porte">${h.porte.itens.map((p, i) => `<div class="porte-i rv" style="--d:${i * 0.06}s"><span class="porte-n">${['PME', 'MÉDIAS', 'GRANDES'][i] || ''}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div>
    </div>
  </section>

  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap dif-grid">
      <div>${eyebrow(h.diferenciais.eyebrow)}<h2 class="rv">${esc(h.diferenciais.titulo)}</h2></div>
      <ol class="dif">${h.diferenciais.itens.map((d, i) => `<li class="rv" style="--d:${i * 0.05}s"><span class="dif-n">${i + 1}</span><div><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p></div></li>`).join('')}</ol>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.comparativo.eyebrow)}<h2 class="rv">${esc(h.comparativo.titulo)}</h2></div>
      <div class="cmp rv" role="table" aria-label="${esc(h.comparativo.titulo)}">
        <div class="cmp-row cmp-head" role="row"><span role="columnheader">${esc(h.comparativo.colunaAxlo)}</span><span role="columnheader">${esc(h.comparativo.colunaOutro)}</span></div>
        ${h.comparativo.linhas.map(l => `<div class="cmp-row" role="row"><span role="cell">${icon('check')}${esc(l.axlo)}</span><span role="cell">${icon('x')}${esc(l.outro)}</span></div>`).join('')}
      </div>
    </div>
  </section>

  ${faqBlock(h.faq.titulo, h.faq.itens)}
  ${ctaForm({ eyebrow: h.ctaFinal.eyebrow, titulo: h.ctaFinal.titulo, texto: h.ctaFinal.texto, origem: 'home', interesse: 'Diagnóstico do contrato atual' })}`;
  return { route: '/', html: layout({ route: '/', seo: h.seo, ld: [faqLD(h.faq.itens)], body, cls: 'page-home' }) };
}

function steps(etapas) {
  return `<ol class="steps">${etapas.map((e, i) => `<li class="step rv" style="--d:${i * 0.07}s"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.texto)}</p></li>`).join('')}</ol>`;
}

function pageHero({ eyebrow: eb, titulo, subtitulo, ic, cta = true }) {
  return `<section class="page-hero">
    <div class="x-mark x-hero" aria-hidden="true"></div>
    <div class="wrap ph-grid">
      <div>
        ${eyebrow(eb)}
        <h1>${esc(titulo)}</h1>
        <p class="lead">${esc(subtitulo)}</p>
        ${cta ? `<div class="hero-ctas"><a href="#diagnostico" class="btn btn-primary">Pedir diagnóstico ${icon('arrow-right')}</a></div>` : ''}
      </div>
      ${ic ? `<div class="ph-ic" aria-hidden="true">${icon(ic)}</div>` : ''}
    </div>
  </section>`;
}

/* ================= HUBS ================= */
function hubSaude() {
  const p = C.paginas['saude-e-beneficios'], h = C.paginas.home;
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Saúde & Benefícios', url: '/saude-e-beneficios' }];
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'heart-pulse' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head sec-head-split"><div><h2 class="rv">${esc(p.intro.titulo)}</h2></div><p class="rv">${esc(p.intro.texto)}</p></div>
      <div class="p-grid p-grid-5">${byCat('beneficios').map(produtoCard).join('')}</div>
    </div>
  </section>
  <section class="sec sec-nevoa" id="servicos">
    <div class="wrap">
      <div class="sec-head"><h2 class="rv">${esc(p.servicos.titulo)}</h2></div>
      <div class="servicos servicos-4">${p.servicos.itens.map(s => `<div class="servico rv"><span class="p-ic">${icon(s.icone)}</span><div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></div>`).join('')}</div>
    </div>
  </section>
  <section class="sec">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.porte.eyebrow)}<h2 class="rv">${esc(h.porte.titulo)}</h2></div>
      <div class="porte">${h.porte.itens.map((x, i) => `<div class="porte-i rv"><span class="porte-n">${['PME', 'MÉDIAS', 'GRANDES'][i] || ''}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'saude-e-beneficios', interesse: 'Benefícios corporativos' })}`;
  return { route: '/saude-e-beneficios', html: layout({ route: '/saude-e-beneficios', seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

function hubSeguros() {
  const p = C.paginas['seguros-corporativos'];
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Seguros Corporativos', url: '/seguros-corporativos' }];
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'shield' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head sec-head-split"><div><h2 class="rv">${esc(p.intro.titulo)}</h2></div><p class="rv">${esc(p.intro.texto)}</p></div>
      ${gradeSeguros()}
    </div>
  </section>
  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><h2 class="rv">${esc(p.etapas.titulo)}</h2></div>
      ${steps(p.etapas.itens)}
    </div>
  </section>
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'seguros-corporativos', interesse: 'Seguros corporativos' })}`;
  return { route: '/seguros-corporativos', html: layout({ route: '/seguros-corporativos', seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

/* ================= PRODUTO ================= */
function produtoPage(p) {
  const hubUrl = p.categoria === 'seguros' ? '/seguros-corporativos' : '/saude-e-beneficios';
  const hubNome = p.categoria === 'seguros' ? 'Seguros Corporativos' : 'Saúde & Benefícios';
  const route = prodUrl(p);
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: hubNome, url: hubUrl }, { nome: p.titulo, url: route }];
  const outros = byCat(p.categoria).filter(x => x.slug !== p.slug).slice(0, 3);
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ eyebrow: p.hero.eyebrow, titulo: p.hero.titulo, subtitulo: p.hero.subtitulo, ic: p.icone })}
  <section class="sec">
    <div class="wrap pq-grid">
      <div><h2 class="rv">Para quem é</h2><p class="rv big-p">${esc(p.paraQuem)}</p></div>
      <div class="situacoes rv"><p class="label">Situações em que faz diferença</p><ul>${p.situacoes.map(s => `<li>${icon('check')}${esc(s)}</li>`).join('')}</ul></div>
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head"><h2 class="rv">${p.categoria === 'seguros' ? 'O que a apólice pode proteger' : 'O que está incluído'}</h2><p class="rv sub">Coberturas, limites e exclusões dependem ${p.categoria === 'seguros' ? 'da apólice escolhida' : 'da operadora e do contrato escolhidos'}.</p></div>
      <div class="protege">${p.protege.map((x, i) => `<div class="pr-i rv" style="--d:${i * 0.05}s"><span class="pr-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Método AXLO</p><h2 class="rv">Como a AXLO atua</h2></div>
      ${steps(p.comoAxloAtua)}
    </div>
  </section>
  ${faqBlock('Perguntas frequentes', p.faq)}
  ${outros.length ? `<section class="sec"><div class="wrap"><div class="sec-head"><h2 class="rv">Veja também</h2></div><div class="p-grid p-grid-3">${outros.map(produtoCard).join('')}</div></div></section>` : ''}
  ${ctaForm({ titulo: p.cta.titulo, texto: p.cta.texto, origem: p.slug, interesse: p.titulo })}`;
  const service = { '@type': 'Service', name: p.titulo, description: p.seo.description, serviceType: p.titulo, provider: { '@id': `${C.site.url}/#organizacao` }, areaServed: { '@type': 'Country', name: 'Brasil' }, url: abs(route) };
  return { route, html: layout({ route, seo: p.seo, ld: [crumbsLD(crumbs), faqLD(p.faq), service], body }) };
}

/* ================= GESTÃO & INTELIGÊNCIA ================= */
function gestao() {
  const p = C.paginas['gestao-e-inteligencia'];
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Gestão & Inteligência', url: '/gestao-e-inteligencia' }];
  const meses = [['Mai', 64], ['Jun', 72], ['Jul', 81], ['Ago', 76], ['Set', 69], ['Out', 84]];
  const acima = meses.filter(m => m[1] > 70).length;
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'chart' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><h2 class="rv">${esc(p.metodo.titulo)}</h2></div>
      ${steps(p.metodo.etapas)}
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap dash-grid">
      <div>
        <p class="eyebrow">AXLO Inteligência</p>
        <h2 class="rv">${esc(p.dashboard.titulo)}</h2>
        <p class="rv big-p">${esc(p.dashboard.texto)}</p>
        <ul class="ticks rv">${p.dashboard.indicadores.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul>
        <p class="note rv">${icon('lock')} ${esc(p.dashboard.nota)}</p>
      </div>
      <figure class="dash rv" aria-label="Exemplo de gráfico do Dashboard AXLO">
        <div class="dash-top"><img src="${C.base}/assets/brand/axlo-x.svg" alt="" width="20" height="22"><span>Dashboard AXLO</span><span class="dash-tag">Exemplo ilustrativo</span></div>
        <figcaption class="dash-title">Sinistralidade acima do ponto de equilíbrio em ${acima} dos ${meses.length} meses</figcaption>
        <div class="chart" style="--be:70%">
          <span class="be-line"><em>Ponto de equilíbrio 70%</em></span>
          ${meses.map(([m, v]) => `<div class="bar${v > 70 ? ' hi' : ''}" style="--v:${v}%"><b>${v}%</b><span>${m}</span></div>`).join('')}
        </div>
        <div class="dash-kpis"><div><small>Custo por pessoa</small><b>R$ 612</b></div><div><small>Eventos de alto custo</small><b>3</b></div><div><small>Movimentações</small><b>17</b></div></div>
      </figure>
    </div>
  </section>
  <section class="sec">
    <div class="wrap pq-grid">
      <div><h2 class="rv">${esc(p.relatorios.titulo)}</h2></div>
      <p class="rv big-p">${esc(p.relatorios.texto)}</p>
    </div>
  </section>
  <section class="sec sec-noite" id="programas">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Prevenção</p><h2 class="rv">${esc(p.programas.titulo)}</h2><p class="rv lead-dark">${esc(p.programas.texto)}</p></div>
      <div class="msg-grid msg-grid-3">${p.programas.itens.map(x => `<div class="msg rv"><p class="label">${esc(x.titulo)}</p><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'gestao-e-inteligencia', interesse: 'Diagnóstico do contrato atual' })}`;
  return { route: '/gestao-e-inteligencia', html: layout({ route: '/gestao-e-inteligencia', seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

/* ================= SOBRE ================= */
function sobre() {
  const p = C.paginas.sobre;
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Sobre', url: '/sobre' }];
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, cta: false })}
  <section class="sec sec-noite manifesto">
    <div class="x-mark" aria-hidden="true"></div>
    <div class="wrap manif-grid">
      <h2 class="label-lg">${esc(p.manifesto.titulo)}</h2>
      <div class="manif">${p.manifesto.paragrafos.map((t, i) => `<p class="rv${i === 0 || i === p.manifesto.paragrafos.length - 1 ? ' manif-strong' : ''}">${esc(t)}</p>`).join('')}</div>
    </div>
  </section>
  <section class="sec">
    <div class="wrap pilares">${p.pilares.map(x => `<div class="pilar rv"><p class="label">${esc(x.rotulo)}</p><p>${esc(x.texto)}</p></div>`).join('')}</div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Valores</p><h2 class="rv">${esc(p.valores.titulo)}</h2></div>
      <div class="valores">${p.valores.itens.map((v, i) => `<div class="valor rv" style="--d:${i * 0.05}s"><span class="valor-n">${i + 1}</span><h3>${esc(v.titulo)}</h3><p>${esc(v.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  <section class="sec">
    <div class="wrap simbolo">
      <div class="simbolo-x" aria-hidden="true"><img src="${C.base}/assets/brand/axlo-x.svg" alt="" width="220" height="246" loading="lazy"></div>
      <div><p class="eyebrow">O símbolo</p><h2 class="rv">${esc(p.simbolo.titulo)}</h2><p class="rv big-p">${esc(p.simbolo.texto)}</p></div>
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap duo">
      <div class="duo-i rv"><span class="p-ic">${icon('heart-pulse')}</span><h3>${esc(p.lideranca.titulo)}</h3><p>${esc(p.lideranca.texto)}</p></div>
      <div class="duo-i rv"><span class="p-ic">${icon('shield')}</span><h3>${esc(p.registro.titulo)}</h3><p>${esc(p.registro.texto)}</p><a class="link-arrow" href="https://www2.susep.gov.br/safe/menumercado/REP2/Produtor.aspx" rel="noopener" target="_blank">Consultar na SUSEP ${icon('arrow-right')}</a></div>
    </div>
  </section>
  ${ctaForm({ titulo: C.paginas.home.ctaFinal.titulo, texto: C.paginas.home.ctaFinal.texto, origem: 'sobre', interesse: 'Diagnóstico do contrato atual' })}`;
  return { route: '/sobre', html: layout({ route: '/sobre', seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

/* ================= CONTATO ================= */
function contato() {
  const p = C.paginas.contato, ct = C.site.contato;
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Contato', url: '/contato' }];
  const canal = (ic, t, v, href, cls = '') => v ? `<li><span class="p-ic">${icon(ic)}</span><span><small>${t}</small>${href ? `<a href="${href}" class="${cls}"${cls ? ' data-origem="contato-canais"' : ''}>${esc(v)}</a>` : esc(v)}</span></li>` : '';
  const body = `${breadcrumb(crumbs)}
  <section class="page-hero page-hero-sm">
    <div class="x-mark x-hero" aria-hidden="true"></div>
    <div class="wrap">${eyebrow(p.hero.eyebrow)}<h1>${esc(p.hero.titulo)}</h1><p class="lead">${esc(p.hero.subtitulo)}</p></div>
  </section>
  <section class="sec sec-tight" id="diagnostico">
    <div class="wrap contato-grid">
      <div class="contato-form">${leadForm({ origem: 'contato', interesse: 'Diagnóstico do contrato atual', id: 'contato', nivel: 2 })}</div>
      <aside class="contato-side">
        <h2 class="h3">Canais</h2>
        <ul class="canais">
          ${canal('phone', 'Telefone', ct.telefone, `tel:${tel(ct.telefone)}`)}
          ${ct.whatsapp ? canal('whatsapp', 'WhatsApp', 'Conversar agora', '#', 'js-wa') : ''}
          ${canal('mail', 'E-mail', ct.email, `mailto:${ct.email}`)}
          ${canal('clock', 'Horário', ct.horario)}
          ${canal('map-pin', 'Endereço', [C.site.empresa.endereco, `${C.site.empresa.cidade}/${C.site.empresa.uf}`].filter(Boolean).join(', '))}
        </ul>
        <h2 class="h3">${esc(p.proximosPassos.titulo)}</h2>
        <ol class="next">${p.proximosPassos.itens.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        <p class="note">${icon('shield')} Corretora registrada na SUSEP nº ${esc(C.site.empresa.susep)}</p>
      </aside>
    </div>
  </section>`;
  return { route: '/contato', html: layout({ route: '/contato', seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

/* ================= PRIVACIDADE e 404 ================= */
function privacidade() {
  const p = C.paginas.privacidade, s = C.site, e = s.empresa;
  const tokens = { nome: s.nome, url: s.url.replace(/^https?:\/\//, ''), razaoSocialOuNome: e.razaoSocial || s.nome, cnpjTexto: e.cnpj ? `, inscrita no CNPJ ${e.cnpj}` : '', susep: e.susep, cidade: e.cidade, uf: e.uf, email: s.contato.email };
  const corpo = p.corpo.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? '');
  const route = '/politica-de-privacidade';
  const crumbs = [{ nome: 'Início', url: '/' }, { nome: 'Política de privacidade', url: route }];
  const data = new Date(p.atualizadoEm + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const body = `${breadcrumb(crumbs)}
  <article class="sec sec-tight"><div class="wrap prose"><h1>${esc(p.titulo)}</h1><p class="muted">Atualizada em ${data}</p>${md(corpo)}<p><button type="button" class="btn btn-ghost js-cookie-prefs">Alterar preferências de cookies</button></p></div></article>`;
  return { route, html: layout({ route, seo: p.seo, ld: [crumbsLD(crumbs)], body }) };
}

function notFound() {
  const body = `<section class="page-hero nf"><div class="x-mark x-hero" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Erro 404</p><h1>Esta página não existe.</h1><p class="lead">O link pode ter mudado. Volte ao início ou fale com a AXLO.</p><div class="hero-ctas"><a href="${u('/')}" class="btn btn-primary">Ir para o início</a><a href="${u('/contato')}" class="btn btn-ghost">Falar com a AXLO</a></div></div></section>`;
  return { route: '/404', noindex: true, html: layout({ route: '/404', seo: { title: 'Página não encontrada | AXLO', description: 'Esta página não existe.' }, body, noindex: true }) };
}

/* ================= exporta ================= */
export function renderSite(ctx) {
  C = ctx;
  return [
    home(), sobre(), hubSaude(), hubSeguros(), gestao(), contato(), privacidade(), notFound(),
    ...C.produtos.map(produtoPage),
  ];
}
