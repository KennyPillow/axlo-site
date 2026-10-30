// Templates do site AXLO. Cada função recebe os dados de content/ e devolve HTML.
import { icon } from './icons.mjs';

let C; // contexto do build: site, paginas, produtos, posts, images, base, preview, assets, buildDate

/* ================= utilidades ================= */
const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const u = p => (!p ? '#' : /^(https?:|mailto:|tel:|#)/.test(p) ? p : C.base + p);
const abs = p => C.site.url + (p === '/' ? '/' : p);
const br = n => Number(n).toLocaleString('pt-BR');
const digits = s => String(s || '').replace(/\D/g, '');
const tel = s => {
  const d = digits(s);
  return d ? `+55${d}` : '';
};
const slugify = s =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const dataBR = iso =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
export const palavras = md =>
  md
    .replace(/[#*\-[\]()`>]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

// markdown simples: ## e ### com âncora, listas, negrito, itálico e links internos com o prefixo do site
export function md(src, { toc = null } = {}) {
  const inline = s =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_, t, h) => `<a href="${u(h)}">${t}</a>`);
  return src
    .trim()
    .split(/\n{2,}/)
    .map(block => {
      const b = block.trim();
      const h = b.match(/^(#{2,3}) (.+)$/);
      if (h) {
        const id = slugify(h[2]);
        if (toc && h[1] === '##') toc.push({ id, titulo: h[2] });
        return `<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`;
      }
      if (/^- /.test(b))
        return `<ul>${b
          .split('\n')
          .map(l => `<li>${inline(l.replace(/^- /, ''))}</li>`)
          .join('')}</ul>`;
      if (/^\d+\. /.test(b))
        return `<ol>${b
          .split('\n')
          .map(l => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`)
          .join('')}</ol>`;
      return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
    })
    .join('\n');
}

function picture(src, { alt = '', sizes = '100vw', cls = '', eager = false, style = '' } = {}) {
  const im = C.images[src];
  const st = style ? ` style="${style}"` : '';
  if (!im)
    return `<img src="${u(src)}" alt="${esc(alt)}" class="${cls}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${st}>`;
  const set = list => list.map(v => `${v.url} ${v.w}w`).join(', ');
  const prio = eager === 'low' ? ' fetchpriority="low"' : eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<picture><source type="image/avif" srcset="${set(im.variants.avif)}" sizes="${sizes}"><source type="image/webp" srcset="${set(im.variants.webp)}" sizes="${sizes}"><img src="${im.fallback}" alt="${esc(alt)}" width="${im.w}" height="${im.h}" class="${cls}"${prio} decoding="async"${st}></picture>`;
}

const eyebrow = t => (t ? `<p class="eyebrow">${esc(t)}</p>` : '');
const prodUrl = p => `/${p.categoria === 'seguros' ? 'seguros-corporativos' : 'saude-e-beneficios'}/${p.slug}`;
const postUrl = p => `/blog/${p.slug}`;
const byCat = cat => C.produtos.filter(p => p.categoria === cat);
const prodBySlug = s => C.produtos.find(p => p.slug === s);
const ogFor = route => `/og${route === '/' ? '/home' : route}.png`;

/* ================= SEO, GEO e dados estruturados ================= */
function orgLD() {
  const s = C.site,
    e = s.empresa;
  return {
    '@type': 'InsuranceAgency',
    '@id': `${s.url}/#organizacao`,
    name: s.nome,
    alternateName: [`${s.nome} Health & Insurance`, `${s.nome} | ${s.descritor}`],
    description: `${s.nome} é uma corretora de saúde e seguros corporativos com sede em ${e.cidade}/${e.uf}, registrada na SUSEP sob o nº ${e.susep}. Contrata e acompanha planos de saúde empresariais, benefícios corporativos e seguros para empresas, da pequena empresa ao grande contrato.`,
    slogan: s.tagline,
    url: `${s.url}/`,
    logo: { '@type': 'ImageObject', url: `${s.url}/assets/brand/axlo-horizontal.svg` },
    image: `${s.url}/og/home.png`,
    telephone: tel(s.contato.telefone) || undefined,
    email: s.contato.email || undefined,
    ...(e.razaoSocial ? { legalName: e.razaoSocial } : {}),
    ...(e.cnpj ? { taxID: e.cnpj } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: e.endereco || undefined,
      addressLocality: e.cidade,
      addressRegion: e.uf,
      postalCode: e.cep || undefined,
      addressCountry: 'BR',
    },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: tel(s.contato.telefone) || undefined,
        email: s.contato.email || undefined,
        areaServed: 'BR',
        availableLanguage: 'Portuguese',
      },
    ],
    sameAs: Object.values(s.redes).filter(Boolean),
    identifier: { '@type': 'PropertyValue', propertyID: 'SUSEP', value: e.susep },
    knowsAbout: [
      'Plano de saúde empresarial',
      'Benefícios corporativos',
      'Gestão de sinistralidade',
      'Reajuste de plano de saúde',
      'NR-01 e riscos psicossociais',
      ...C.produtos.map(p => p.titulo),
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Saúde, benefícios e seguros corporativos',
      itemListElement: C.produtos.map(p => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: p.titulo, url: abs(prodUrl(p)) },
      })),
    },
  };
}
const crumbsLD = items => ({
  '@type': 'BreadcrumbList',
  '@id': `${abs(items[items.length - 1].url)}#breadcrumb`,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, item: abs(it.url) })),
});
const faqLD = itens => ({
  '@type': 'FAQPage',
  mainEntity: itens.map(f => ({
    '@type': 'Question',
    name: f.pergunta,
    acceptedAnswer: { '@type': 'Answer', text: f.resposta },
  })),
});

/* ================= layout ================= */
function head({ seo, route, ld = [], noindex = false, pageType = 'WebPage', preload = '', modified }) {
  const s = C.site,
    r = s.rastreamento;
  const title = seo.title,
    desc = seo.description;
  const img = s.url + ogFor(route);
  const webpage = {
    '@type': pageType,
    '@id': `${abs(route)}#webpage`,
    url: abs(route),
    name: title,
    description: desc,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': `${s.url}/#site` },
    about: { '@id': `${s.url}/#organizacao` },
    primaryImageOfPage: { '@type': 'ImageObject', url: img },
    dateModified: modified || C.buildDate,
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      orgLD(),
      {
        '@type': 'WebSite',
        '@id': `${s.url}/#site`,
        url: `${s.url}/`,
        name: s.nome,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${s.url}/#organizacao` },
      },
      webpage,
      ...ld,
    ],
  };
  const robots = C.preview || noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${abs(route)}">
<link rel="alternate" hreflang="pt-BR" href="${abs(route)}">
<link rel="alternate" type="application/rss+xml" title="Blog ${esc(s.nome)}" href="${C.base}/blog/feed.xml">
<meta property="og:type" content="${pageType === 'Article' ? 'article' : 'website'}">
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
${preload}
<link rel="stylesheet" href="${C.assets.css}">
<script>
document.documentElement.classList.add('js');
window.AXLO = ${JSON.stringify({ base: C.base, whatsapp: digits(s.contato.whatsapp), whatsappMensagem: s.contato.whatsappMensagem, gtm: r.gtmId, ga4: r.ga4Id, preview: C.preview })};
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500 });
try { var c = JSON.parse(localStorage.getItem('axlo_consent')); if (c) gtag('consent', 'update', { analytics_storage: c.medicao ? 'granted' : 'denied', ad_storage: c.marketing ? 'granted' : 'denied', ad_user_data: c.marketing ? 'granted' : 'denied', ad_personalization: c.marketing ? 'granted' : 'denied' }); } catch (e) {}
${
  r.gtmId
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(r.gtmId)}');`
    : r.ga4Id
      ? `(function(){var j=document.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id=${esc(r.ga4Id)}';document.head.appendChild(j);gtag('js', new Date());gtag('config', '${esc(r.ga4Id)}');})();`
      : ''
}
</script>
<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>`;
}

function header(route) {
  const s = C.site;
  const menuCol = (cat, hub, titulo, extra = '') => `
    <div class="mega-col">
      <a class="mega-hub" href="${u(hub)}">${esc(titulo)} ${icon('arrow-right')}</a>
      ${byCat(cat)
        .map(
          p =>
            `<a class="mega-item" href="${u(prodUrl(p))}">${icon(p.icone)}<span><b>${esc(p.titulo)}</b><small>${esc(p.resumo)}</small></span></a>`,
        )
        .join('')}
      ${extra}
    </div>`;
  const cur = r => (route === r || route.startsWith(`${r}/`) ? ' aria-current="page"' : '');
  const novidades = s.novidades
    .map(
      n =>
        `<a href="${u(n.link)}" class="bp-item"><span class="bp-ic">${icon('bell')}</span><span><b>${esc(n.titulo)}</b><small>${esc(n.texto)}</small></span></a>`,
    )
    .join('');
  const gestaoLink = `<a class="mega-item" href="${u('/gestao-e-inteligencia')}">${icon('chart')}<span><b>Gestão e relatórios</b><small>Acompanhamento do contrato e programas de saúde.</small></span></a>`;
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
        <div class="mega" id="mega-saude">${menuCol('beneficios', '/saude-e-beneficios', 'Ver saúde e benefícios', gestaoLink)}</div>
      </div>
      <div class="has-mega">
        <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mega-seguros"${cur('/seguros-corporativos')}>Seguros Corporativos ${icon('chevron-down')}</button>
        <div class="mega mega-wide" id="mega-seguros">${menuCol('seguros', '/seguros-corporativos', 'Ver seguros corporativos')}</div>
      </div>
      <a href="${u('/sobre')}"${cur('/sobre')}>Sobre</a>
      <a href="${u('/blog')}"${cur('/blog')}>Blog</a>
      <a href="${u('/contato')}"${cur('/contato')}>Contato</a>
    </nav>
    <div class="nav-cta">
      <div class="bell-wrap">
        <button class="bell" type="button" aria-label="Novidades: ${s.novidades.length} novas" aria-expanded="false" aria-controls="bellPanel">${icon('bell')}<span class="bell-dot">${s.novidades.length}</span></button>
        <div class="bell-panel" id="bellPanel" hidden><p class="bp-title">Novidades</p>${novidades}</div>
      </div>
      <a href="${u('/contato')}" class="btn btn-primary btn-sm nav-diag">Solicitar proposta</a>
      <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<nav class="drawer" id="drawer" aria-label="Menu">
  <details><summary>Saúde &amp; Benefícios ${icon('chevron-down')}</summary>
    <a href="${u('/saude-e-beneficios')}">Visão geral</a>${byCat('beneficios')
      .map(p => `<a href="${u(prodUrl(p))}">${esc(p.titulo)}</a>`)
      .join('')}<a href="${u('/gestao-e-inteligencia')}">Gestão e relatórios</a></details>
  <details><summary>Seguros Corporativos ${icon('chevron-down')}</summary>
    <a href="${u('/seguros-corporativos')}">Visão geral</a>${byCat('seguros')
      .map(p => `<a href="${u(prodUrl(p))}">${esc(p.titulo)}</a>`)
      .join('')}</details>
  <a class="dl" href="${u('/sobre')}">Sobre</a>
  <a class="dl" href="${u('/blog')}">Blog</a>
  <a class="dl" href="${u('/contato')}">Contato</a>
  <a href="${u('/contato')}" class="btn btn-primary">Solicitar proposta</a>
</nav>`;
}

function footer() {
  const s = C.site,
    e = s.empresa,
    ct = s.contato;
  const col = (t, links) =>
    `<details class="f-col" open><summary class="f-h">${t}${icon('chevron-down')}</summary><ul>${links.map(([n, l]) => `<li><a href="${u(l)}">${esc(n)}</a></li>`).join('')}</ul></details>`;
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
      ${col('AXLO', [
        ['Sobre', '/sobre'],
        ['Gestão e relatórios', '/gestao-e-inteligencia'],
        ['Blog', '/blog'],
        ['Contato', '/contato'],
        ['Política de privacidade', '/politica-de-privacidade'],
      ])}
      <div>
        <h2 class="f-h">Fale com a AXLO</h2>
        <ul class="f-contact">
          ${ct.telefone ? `<li><a href="tel:${tel(ct.telefone)}">${icon('phone')}${esc(ct.telefone)}</a></li>` : ''}
          ${ct.whatsapp ? `<li><a href="#" class="js-wa" data-origem="rodape">${icon('whatsapp')}WhatsApp</a></li>` : ''}
          ${ct.email ? `<li><a href="mailto:${esc(ct.email)}">${icon('mail')}${esc(ct.email)}</a></li>` : ''}
          <li>${icon('map-pin')}${esc([e.endereco, `${e.cidade}/${e.uf}`].filter(Boolean).join(', '))}</li>
        </ul>
        ${Object.entries(s.redes)
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<a class="f-social" href="${esc(v)}" rel="noopener" target="_blank">${k === 'linkedin' ? 'LinkedIn' : 'Instagram'}</a>`,
          )
          .join(' ')}
      </div>
    </div>
    <div class="f-bottom">
      <p>© ${new Date().getFullYear()} ${esc(e.razaoSocial || s.nome)}${e.cnpj ? ` · CNPJ ${esc(e.cnpj)}` : ''} · Corretora de seguros registrada na SUSEP sob o nº ${esc(e.susep)}</p>
      <p><a href="${u('/politica-de-privacidade')}">Política de privacidade</a> · <button type="button" class="link-btn js-cookie-prefs">Preferências de cookies</button></p>
    </div>
    <p class="f-legal">A ${esc(s.nome)} é uma corretora de seguros e não é operadora de planos de saúde nem seguradora. Coberturas, carências, rede e preços dependem do contrato e da apólice de cada operadora ou seguradora. Marcas citadas pertencem aos seus titulares.</p>
  </div>
</footer>
${C.site.contato.whatsapp ? `<a class="wa js-wa" href="#" data-origem="botao-flutuante" aria-label="Falar com a AXLO pelo WhatsApp">${icon('whatsapp')}</a>` : ''}
${cookieBanner()}
<script src="${C.assets.js}" defer></script>
</body>
</html>`;
}

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

function layout({ route, seo, ld, body, noindex, cls = '', pageType, preload, modified }) {
  return (
    head({ seo, route, ld, noindex, pageType, preload, modified }) +
    `\n<body class="${cls}">` +
    header(route) +
    `\n<main id="conteudo">${body}</main>` +
    footer()
  );
}

/* ================= componentes ================= */
function breadcrumb(items) {
  return `<nav class="crumbs wrap" aria-label="Você está em"><ol>${items.map((it, i) => (i < items.length - 1 ? `<li><a href="${u(it.url)}">${esc(it.nome)}</a></li>` : `<li aria-current="page">${esc(it.nome)}</li>`)).join('')}</ol></nav>`;
}

function produtoCard(p) {
  return `<a class="p-card rv" href="${u(prodUrl(p))}">
    <span class="p-ic">${icon(p.icone)}</span>
    <h3>${esc(p.titulo)}</h3>
    <p>${esc(p.resumo)}</p>
    <span class="p-more">Saiba mais ${icon('arrow-right')}</span>
  </a>`;
}

function gradeProdutos(cat, { cols = 4 } = {}) {
  const lista = byCat(cat);
  const sobra = lista.length % cols;
  const extra =
    cat === 'seguros' && sobra
      ? `<a class="p-card p-card-cta rv" href="${u('/contato')}"><span class="p-ic">${icon('shield')}</span><h3>Outros ramos</h3><p>Vida, transporte, equipamentos, eventos e outros seguros empresariais.</p><span class="p-more">Falar com a AXLO ${icon('arrow-right')}</span></a>`
      : '';
  return `<div class="p-grid p-grid-${cols}">${lista.map(produtoCard).join('')}${extra}</div>`;
}

function postCard(p, { destaque = false } = {}) {
  return `<a class="post-card rv${destaque ? ' post-card-lg' : ''}" href="${u(postUrl(p))}" data-cat="${esc(slugify(p.categoria))}">
    <span class="post-cat">${esc(p.categoria)}</span>
    <h3>${esc(p.titulo)}</h3>
    <p>${esc(p.resumo)}</p>
    <span class="post-meta">${icon('clock')} ${p.leitura} min de leitura</span>
  </a>`;
}

function faqBlock(titulo, itens, id = 'duvidas') {
  return `<section class="sec sec-nevoa" id="${id}">
    <div class="wrap faq-grid">
      <div><h2>${esc(titulo)}</h2></div>
      <div class="faq rv">${itens.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.pergunta)}<span class="plus" aria-hidden="true"></span></summary><div class="ans"><div><p>${esc(f.resposta)}</p></div></div></details>`).join('')}</div>
    </div>
  </section>`;
}

const OPCOES_INTERESSE = [
  'Plano de saúde empresarial',
  'Benefícios corporativos',
  'Seguros corporativos',
  'Gestão de NR-01',
  'Diagnóstico do contrato atual',
  'Outro assunto',
];

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
  return `<section class="sec sec-indigo cta-sec" id="proposta">
    <div class="x-mark" aria-hidden="true"></div>
    <div class="wrap cta-grid">
      <div class="cta-copy">
        ${eyebrow(eb)}
        <h2>${esc(titulo)}</h2>
        <p>${esc(texto)}</p>
        <ul class="cta-steps">${C.paginas.contato.proximosPassos.itens.map((t, i) => `<li><span>${i + 1}</span>${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="cta-form rv">${leadForm({ origem, interesse })}</div>
    </div>
  </section>`;
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
        ${cta ? `<div class="hero-ctas"><a href="#proposta" class="btn btn-primary">Solicitar proposta ${icon('arrow-right')}</a></div>` : ''}
      </div>
      ${ic ? `<div class="ph-ic" aria-hidden="true">${icon(ic)}</div>` : ''}
    </div>
  </section>`;
}

/* ================= HOME ================= */
const STATUS = { recomendado: 'st-rec', contratado: 'st-ok', ativo: 'st-ok', 'em cotação': 'st-wait', opção: 'st-opt' };

function heroSlider(slides) {
  return `<div class="hs" id="hs" aria-roledescription="carrossel" aria-label="Exemplos do que a AXLO contrata e acompanha">
    <div class="hs-stage">
      ${slides
        .map((s, k) => {
          const side = s.lado === 'esquerda' ? 'left' : 'right';
          return `<article class="hs-slide${k ? '' : ' on'}" data-side="${side}" aria-roledescription="slide" aria-label="${k + 1} de ${slides.length}: ${esc(s.card.titulo)}">
          <div class="hs-media">
            ${picture(s.foto, { alt: '', sizes: '(max-width: 640px) 100vw, (max-width: 1060px) calc(100vw - 48px), 100vw', eager: k === 0 ? true : 'low', style: `--mx:${esc(s.posicaoMobile)}` })}
            <div class="hs-notif"><span class="ni">${icon('check')}</span><span><small>${esc(s.notificacao.titulo)}</small>${esc(s.notificacao.texto)}</span></div>
          </div>
          <div class="hs-card">
            <div class="hs-head">${picture(s.avatar, { alt: '', sizes: '40px', cls: 'hs-av' })}<span><b>${esc(s.nome)}</b><small>${esc(s.papel)}</small></span></div>
            <p class="hs-label">${esc(s.card.titulo)}</p>
            <p class="hs-big"><span class="hs-total" data-count="${s.card.destaque}">${br(s.card.destaque)}</span><span class="hs-big-t">${esc(s.card.destaqueTexto)}</span></p>
            <ul>${s.card.itens.map((it, i) => `<li style="--k:${i}"><span class="hs-it"><b>${esc(it.rotulo)}</b><small>${esc(it.detalhe)}</small></span><span class="st ${STATUS[it.status.toLowerCase()] || 'st-opt'}">${esc(it.status)}</span></li>`).join('')}</ul>
            <p class="hs-ilustr">Exemplo ilustrativo</p>
          </div>
        </article>`;
        })
        .join('')}
    </div>
    <div class="hs-nav">
      <div class="hs-bars">${slides.map((s, i) => `<button type="button" aria-label="Ver exemplo ${i + 1}: ${esc(s.card.titulo)}"><span><i></i></span>${esc(s.card.titulo)}</button>`).join('')}</div>
      <div class="arrows"><button class="prev" type="button" aria-label="Exemplo anterior">${icon('arrow-left')}</button><button class="next" type="button" aria-label="Próximo exemplo">${icon('arrow-right')}</button></div>
    </div>
  </div>`;
}

function operadoras() {
  const o = C.site.operadoras;
  if (!o.mostrar || !o.logos.length) return '';
  const row = hid =>
    o.logos
      .map(
        l =>
          `<div class="op"><img src="${u(l.arquivo)}" alt="${hid ? '' : esc(l.nome)}" loading="lazy" height="32"></div>`,
      )
      .join('');
  return `<div class="logos"><p class="eyebrow wrap">${esc(o.titulo)}</p><div class="marquee"><div class="mq-track">${row(false)}<div class="mq-dup" aria-hidden="true">${row(true)}</div></div></div></div>`;
}

// grade de soluções da home: sempre fecha as linhas (benefícios 3 colunas + gestão; seguros 4 colunas + outros ramos)
function solGrid(cat) {
  const lista = byCat(cat);
  const tile = (p, k) =>
    `<a class="sol" href="${u(prodUrl(p))}" style="--k:${k}"><span class="p-ic">${icon(p.icone)}</span><span><b>${esc(p.titulo)}</b><small>${esc(p.resumo)}</small></span>${icon('arrow-right', 'sol-arr')}</a>`;
  const extra =
    cat === 'seguros'
      ? `<a class="sol sol-cta" href="${u('/contato')}" style="--k:${lista.length}"><span class="p-ic">${icon('shield')}</span><span><b>Outros ramos</b><small>Vida, transporte, equipamentos e eventos.</small></span>${icon('arrow-right', 'sol-arr')}</a>`
      : `<a class="sol sol-cta" href="${u('/gestao-e-inteligencia')}" style="--k:${lista.length}"><span class="p-ic">${icon('chart')}</span><span><b>Gestão e relatórios</b><small>Movimentações, concierge e relatórios para a diretoria.</small></span>${icon('arrow-right', 'sol-arr')}</a>`;
  return `<div class="sol-grid${cat === 'seguros' ? ' sol-grid-4' : ''}">${lista.map(tile).join('')}${extra}</div>`;
}

function home() {
  const h = C.paginas.home;
  const first = C.images[h.slides[0].foto];
  const preload = first
    ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${first.variants.avif.map(v => `${v.url} ${v.w}w`).join(', ')}" imagesizes="(max-width: 640px) 100vw, (max-width: 1060px) calc(100vw - 48px), 100vw" fetchpriority="high">`
    : '';
  const ultimos = C.posts.slice(0, 3);
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

  <section class="sec" id="solucoes">
    <div class="wrap">
      <div class="sec-head sec-head-row">
        <div>${eyebrow(h.solucoes.eyebrow)}<h2>${esc(h.solucoes.titulo)}</h2></div>
        <div class="tabs" role="tablist" aria-label="Soluções">
          ${h.solucoes.abas.map((a, i) => `<button type="button" role="tab" id="tab-${a.categoria}" aria-controls="painel-${a.categoria}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(a.titulo)}</button>`).join('')}
          <span class="tab-ink" aria-hidden="true"></span>
        </div>
      </div>
      ${h.solucoes.abas
        .map(
          (
            a,
            i,
          ) => `<div class="tab-panel${i === 0 ? ' on' : ''}" role="tabpanel" id="painel-${a.categoria}" aria-labelledby="tab-${a.categoria}">
        <div class="tp-head"><p>${esc(a.texto)}</p><a class="link-arrow" href="${u(a.link)}">Ver todos ${icon('arrow-right')}</a></div>
        ${solGrid(a.categoria)}
      </div>`,
        )
        .join('')}
    </div>
  </section>

  <section class="sec sec-nevoa como">
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.como.eyebrow)}<h2>${esc(h.como.titulo)}</h2></div>
      <ol class="timeline" style="--prog:0">
        <span class="tl-line" aria-hidden="true"><i></i></span>
        ${h.como.etapas.map((e, i) => `<li class="tl-step" style="--i:${i}"><span class="tl-dot">${String(i + 1).padStart(2, '0')}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.texto)}</p></li>`).join('')}
      </ol>
    </div>
  </section>

  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head">${eyebrow(h.provas.eyebrow)}<h2>${esc(h.provas.titulo)}</h2></div>
      <div class="provas">${h.provas.itens.map((p, i) => `<div class="prova rv" style="--d:${i * 0.06}s"><span class="prova-ic">${icon(p.icone)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div>
    </div>
  </section>

  ${
    ultimos.length
      ? `<section class="sec">
    <div class="wrap">
      <div class="sec-head sec-head-row"><div>${eyebrow(h.blog.eyebrow)}<h2>${esc(h.blog.titulo)}</h2></div><a class="link-arrow" href="${u('/blog')}">${esc(h.blog.linkTexto)} ${icon('arrow-right')}</a></div>
      <div class="post-grid post-grid-scroll">${ultimos.map(p => postCard(p)).join('')}</div>
    </div>
  </section>`
      : ''
  }

  ${faqBlock(h.faq.titulo, h.faq.itens)}
  ${ctaForm({ eyebrow: h.ctaFinal.eyebrow, titulo: h.ctaFinal.titulo, texto: h.ctaFinal.texto, origem: 'home', interesse: 'Plano de saúde empresarial' })}`;
  return {
    route: '/',
    html: layout({ route: '/', seo: h.seo, ld: [faqLD(h.faq.itens)], body, cls: 'page-home', preload }),
  };
}

/* ================= HUBS ================= */
function relacionadosPosts(slugProduto, limite = 3) {
  return C.posts.filter(p => (p.relacionados || []).includes(slugProduto)).slice(0, limite);
}

function hubSaude() {
  const p = C.paginas['saude-e-beneficios'];
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Saúde & Benefícios', url: '/saude-e-beneficios' },
  ];
  const posts = C.posts.filter(x => ['Saúde empresarial', 'Benefícios e RH'].includes(x.categoria)).slice(0, 3);
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'heart-pulse' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head sec-head-split"><div><h2>${esc(p.intro.titulo)}</h2></div><p>${esc(p.intro.texto)}</p></div>
      ${gradeProdutos('beneficios', { cols: 3 })}
    </div>
  </section>
  <section class="sec sec-nevoa" id="servicos">
    <div class="wrap">
      <div class="sec-head"><h2>${esc(p.servicos.titulo)}</h2></div>
      <div class="servicos servicos-4">${p.servicos.itens.map(s => `<div class="servico rv"><span class="p-ic">${icon(s.icone)}</span><div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></div>`).join('')}</div>
    </div>
  </section>
  ${posts.length ? `<section class="sec"><div class="wrap"><div class="sec-head sec-head-row"><div><p class="eyebrow">Conteúdos</p><h2>Para entender antes de decidir</h2></div><a class="link-arrow" href="${u('/blog')}">Ver o blog ${icon('arrow-right')}</a></div><div class="post-grid post-grid-scroll">${posts.map(x => postCard(x)).join('')}</div></div></section>` : ''}
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'saude-e-beneficios', interesse: 'Benefícios corporativos' })}`;
  return {
    route: '/saude-e-beneficios',
    html: layout({
      route: '/saude-e-beneficios',
      seo: p.seo,
      ld: [crumbsLD(crumbs)],
      body,
      pageType: 'CollectionPage',
    }),
  };
}

function hubSeguros() {
  const p = C.paginas['seguros-corporativos'];
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Seguros Corporativos', url: '/seguros-corporativos' },
  ];
  const posts = C.posts.filter(x => ['Seguros corporativos', 'Gestão de riscos'].includes(x.categoria)).slice(0, 3);
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'shield' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head sec-head-split"><div><h2>${esc(p.intro.titulo)}</h2></div><p>${esc(p.intro.texto)}</p></div>
      ${gradeProdutos('seguros')}
    </div>
  </section>
  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><h2>${esc(p.etapas.titulo)}</h2></div>
      ${steps(p.etapas.itens)}
    </div>
  </section>
  ${posts.length ? `<section class="sec"><div class="wrap"><div class="sec-head sec-head-row"><div><p class="eyebrow">Conteúdos</p><h2>Para entender antes de decidir</h2></div><a class="link-arrow" href="${u('/blog')}">Ver o blog ${icon('arrow-right')}</a></div><div class="post-grid post-grid-scroll">${posts.map(x => postCard(x)).join('')}</div></div></section>` : ''}
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'seguros-corporativos', interesse: 'Seguros corporativos' })}`;
  return {
    route: '/seguros-corporativos',
    html: layout({
      route: '/seguros-corporativos',
      seo: p.seo,
      ld: [crumbsLD(crumbs)],
      body,
      pageType: 'CollectionPage',
    }),
  };
}

/* ================= PRODUTO ================= */
function produtoPage(p) {
  const hubUrl = p.categoria === 'seguros' ? '/seguros-corporativos' : '/saude-e-beneficios';
  const hubNome = p.categoria === 'seguros' ? 'Seguros Corporativos' : 'Saúde & Benefícios';
  const route = prodUrl(p);
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: hubNome, url: hubUrl },
    { nome: p.titulo, url: route },
  ];
  const outros = byCat(p.categoria)
    .filter(x => x.slug !== p.slug)
    .slice(0, 3);
  const posts = relacionadosPosts(p.slug);
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ eyebrow: p.hero.eyebrow, titulo: p.hero.titulo, subtitulo: p.hero.subtitulo, ic: p.icone })}
  <section class="sec">
    <div class="wrap pq-grid">
      <div><h2>Para quem é</h2><p class="big-p">${esc(p.paraQuem)}</p></div>
      <div class="situacoes rv"><p class="label">Situações em que faz diferença</p><ul>${p.situacoes.map(s => `<li>${icon('check')}${esc(s)}</li>`).join('')}</ul></div>
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head"><h2>${p.categoria === 'seguros' ? 'O que a apólice pode proteger' : 'O que está incluído'}</h2><p class="sub">Coberturas, limites e exclusões dependem ${p.categoria === 'seguros' ? 'da apólice escolhida' : 'da operadora e do contrato escolhidos'}.</p></div>
      <div class="protege">${p.protege.map((x, i) => `<div class="pr-i rv" style="--d:${i * 0.05}s"><span class="pr-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  <section class="sec sec-noite">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Como trabalhamos</p><h2>Como a AXLO atua</h2></div>
      ${steps(p.comoAxloAtua)}
    </div>
  </section>
  ${faqBlock('Perguntas frequentes', p.faq)}
  ${posts.length ? `<section class="sec sec-tight-top"><div class="wrap"><div class="sec-head"><p class="eyebrow">Conteúdos</p><h2>Para saber mais</h2></div><div class="post-grid post-grid-scroll">${posts.map(x => postCard(x)).join('')}</div></div></section>` : ''}
  ${outros.length ? `<section class="sec sec-tight-top"><div class="wrap"><div class="sec-head"><h2>Veja também</h2></div><div class="p-grid p-grid-3">${outros.map(produtoCard).join('')}</div></div></section>` : ''}
  ${ctaForm({ titulo: p.cta.titulo, texto: p.cta.texto, origem: p.slug, interesse: p.titulo })}`;
  const service = {
    '@type': 'Service',
    '@id': `${abs(route)}#servico`,
    name: p.titulo,
    description: p.seo.description,
    serviceType: p.titulo,
    category: hubNome,
    provider: { '@id': `${C.site.url}/#organizacao` },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    audience: { '@type': 'BusinessAudience', audienceType: 'Empresas' },
    url: abs(route),
  };
  return { route, html: layout({ route, seo: p.seo, ld: [crumbsLD(crumbs), faqLD(p.faq), service], body }) };
}

/* ================= BLOG ================= */
function blogIndex() {
  const route = '/blog';
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Blog', url: route },
  ];
  const cats = [...new Set(C.posts.map(p => p.categoria))];
  const [primeiro, ...resto] = C.posts;
  const seo = {
    title: 'Blog AXLO | Saúde, benefícios e seguros corporativos',
    description:
      'Conteúdos sem jargão sobre plano de saúde empresarial, reajuste, sinistralidade, benefícios, NR-01 e seguros corporativos para sócios, financeiro e RH.',
  };
  const body = `${breadcrumb(crumbs)}
  <section class="page-hero page-hero-sm">
    <div class="x-mark x-hero" aria-hidden="true"></div>
    <div class="wrap"><p class="eyebrow">Blog AXLO</p><h1>Saúde e seguros corporativos, explicados sem jargão</h1><p class="lead">Conteúdos para quem decide sobre plano de saúde, benefícios e seguros na empresa.</p></div>
  </section>
  <section class="sec sec-tight">
    <div class="wrap">
      <h2 class="sr-only">Todos os artigos</h2>
      <div class="chips" role="group" aria-label="Filtrar por tema">
        <button type="button" class="chip on" data-filtro="todos" aria-pressed="true">Todos</button>
        ${cats.map(c => `<button type="button" class="chip" data-filtro="${esc(slugify(c))}" aria-pressed="false">${esc(c)}</button>`).join('')}
      </div>
      ${primeiro ? `<div class="post-grid post-grid-feature">${postCard(primeiro, { destaque: true })}${resto.map(p => postCard(p)).join('')}</div>` : '<p>Em breve.</p>'}
    </div>
  </section>
  ${ctaForm({ titulo: C.paginas.home.ctaFinal.titulo, texto: C.paginas.home.ctaFinal.texto, origem: 'blog', interesse: 'Plano de saúde empresarial' })}`;
  const list = {
    '@type': 'ItemList',
    itemListElement: C.posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(postUrl(p)),
      name: p.titulo,
    })),
  };
  return { route, html: layout({ route, seo, ld: [crumbsLD(crumbs), list], body, pageType: 'CollectionPage' }) };
}

function postPage(p) {
  const route = postUrl(p);
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Blog', url: '/blog' },
    { nome: p.titulo, url: route },
  ];
  const toc = [];
  const corpo = md(p.corpo, { toc });
  const produtos = (p.relacionados || []).map(prodBySlug).filter(Boolean);
  const mesmos = C.posts
    .filter(x => x.slug !== p.slug && x.categoria === p.categoria)
    .concat(C.posts.filter(x => x.slug !== p.slug && x.categoria !== p.categoria))
    .slice(0, 3);
  const interesse = produtos[0] ? produtos[0].titulo : 'Plano de saúde empresarial';
  const body = `${breadcrumb(crumbs)}
  <article class="post">
    <header class="post-head wrap">
      <p class="eyebrow">${esc(p.categoria)}</p>
      <h1>${esc(p.titulo)}</h1>
      <p class="lead">${esc(p.resumo)}</p>
      <p class="post-info"><span>Por <b>Equipe ${esc(C.site.nome)}</b>, corretora registrada na SUSEP nº ${esc(C.site.empresa.susep)}</span><span>${icon('clock')} ${p.leitura} min de leitura</span><span>Atualizado em <time datetime="${p.atualizadoEm}">${dataBR(p.atualizadoEm)}</time></span></p>
    </header>
    <div class="wrap post-grid-main">
      <aside class="post-aside">
        ${toc.length ? `<nav class="toc" aria-label="Neste artigo"><details class="toc-d" open><summary class="label">Neste artigo ${icon('chevron-down')}</summary><ol>${toc.map(t => `<li><a href="#${t.id}">${esc(t.titulo)}</a></li>`).join('')}</ol></details></nav>` : ''}
        <a class="btn btn-primary btn-block aside-cta" href="#proposta">Solicitar proposta</a>
      </aside>
      <div class="post-body">
        <div class="em-resumo"><p class="label">Em resumo</p><ul>${(p.emResumo || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div class="prose">${corpo}</div>
        ${p.faq?.length ? `<section class="post-faq"><h2 id="perguntas-frequentes">Perguntas frequentes</h2><div class="faq">${p.faq.map(f => `<details><summary>${esc(f.pergunta)}<span class="plus" aria-hidden="true"></span></summary><div class="ans"><div><p>${esc(f.resposta)}</p></div></div></details>`).join('')}</div></section>` : ''}
        ${produtos.length ? `<div class="post-prods"><p class="label">Soluções relacionadas</p><div class="p-grid p-grid-2">${produtos.slice(0, 2).map(produtoCard).join('')}</div></div>` : ''}
        <p class="post-aviso">Este conteúdo é informativo. Coberturas, carências, reajustes e condições dependem do contrato e da apólice de cada operadora ou seguradora.</p>
      </div>
    </div>
  </article>
  ${mesmos.length ? `<section class="sec sec-nevoa"><div class="wrap"><div class="sec-head"><h2>Continue lendo</h2></div><div class="post-grid post-grid-scroll">${mesmos.map(x => postCard(x)).join('')}</div></div></section>` : ''}
  ${ctaForm({ titulo: 'Fale com quem acompanha o contrato o ano inteiro', texto: 'Conte o que a empresa precisa. Uma pessoa da AXLO responde em horário comercial, com nome e prazo.', origem: `blog:${p.slug}`, interesse })}`;
  const article = {
    '@type': 'BlogPosting',
    '@id': `${abs(route)}#artigo`,
    headline: p.titulo,
    description: p.seo.description,
    image: C.site.url + ogFor(route),
    datePublished: p.publicadoEm,
    dateModified: p.atualizadoEm,
    inLanguage: 'pt-BR',
    articleSection: p.categoria,
    keywords: (p.tags || []).join(', '),
    wordCount: palavras(p.corpo),
    author: { '@id': `${C.site.url}/#organizacao` },
    publisher: { '@id': `${C.site.url}/#organizacao` },
    mainEntityOfPage: { '@id': `${abs(route)}#webpage` },
    about: produtos.map(x => ({ '@type': 'Service', name: x.titulo, url: abs(prodUrl(x)) })),
  };
  return {
    route,
    html: layout({
      route,
      seo: p.seo,
      ld: [crumbsLD(crumbs), article, ...(p.faq?.length ? [faqLD(p.faq)] : [])],
      body,
      cls: 'page-post',
      modified: p.atualizadoEm,
    }),
  };
}

/* ================= GESTÃO & INTELIGÊNCIA ================= */
function gestao() {
  const p = C.paginas['gestao-e-inteligencia'];
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Gestão e relatórios', url: '/gestao-e-inteligencia' },
  ];
  const meses = [
    ['Mai', 64],
    ['Jun', 72],
    ['Jul', 81],
    ['Ago', 76],
    ['Set', 69],
    ['Out', 84],
  ];
  const acima = meses.filter(m => m[1] > 70).length;
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, ic: 'chart' })}
  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><h2>${esc(p.metodo.titulo)}</h2></div>
      ${steps(p.metodo.etapas)}
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap dash-grid">
      <div>
        <p class="eyebrow">Relatórios AXLO</p>
        <h2>${esc(p.dashboard.titulo)}</h2>
        <p class="big-p">${esc(p.dashboard.texto)}</p>
        <ul class="ticks rv">${p.dashboard.indicadores.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul>
        <p class="note">${icon('lock')} ${esc(p.dashboard.nota)}</p>
      </div>
      <figure class="dash rv" aria-label="Exemplo de gráfico de um relatório AXLO">
        <div class="dash-top"><img src="${C.base}/assets/brand/axlo-x.svg" alt="" width="20" height="22"><span>Relatório do contrato</span><span class="dash-tag">Exemplo ilustrativo</span></div>
        <figcaption class="dash-title">Sinistralidade acima do ponto de equilíbrio em ${acima} dos ${meses.length} meses</figcaption>
        <div class="dash-leg"><span><i class="lg-hi"></i>Acima do equilíbrio</span><span><i class="lg-lo"></i>Abaixo</span><span><i class="lg-be"></i>Ponto de equilíbrio (70%)</span></div>
        <div class="chart" style="--be:70%">
          <span class="be-line" aria-hidden="true"></span>
          ${meses.map(([m, v]) => `<div class="bar${v > 70 ? ' hi' : ''}" style="--v:${v}%"><b>${v}%</b><span>${m}</span></div>`).join('')}
        </div>
      </figure>
    </div>
  </section>
  <section class="sec">
    <div class="wrap pq-grid">
      <div><h2>${esc(p.relatorios.titulo)}</h2></div>
      <p class="big-p">${esc(p.relatorios.texto)}</p>
    </div>
  </section>
  <section class="sec sec-noite" id="programas">
    <div class="x-mark x-right" aria-hidden="true"></div>
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Prevenção</p><h2>${esc(p.programas.titulo)}</h2><p class="lead-dark">${esc(p.programas.texto)}</p></div>
      <div class="msg-grid msg-grid-3">${p.programas.itens.map(x => `<div class="msg rv"><p class="label">${esc(x.titulo)}</p><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  ${ctaForm({ titulo: p.ctaFinal.titulo, texto: p.ctaFinal.texto, origem: 'gestao-e-inteligencia', interesse: 'Diagnóstico do contrato atual' })}`;
  return {
    route: '/gestao-e-inteligencia',
    html: layout({ route: '/gestao-e-inteligencia', seo: p.seo, ld: [crumbsLD(crumbs)], body }),
  };
}

/* ================= SOBRE ================= */
function sobre() {
  const p = C.paginas.sobre;
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Sobre', url: '/sobre' },
  ];
  const cmp = p.comparativo;
  const body = `${breadcrumb(crumbs)}
  ${pageHero({ ...p.hero, cta: false })}
  <section class="sec sec-noite manifesto">
    <div class="x-mark" aria-hidden="true"></div>
    <div class="wrap manif-grid">
      <h2 class="label-lg">${esc(p.manifesto.titulo)}</h2>
      <div class="manif">${p.manifesto.paragrafos.map((t, i) => `<p${i === 0 || i === p.manifesto.paragrafos.length - 1 ? ' class="manif-strong"' : ''}>${esc(t)}</p>`).join('')}</div>
    </div>
  </section>
  <section class="sec">
    <div class="wrap pilares">${p.pilares.map(x => `<div class="pilar rv"><p class="label">${esc(x.rotulo)}</p><p>${esc(x.texto)}</p></div>`).join('')}</div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Como trabalhamos</p><h2>${esc(p.metodo.titulo)}</h2></div>
      ${steps(p.metodo.etapas)}
    </div>
  </section>
  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><p class="eyebrow">Valores</p><h2>${esc(p.valores.titulo)}</h2></div>
      <div class="valores">${p.valores.itens.map((v, i) => `<div class="valor rv" style="--d:${i * 0.05}s"><span class="valor-n">${i + 1}</span><h3>${esc(v.titulo)}</h3><p>${esc(v.texto)}</p></div>`).join('')}</div>
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap">
      <div class="sec-head">${eyebrow(cmp.eyebrow)}<h2>${esc(cmp.titulo)}</h2></div>
      <div class="cmp rv" role="table" aria-label="${esc(cmp.titulo)}">
        <div class="cmp-row cmp-head" role="row"><span role="columnheader">${esc(cmp.colunaAxlo)}</span><span role="columnheader">${esc(cmp.colunaOutro)}</span></div>
        ${cmp.linhas.map(l => `<div class="cmp-row" role="row"><span role="cell">${icon('check')}${esc(l.axlo)}</span><span role="cell">${icon('x')}${esc(l.outro)}</span></div>`).join('')}
      </div>
    </div>
  </section>
  <section class="sec">
    <div class="wrap simbolo">
      <div class="simbolo-x rv" aria-hidden="true"><img src="${C.base}/assets/brand/axlo-x.svg" alt="" width="220" height="246" loading="lazy"></div>
      <div><p class="eyebrow">O nome</p><h2>${esc(p.simbolo.titulo)}</h2><p class="big-p">${esc(p.simbolo.texto)}</p></div>
    </div>
  </section>
  <section class="sec sec-nevoa">
    <div class="wrap duo">
      <div class="duo-i rv"><span class="p-ic">${icon('heart-pulse')}</span><h3>${esc(p.lideranca.titulo)}</h3><p>${esc(p.lideranca.texto)}</p></div>
      <div class="duo-i rv"><span class="p-ic">${icon('shield')}</span><h3>${esc(p.registro.titulo)}</h3><p>${esc(p.registro.texto)}</p><a class="link-arrow" href="https://www2.susep.gov.br/safe/menumercado/REP2/Produtor.aspx" rel="noopener" target="_blank">Consultar na SUSEP ${icon('arrow-right')}</a></div>
    </div>
  </section>
  ${ctaForm({ titulo: C.paginas.home.ctaFinal.titulo, texto: C.paginas.home.ctaFinal.texto, origem: 'sobre', interesse: 'Plano de saúde empresarial' })}`;
  return {
    route: '/sobre',
    html: layout({ route: '/sobre', seo: p.seo, ld: [crumbsLD(crumbs)], body, pageType: 'AboutPage' }),
  };
}

/* ================= CONTATO ================= */
function contato() {
  const p = C.paginas.contato,
    ct = C.site.contato;
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Contato', url: '/contato' },
  ];
  const canal = (ic, t, v, href, cls = '') =>
    v
      ? `<li><span class="p-ic">${icon(ic)}</span><span><small>${t}</small>${href ? `<a href="${href}" class="${cls}"${cls ? ' data-origem="contato-canais"' : ''}>${esc(v)}</a>` : esc(v)}</span></li>`
      : '';
  const body = `${breadcrumb(crumbs)}
  <section class="page-hero page-hero-sm">
    <div class="x-mark x-hero" aria-hidden="true"></div>
    <div class="wrap">${eyebrow(p.hero.eyebrow)}<h1>${esc(p.hero.titulo)}</h1><p class="lead">${esc(p.hero.subtitulo)}</p></div>
  </section>
  <section class="sec sec-tight" id="proposta">
    <div class="wrap contato-grid">
      <div class="contato-form">${leadForm({ origem: 'contato', interesse: 'Plano de saúde empresarial', id: 'contato', nivel: 2 })}</div>
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
  return {
    route: '/contato',
    html: layout({ route: '/contato', seo: p.seo, ld: [crumbsLD(crumbs)], body, pageType: 'ContactPage' }),
  };
}

/* ================= PRIVACIDADE e 404 ================= */
function privacidade() {
  const p = C.paginas.privacidade,
    s = C.site,
    e = s.empresa;
  const tokens = {
    nome: s.nome,
    url: s.url.replace(/^https?:\/\//, ''),
    razaoSocialOuNome: e.razaoSocial || s.nome,
    cnpjTexto: e.cnpj ? `, inscrita no CNPJ ${e.cnpj}` : '',
    susep: e.susep,
    cidade: e.cidade,
    uf: e.uf,
    email: s.contato.email,
  };
  const corpo = p.corpo.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? '');
  const route = '/politica-de-privacidade';
  const crumbs = [
    { nome: 'Início', url: '/' },
    { nome: 'Política de privacidade', url: route },
  ];
  const body = `${breadcrumb(crumbs)}
  <article class="sec sec-tight"><div class="wrap prose prose-page"><h1>${esc(p.titulo)}</h1><p class="muted">Atualizada em ${dataBR(p.atualizadoEm)}</p>${md(corpo)}<p><button type="button" class="btn btn-ghost js-cookie-prefs">Alterar preferências de cookies</button></p></div></article>`;
  return { route, html: layout({ route, seo: p.seo, ld: [crumbsLD(crumbs)], body, modified: p.atualizadoEm }) };
}

function notFound() {
  const body = `<section class="page-hero nf"><div class="x-mark x-hero" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Erro 404</p><h1>Esta página não existe.</h1><p class="lead">O link pode ter mudado. Volte ao início ou fale com a AXLO.</p><div class="hero-ctas"><a href="${u('/')}" class="btn btn-primary">Ir para o início</a><a href="${u('/blog')}" class="btn btn-ghost">Ver o blog</a></div></div></section>`;
  return {
    route: '/404',
    noindex: true,
    html: layout({
      route: '/404',
      seo: { title: 'Página não encontrada | AXLO', description: 'Esta página não existe.' },
      body,
      noindex: true,
    }),
  };
}

/* ================= exporta ================= */
export function renderSite(ctx) {
  C = ctx;
  return [
    home(),
    sobre(),
    hubSaude(),
    hubSeguros(),
    gestao(),
    contato(),
    privacidade(),
    notFound(),
    blogIndex(),
    ...C.produtos.map(produtoPage),
    ...C.posts.map(postPage),
  ];
}
