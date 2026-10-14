# Site AXLO · Entrega

Site institucional da AXLO | Saúde & Seguros Corporativos: 35 páginas, painel de edição, blog, integração com o Kommo, SEO, GEO e LGPD.
Este documento mostra o que foi entregue em cada etapa, como colocar o site no ar **nas contas da AXLO** e como testar tudo no dia da entrega.

## 1. As 4 semanas da proposta

| Semana | Entregável | Situação |
|---|---|---|
| 1 · Estrutura | Arquitetura do site (início, saúde e benefícios, seguros corporativos, sobre, gestão e relatórios, blog, contato, privacidade), marca do Brand Book V26 e funil sugerido para o Kommo (item 6) | Pronto |
| 2 · Desenvolvimento | 35 páginas: 12 de produto, 14 artigos e as institucionais. Painel de edição em `/admin`. Imagens em AVIF e WebP. Responsivo de 360 a 1920 px | Pronto |
| 3 · Integrações | Formulário no Kommo com funil e UTM (`/api/lead`), WhatsApp com origem, Tag Manager com eventos de conversão e contêiner pronto para importar, SEO técnico, GEO/AIO, aviso de cookies com Consent Mode v2 | Pronto, falta só preencher os acessos |
| 4 · Testes e entrega | Testes automáticos (integração, SEO, layout em 7 larguras e performance), manual do painel e roteiro de testes com a AXLO (item 9) | Pronto do nosso lado; o roteiro final é feito junto com a AXLO no domínio |

## 2. O que foi pedido e onde está

| Pedido | Como foi atendido |
|---|---|
| SEO técnico | Title e description únicos, um H1 por página, URLs amigáveis, canonical, hreflang, sitemap com data de atualização, robots.txt e imagem de compartilhamento própria para cada página. Dados estruturados: InsuranceAgency (com catálogo de serviços), WebPage, BreadcrumbList, Service, FAQPage e BlogPosting. Auditoria automática: `node scripts/seo.mjs`. |
| GEO e AIO (buscadores com IA) | `llms.txt` (mapa do site para assistentes de IA) e `llms-full.txt` (todo o conteúdo em texto); robots.txt liberando GPTBot, ClaudeBot, PerplexityBot, Google-Extended e outros; caixa "Em resumo" com a resposta direta no topo de cada artigo; FAQ em todas as páginas de produto e artigos; autoria e registro SUSEP visíveis; feed RSS do blog. |
| Blog | 14 artigos (945 a 1.131 palavras) nos temas pedidos: reajuste, sinistralidade, PME, coparticipação, NR-01, gestão de benefícios, telemedicina, D&O, riscos cibernéticos, garantia, responsabilidade civil, vida em grupo, frota e como escolher corretora. Cada artigo liga às páginas de produto e vice-versa. |
| Analytics, Tag Manager e Search Console | Eventos `generate_lead`, `whatsapp_click`, `form_start` e `consent_update`, com UTM. Contêiner pronto em `docs/gtm-axlo-container.json`. |
| Performance e Core Web Vitals | Resultado no item 8. |
| Responsivo, SSL, LGPD e cookies | Auditoria de layout em 35 páginas × 7 larguras, sem rolagem lateral, sem texto cortado e com toque mínimo de 40 px no celular. SSL automático da Vercel e cabeçalhos de segurança. Aviso de cookies com Consent Mode v2, política de privacidade e consentimento nos formulários. |
| Formulários sem erro e sem link quebrado | Validação no navegador e no servidor, proteção contra robôs e limite de envios. O build falha se houver link interno quebrado. 11 testes automáticos (`npm test`). |
| WhatsApp no Kommo | O botão abre o WhatsApp da AXLO com a origem na mensagem (ex.: `ref: google/campanha · /pagina`). Com o número conectado ao Kommo, a conversa vira lead. |
| Formulários no Kommo | Lead, contato e empresa no funil e etapa configurados, UTM e gclid nos campos de rastreamento e uma nota com tudo o que a pessoa enviou. |
| CMS | Painel em `/admin`: páginas, slider, 12 produtos, blog, contatos, rastreamento e SEO de cada página. Manual em `docs/MANUAL-PAINEL.md`. |
| Acessos com a empresa | GitHub, Vercel, domínio, Google e Kommo ficam no nome da AXLO (itens 3 a 7). |

## 3. Contas necessárias (todas no nome da AXLO)

1. **GitHub:** organização da AXLO, que guarda o código e o conteúdo editado no painel.
2. **Vercel:** hospedagem, SSL e as funções do formulário e do login do painel. Para uso comercial, plano Pro.
3. **Registro do domínio:** acesso ao DNS de axlo.com.br.
4. **Google:** Tag Manager, Analytics 4 e Search Console, com o e-mail da empresa.
5. **Kommo:** acesso de administrador para criar a integração privada.

## 4. Publicar na Vercel

1. Transferir o repositório para a organização da AXLO no GitHub (Settings → Transfer).
2. Na Vercel: **Add New → Project →** importar o repositório. O `vercel.json` já define o build (`npm run build`) e a pasta `dist`.
3. Em **Settings → Environment Variables**, cadastrar:

| Variável | Valor |
|---|---|
| `KOMMO_SUBDOMAIN` | subdomínio da conta (ex.: `axlo` para axlo.kommo.com) |
| `KOMMO_TOKEN` | token de longa duração (item 6) |
| `KOMMO_PIPELINE_ID` | ID do funil onde o lead do site entra |
| `KOMMO_STATUS_ID` | ID da etapa inicial (opcional) |
| `KOMMO_RESPONSIBLE_ID` | ID do usuário responsável (opcional) |
| `KOMMO_FIELDS` | IDs de campos de texto para cargo, porte, assunto e origem (opcional). Ex.: `{"cargo":123,"colaboradores":456}` |
| `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` | OAuth App do painel (item 5) |
| `CMS_REPO` | `organizacao-da-axlo/axlo-site` |

4. Em **Settings → Domains**, adicionar `axlo.com.br` e `www.axlo.com.br` e criar no DNS os registros que a Vercel mostrar. O SSL sai sozinho.

## 5. Painel de edição

1. No GitHub da AXLO: **Settings → Developer settings → OAuth Apps → New OAuth App**. Homepage: `https://axlo.com.br`. Callback: `https://axlo.com.br/api/callback`.
2. Copiar Client ID e Client Secret para as variáveis da Vercel e publicar de novo.
3. Acessar `https://axlo.com.br/admin` e entrar com o GitHub. Quem edita precisa de permissão de escrita no repositório.
4. Uso do dia a dia, inclusive como escrever artigos para Google e IA: `docs/MANUAL-PAINEL.md`.

## 6. Kommo

1. **Configurações → Integrações → Criar integração** (integração privada): gerar um token de longa duração com acesso a leads, contatos, empresas e notas.
2. **Funil sugerido para os leads do site:** Novo lead do site → Primeiro contato → Diagnóstico ou cotação → Proposta enviada → Em negociação → Fechado / Perdido. Configure `KOMMO_STATUS_ID` com a etapa "Novo lead do site".
3. Conectar o **WhatsApp da AXLO** ao Kommo (Configurações → Canais) e preencher o número no painel do site (Configurações → Contato → WhatsApp).

**O que chega a cada formulário:** lead "Site · Empresa · Assunto"; contato com telefone, e-mail e cargo; empresa vinculada; campos UTM_SOURCE, UTM_MEDIUM, UTM_CAMPAIGN, UTM_CONTENT, UTM_TERM, UTM_REFERRER, GCLID e FBCLID; etiquetas `site`, `form:<página>` e `utm:<fonte>`; nota com tudo o que a pessoa escreveu, a primeira e a última origem e o consentimento LGPD. Se a conta não tiver os campos de rastreamento, a integração tenta de novo sem eles e a origem fica na nota.

## 7. Google

**Tag Manager:** criar o contêiner Web, ir em **Administrador → Importar contêiner**, escolher `docs/gtm-axlo-container.json`, opção **Mesclar**. Depois trocar a variável `Const - GA4 ID` pelo ID real (`G-...`) e publicar. Informar o ID `GTM-...` no painel do site (Configurações → Rastreamento). O contêiner já traz a tag do GA4 respeitando o consentimento e os eventos `generate_lead`, `whatsapp_click` e `form_start` com os parâmetros.

**Analytics 4:** marcar `generate_lead` como evento-chave. Opcional: importar a conversão no Google Ads.

**Search Console:** adicionar a propriedade de domínio `axlo.com.br` (verificação por DNS), enviar `https://axlo.com.br/sitemap.xml` e pedir indexação da home e das páginas de produto.

## 8. Performance (Lighthouse)

Medido com o Lighthouse 13.5 (Chrome), com o site servido comprimido como na Vercel. Celular simula 4G lento e processador mais fraco. Metas do Google para Core Web Vitals: LCP até 2,5 s, CLS até 0,1.

**Celular**

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| / | 98 | 100 | 100 | 100 | 2,2 s | 0 | 80 ms |
| /saude-e-beneficios | 99 | 100 | 100 | 100 | 1,7 s | 0 | 70 ms |
| /seguros-corporativos | 100 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms |
| /saude-e-beneficios/plano-de-saude-empresarial | 99 | 100 | 100 | 100 | 1,7 s | 0 | 80 ms |
| /seguros-corporativos/d-o | 100 | 100 | 100 | 100 | 1,7 s | 0 | 60 ms |
| /blog | 99 | 100 | 100 | 100 | 1,8 s | 0.004 | 50 ms |
| /blog/reajuste-plano-de-saude-empresarial | 99 | 100 | 100 | 100 | 1,8 s | 0.048 | 0 ms |
| /contato | 100 | 100 | 100 | 100 | 1,7 s | 0 | 20 ms |
| /sobre | 100 | 100 | 100 | 100 | 1,8 s | 0.001 | 60 ms |

**Computador**

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| / | 100 | 100 | 100 | 100 | 0,5 s | 0.001 | 0 ms |
| /saude-e-beneficios | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /seguros-corporativos | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /saude-e-beneficios/plano-de-saude-empresarial | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /seguros-corporativos/d-o | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /blog | 100 | 100 | 100 | 100 | 0,4 s | 0.004 | 0 ms |
| /blog/reajuste-plano-de-saude-empresarial | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /contato | 100 | 100 | 100 | 100 | 0,4 s | 0.001 | 0 ms |
| /sobre | 100 | 100 | 100 | 100 | 0,4 s | 0.002 | 0 ms |

Como foi alcançado: imagens em AVIF e WebP no tamanho de cada tela, foto do topo pré-carregada com prioridade alta, fontes hospedadas no próprio site, CSS e JS pequenos com cache de 1 ano e nenhum script de terceiros antes do consentimento. Para repetir a medição: `node scripts/perf.mjs` com o servidor local rodando, ou pagespeed.web.dev depois de publicado.

## 9. Roteiro de testes do dia da entrega

**SEO e GEO**
- [ ] `/sitemap.xml` lista as 34 páginas; `/robots.txt` e `/llms.txt` abrem.
- [ ] Teste de pesquisa aprimorada do Google (search.google.com/test/rich-results) na home, num produto e num artigo, sem erros.
- [ ] Search Console com o sitemap enviado e sem erros de cobertura.
- [ ] PageSpeed Insights (pagespeed.web.dev) na home e num artigo.

**Formulários e Kommo**
- [ ] Abrir `/contato?utm_source=teste&utm_medium=entrega&utm_campaign=homologacao`, enviar e ver o lead no funil certo, com UTM, etiquetas e nota.
- [ ] Repetir numa página de produto e num artigo e conferir o assunto preenchido.
- [ ] Enviar com e-mail inválido e confirmar a mensagem de erro.

**WhatsApp**
- [ ] No celular, o botão flutuante abre a conversa com a referência de origem, e a conversa entra no Kommo.

**Medição e LGPD**
- [ ] Aviso de cookies na primeira visita; "Recusar", "Aceitar" e "Preferências" funcionam e ficam salvos.
- [ ] No modo de visualização do Tag Manager, `generate_lead` e `whatsapp_click` disparam; no GA4 (Tempo real) os eventos chegam com consentimento aceito.

**Painel**
- [ ] Entrar em `/admin`, mudar um texto, publicar e ver no ar em até 2 minutos. Criar um artigo como rascunho.

**Acessos**
- [ ] A AXLO é dona da organização no GitHub, do projeto na Vercel, do domínio, do Tag Manager, do Analytics, do Search Console e do Kommo.

## 10. Rodar no computador (desenvolvedor)

```bash
npm install
npm run build              # gera dist/ e confere links internos
npm test                   # 11 testes da integração com o Kommo
node scripts/seo.mjs       # auditoria de SEO e GEO
npm run dev                # http://localhost:3040 com Kommo simulado
node scripts/audit.mjs     # layout em 7 larguras (com o dev rodando)
node scripts/perf.mjs      # Lighthouse (com o dev rodando)
npm run cms                # painel local em /admin (com o dev rodando)
```

## 11. Pendências da AXLO

1. **WhatsApp conectado ao Kommo** e o token do Kommo (itens 4 e 6).
2. **Razão social, CNPJ e endereço completo** (rodapé, política de privacidade e dados estruturados).
3. **Fotos originais em alta resolução** (pelo menos 2.400 px de largura). As atuais vieram pelo WhatsApp com 1.600 px: ficam nítidas em telas comuns, mas perdem definição em telas de alta densidade (MacBook, notebooks com zoom).
4. **Confirmar a faixa de operadoras.** As 14 logos vieram de outro projeto: confirmar com quais a AXLO trabalha e se há autorização de uso das marcas. Dá para esconder no painel.
5. **Revisão técnica do conteúdo por um especialista da AXLO.** Pontos de atenção:
   - **Produtos:** multas da LGPD e resgate no seguro cibernético; reajuste e carência em saúde e odonto; garantia judicial trabalhista; extensões do D&O; capital do seguro de vida e inventário; abrangência da NR-01; seguro de carga na página de frota.
   - **Artigos:**
     - meta de sinistralidade de 70% a 75% e a fórmula do reajuste técnico;
     - regras de faixa etária e de carência por porte;
     - coparticipação e permanência no plano após o desligamento;
     - NR-01 para micro e pequenas empresas;
     - estrutura de coberturas A, B e C do D&O;
     - comunicação de incidente no seguro cibernético;
     - fiança bancária comparada ao seguro garantia;
     - coberturas de invalidez e exemplo de capital de 24 salários no seguro de vida;
     - remuneração e carta de nomeação da corretora.
6. **Revisão jurídica da política de privacidade** (o texto é um modelo).
7. **LinkedIn e Instagram** para o rodapé e os dados estruturados.
8. **Números do slider** estão marcados como "Exemplo ilustrativo"; trocar por casos reais quando houver autorização.
