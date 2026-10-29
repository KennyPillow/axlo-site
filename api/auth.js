// GET /api/auth · início do login do painel (Decap CMS) com GitHub.
// Variáveis: GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET de um OAuth App criado na conta/organização da AXLO
// (callback: https://SEU-DOMINIO/api/callback).
import crypto from 'node:crypto';

export default function handler(req, res) {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) {
    res.statusCode = 500;
    return res.end('GITHUB_CLIENT_ID não configurado.');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', id);
  url.searchParams.set('scope', process.env.GITHUB_SCOPE || 'repo,user');
  url.searchParams.set('redirect_uri', `${proto}://${host}/api/callback`);
  url.searchParams.set('state', state);
  res.setHeader('set-cookie', `decap_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('location', url.toString());
  res.end();
}
