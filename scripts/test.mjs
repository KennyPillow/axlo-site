// Testes da função /api/lead e da integração com o Kommo (sem rede: o fetch é simulado).
//   npm test
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler, { validar } from '../api/lead.js';
import { montarLead, montarNota } from '../lib/kommo.js';

const ENV = { KOMMO_SUBDOMAIN: 'axlo', KOMMO_TOKEN: 't', KOMMO_PIPELINE_ID: '10', KOMMO_STATUS_ID: '20' };
const BOM = {
  nome: 'Ana Teste', empresa: 'Empresa X', email: 'ana@x.com.br', telefone: '(11) 98888-7777', cargo: 'Financeiro',
  colaboradores: '30 a 99', interesse: 'Seguros corporativos', mensagem: '', origem: 'd-o', pagina: '/seguros-corporativos/d-o',
  consentimento: true, tempo: 12, tracking: { utm_source: 'linkedin', utm_campaign: 'do-2026', landing: '/seguros-corporativos/d-o' },
};

function chamar(body, ip = '1.1.1.' + Math.floor(Math.random() * 250)) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST'; req.headers = { 'x-forwarded-for': ip };
  return new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b) }); } };
    handler(req, res);
  });
}

let fetchLog = [];
function fakeFetch(respostas) {
  fetchLog = [];
  let i = 0;
  globalThis.fetch = async (url, opt) => {
    fetchLog.push({ url, body: opt.body ? JSON.parse(opt.body) : null });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
}

const testes = [];
const t = (nome, fn) => testes.push([nome, fn]);

t('validação recusa dados ruins e sem consentimento', () => {
  const { erros } = validar({ ...BOM, email: 'ana@', telefone: '123', consentimento: false });
  assert.deepEqual(erros.sort(), ['consentimento', 'email', 'telefone']);
});

t('lead vai para o funil e etapa certos, com UTM e etiquetas', () => {
  const lead = montarLead(validar(BOM).lead, ENV);
  assert.equal(lead.pipeline_id, 10);
  assert.equal(lead.status_id, 20);
  assert.ok(lead.custom_fields_values.some(c => c.field_code === 'UTM_SOURCE' && c.values[0].value === 'linkedin'));
  assert.ok(lead._embedded.tags.some(x => x.name === 'form:d-o'));
  assert.ok(lead._embedded.tags.some(x => x.name === 'utm:linkedin'));
  assert.equal(lead._embedded.companies[0].name, 'Empresa X');
});

t('KOMMO_FIELDS grava cargo e porte em campos próprios', () => {
  const lead = montarLead(validar(BOM).lead, { ...ENV, KOMMO_FIELDS: '{"cargo":111,"colaboradores":222}' });
  assert.ok(lead.custom_fields_values.some(c => c.field_id === 111 && c.values[0].value === 'Financeiro'));
  assert.ok(lead.custom_fields_values.some(c => c.field_id === 222 && c.values[0].value === '30 a 99'));
});

t('nota guarda a origem e o consentimento', () => {
  const nota = montarNota(validar(BOM).lead);
  assert.match(nota, /Fonte: linkedin/);
  assert.match(nota, /Campanha: do-2026/);
  assert.match(nota, /Consentimento LGPD: sim/);
});

t('envio feliz devolve o ID do lead', async () => {
  Object.assign(process.env, ENV);
  fakeFetch([{ status: 200, body: [{ id: 555 }] }, { status: 200, body: {} }]);
  const r = await chamar(BOM);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, id: 555 });
  assert.equal(fetchLog[0].url, 'https://axlo.kommo.com/api/v4/leads/complex');
  assert.equal(fetchLog[1].url, 'https://axlo.kommo.com/api/v4/leads/notes');
});

t('conta sem campos de UTM: tenta de novo sem eles e o lead entra', async () => {
  fakeFetch([{ status: 400, body: { title: 'Bad Request' } }, { status: 200, body: [{ id: 777 }] }, { status: 200 }]);
  const r = await chamar(BOM);
  assert.equal(r.body.id, 777);
  assert.equal(fetchLog[1].body[0].custom_fields_values, undefined);
});

t('Kommo fora do ar devolve 502 e não finge sucesso', async () => {
  fakeFetch([{ status: 500, body: {} }]);
  const r = await chamar(BOM);
  assert.equal(r.status, 502);
  assert.equal(r.body.ok, false);
});

t('robô (campo escondido) recebe ok mas nada vai ao Kommo', async () => {
  fakeFetch([{ status: 200, body: [{ id: 1 }] }]);
  const r = await chamar({ ...BOM, website: 'http://spam' });
  assert.equal(r.body.ok, true);
  assert.equal(fetchLog.length, 0);
});

t('dados inválidos devolvem 422 com os campos', async () => {
  const r = await chamar({ ...BOM, email: 'x' });
  assert.equal(r.status, 422);
  assert.deepEqual(r.body.campos, ['email']);
});

t('sem Kommo configurado responde 503', async () => {
  for (const k of Object.keys(ENV)) delete process.env[k];
  const r = await chamar(BOM);
  assert.equal(r.status, 503);
});

t('limite de tentativas por IP', async () => {
  Object.assign(process.env, ENV);
  fakeFetch([{ status: 200, body: [{ id: 1 }] }, { status: 200 }]);
  let ultimo;
  for (let i = 0; i < 9; i++) ultimo = await chamar(BOM, '9.9.9.9');
  assert.equal(ultimo.status, 429);
});

let falhas = 0;
const log = console.error; console.error = () => {};
for (const [nome, fn] of testes) {
  try { await fn(); console.log('✔', nome); } catch (e) { falhas++; console.log('✖', nome, '\n   ', e.message); }
}
console.error = log;
console.log(falhas ? `\n${falhas} falha(s)` : `\nTodos os ${testes.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
