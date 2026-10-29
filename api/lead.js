// POST /api/lead · recebe o formulário do site, valida e cria o lead no Kommo.
import { enviarParaKommo, kommoConfigurado } from '../lib/kommo.js';

const LIMITE = new Map(); // tentativas por IP (melhor esforço; zera quando a função reinicia)

const str = (v, max) =>
  String(v ?? '')
    .trim()
    .slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validar(b) {
  const l = {
    nome: str(b.nome, 120),
    empresa: str(b.empresa, 120),
    email: str(b.email, 160).toLowerCase(),
    telefone: str(b.telefone, 20),
    cargo: str(b.cargo, 60),
    colaboradores: str(b.colaboradores, 30),
    interesse: str(b.interesse, 80),
    mensagem: str(b.mensagem, 1500),
    origem: str(b.origem, 60) || 'site',
    pagina: str(b.pagina, 200),
    tracking: {},
  };
  for (const k of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'gbraid',
    'wbraid',
    'fbclid',
    'referrer',
    'landing',
    'first_source',
    'first_landing',
    'first_at',
  ]) {
    if (b.tracking?.[k]) l.tracking[k] = str(b.tracking[k], 300);
  }
  const erros = [];
  if (l.nome.length < 3) erros.push('nome');
  if (l.empresa.length < 2) erros.push('empresa');
  if (!EMAIL.test(l.email)) erros.push('email');
  if (l.telefone.replace(/\D/g, '').length < 10) erros.push('telefone');
  if (!l.cargo) erros.push('cargo');
  if (!l.colaboradores) erros.push('colaboradores');
  if (!l.interesse) erros.push('interesse');
  if (b.consentimento !== true) erros.push('consentimento');
  return { lead: l, erros };
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length > 20000) throw new Error('grande');
  return JSON.parse(raw || '{}');
}

const responder = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { ok: false, erro: 'Use POST.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
  const agora = Date.now(),
    janela = (LIMITE.get(ip) || []).filter(t => agora - t < 10 * 60 * 1000);
  if (janela.length >= 8)
    return responder(res, 429, { ok: false, erro: 'Muitas tentativas. Tente de novo em alguns minutos.' });
  LIMITE.set(ip, [...janela, agora]);

  let body;
  try {
    body = await lerCorpo(req);
  } catch {
    return responder(res, 400, { ok: false, erro: 'Dados inválidos.' });
  }

  // robôs: campo escondido preenchido ou envio rápido demais
  if (body.website || Number(body.tempo) < 3) return responder(res, 200, { ok: true });

  const { lead, erros } = validar(body);
  if (erros.length)
    return responder(res, 422, { ok: false, erro: `Campos inválidos: ${erros.join(', ')}.`, campos: erros });

  if (!kommoConfigurado()) {
    console.error('[lead] Kommo não configurado; lead não salvo:', lead.email);
    return responder(res, 503, { ok: false, erro: 'Atendimento indisponível no momento.' });
  }
  try {
    const id = await enviarParaKommo(lead);
    return responder(res, 200, { ok: true, id });
  } catch (e) {
    console.error('[lead] falha no Kommo:', e.message, JSON.stringify(e.body || {}).slice(0, 500));
    return responder(res, 502, { ok: false, erro: 'Não foi possível registrar agora.' });
  }
}
