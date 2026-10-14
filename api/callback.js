// GET /api/callback · fim do login do painel: troca o código do GitHub por um token
// e devolve para a janela do Decap CMS no formato que ele espera.
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = /decap_state=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
  let status = 'error', content = { message: 'Login não autorizado.' };

  if (code && state && cookie && state === cookie) {
    try {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
      });
      const j = await r.json();
      if (j.access_token) { status = 'success'; content = { token: j.access_token, provider: 'github' }; }
      else content = { message: j.error_description || 'GitHub recusou o login.' };
    } catch { content = { message: 'Falha ao falar com o GitHub.' }; }
  }

  const msg = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('set-cookie', 'decap_state=; Path=/api; Max-Age=0');
  res.end(`<!doctype html><meta charset="utf-8"><p>Concluindo o login…</p><script>
  (function(){
    function recebe(e){ window.opener.postMessage(${msg}, e.origin); window.removeEventListener('message', recebe); setTimeout(function(){ window.close(); }, 300); }
    window.addEventListener('message', recebe, false);
    window.opener && window.opener.postMessage('authorizing:github', '*');
  })();
  </script>`);
}
