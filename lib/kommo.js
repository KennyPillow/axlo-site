// Integração com o Kommo (API v4). Cria lead + contato + empresa no funil configurado,
// grava UTM/origem nos campos de rastreamento e anexa uma nota com tudo o que a pessoa enviou.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   KOMMO_SUBDOMAIN        subdomínio da conta (ex.: "axlo" para axlo.kommo.com)
//   KOMMO_TOKEN            token de longa duração da integração privada
//   KOMMO_PIPELINE_ID      ID do funil onde o lead do site entra
//   KOMMO_STATUS_ID        (opcional) etapa inicial; sem ela, entra na primeira etapa do funil
//   KOMMO_RESPONSIBLE_ID   (opcional) usuário responsável
//   KOMMO_FIELDS           (opcional) JSON com IDs de campos de texto: {"cargo":1,"colaboradores":2,"interesse":3,"origem":4}
//   KOMMO_TRACKING         (opcional) "off" para não usar os campos UTM nativos
//   KOMMO_BASE_URL         (só testes) URL alternativa, ex.: o Kommo simulado do servidor local

const TRACK = { utm_source: 'UTM_SOURCE', utm_medium: 'UTM_MEDIUM', utm_campaign: 'UTM_CAMPAIGN', utm_content: 'UTM_CONTENT', utm_term: 'UTM_TERM', referrer: 'UTM_REFERRER', gclid: 'GCLID', fbclid: 'FBCLID' };

export function kommoConfigurado(env = process.env) {
  return !!((env.KOMMO_SUBDOMAIN || env.KOMMO_BASE_URL) && env.KOMMO_TOKEN && env.KOMMO_PIPELINE_ID);
}

async function api(env, method, path, body) {
  const base = env.KOMMO_BASE_URL || `https://${env.KOMMO_SUBDOMAIN}.kommo.com`;
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${env.KOMMO_TOKEN}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text.slice(0, 300) }; }
  if (!res.ok) { const e = new Error(`Kommo ${res.status} em ${path}`); e.status = res.status; e.body = json; throw e; }
  return json;
}

export function montarNota(l) {
  const t = l.tracking || {};
  const linhas = [
    'Lead do site AXLO',
    `Nome: ${l.nome}`, `Empresa: ${l.empresa}`, `Cargo: ${l.cargo}`, `E-mail: ${l.email}`, `Telefone: ${l.telefone}`,
    `Colaboradores: ${l.colaboradores}`, `Assunto: ${l.interesse}`,
    l.mensagem ? `Mensagem: ${l.mensagem}` : '',
    '', 'Origem da conversão',
    `Formulário: ${l.origem} (página ${l.pagina})`,
    `Fonte: ${t.utm_source || (t.gclid ? 'google (gclid)' : t.referrer || 'direto')}`,
    t.utm_medium ? `Mídia: ${t.utm_medium}` : '', t.utm_campaign ? `Campanha: ${t.utm_campaign}` : '',
    t.utm_content ? `Conteúdo: ${t.utm_content}` : '', t.utm_term ? `Termo: ${t.utm_term}` : '',
    t.gclid ? `gclid: ${t.gclid}` : '', t.fbclid ? `fbclid: ${t.fbclid}` : '',
    t.landing ? `Página de entrada: ${t.landing}` : '',
    `Primeira origem: ${t.first_source || '-'} em ${t.first_landing || '-'}`,
    'Consentimento LGPD: sim',
  ];
  return linhas.filter(x => x !== '').join('\n');
}

export function montarLead(l, env = process.env, { comTracking = true } = {}) {
  const t = l.tracking || {};
  const campos = [];
  if (comTracking && env.KOMMO_TRACKING !== 'off') {
    for (const [k, code] of Object.entries(TRACK)) if (t[k]) campos.push({ field_code: code, values: [{ value: String(t[k]).slice(0, 250) }] });
  }
  let map = {};
  try { map = env.KOMMO_FIELDS ? JSON.parse(env.KOMMO_FIELDS) : {}; } catch { map = {}; }
  const extra = { cargo: l.cargo, colaboradores: l.colaboradores, interesse: l.interesse, origem: `${t.utm_source || 'site'} · ${l.origem}` };
  for (const [k, id] of Object.entries(map)) if (id && extra[k]) campos.push({ field_id: Number(id), values: [{ value: extra[k] }] });

  const lead = {
    name: `Site · ${l.empresa} · ${l.interesse}`.slice(0, 250),
    pipeline_id: Number(env.KOMMO_PIPELINE_ID),
    ...(env.KOMMO_STATUS_ID ? { status_id: Number(env.KOMMO_STATUS_ID) } : {}),
    ...(env.KOMMO_RESPONSIBLE_ID ? { responsible_user_id: Number(env.KOMMO_RESPONSIBLE_ID) } : {}),
    ...(campos.length ? { custom_fields_values: campos } : {}),
    _embedded: {
      tags: [{ name: 'site' }, { name: `form:${l.origem}` }, ...(t.utm_source ? [{ name: `utm:${t.utm_source}` }] : [])],
      contacts: [{
        first_name: l.nome,
        custom_fields_values: [
          { field_code: 'PHONE', values: [{ value: l.telefone, enum_code: 'WORK' }] },
          { field_code: 'EMAIL', values: [{ value: l.email, enum_code: 'WORK' }] },
          { field_code: 'POSITION', values: [{ value: l.cargo }] },
        ],
      }],
      companies: [{ name: l.empresa }],
    },
  };
  return lead;
}

export async function enviarParaKommo(l, env = process.env) {
  let res;
  try {
    res = await api(env, 'POST', '/api/v4/leads/complex', [montarLead(l, env)]);
  } catch (e) {
    // se a conta não tiver os campos de rastreamento ou o campo de cargo, tenta de novo sem eles (a nota guarda tudo)
    if (e.status !== 400) throw e;
    const lead = montarLead(l, env, { comTracking: false });
    lead._embedded.contacts[0].custom_fields_values = lead._embedded.contacts[0].custom_fields_values.filter(c => c.field_code !== 'POSITION');
    res = await api(env, 'POST', '/api/v4/leads/complex', [lead]);
  }
  const id = Array.isArray(res) ? res[0]?.id : res?._embedded?.leads?.[0]?.id;
  if (!id) throw new Error('Kommo não devolveu o ID do lead');
  try {
    await api(env, 'POST', '/api/v4/leads/notes', [{ entity_id: id, note_type: 'common', params: { text: montarNota(l) } }]);
  } catch { /* a nota é complemento; o lead já foi criado */ }
  return id;
}
