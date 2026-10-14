# AXLO · Site institucional

Site da AXLO | Saúde & Seguros Corporativos. Estático, gerado a partir de `content/` (editado pelo painel Decap em `/admin`), com funções na Vercel para o formulário (Kommo) e o login do painel.

- `content/` textos, produtos e configurações (o painel edita estes arquivos)
- `src/` templates, CSS, JS, fontes e imagens
- `api/` funções da Vercel: `lead` (Kommo), `auth` e `callback` (login do painel)
- `lib/kommo.js` integração com a API v4 do Kommo
- `scripts/` build, servidor local com Kommo simulado, testes e auditoria de SEO

```bash
npm install && npm run build && npm test && npm run dev
```

Publicação, contas, variáveis de ambiente e roteiro de testes: **[ENTREGA.md](ENTREGA.md)**.
