# Site AXLO · Entrega

Site institucional da AXLO | Saúde & Seguros Corporativos.
Este documento mostra o que foi entregue, como colocar o site no ar **nas contas da AXLO** e como testar tudo no dia da entrega.

## 1. O que foi pedido e onde está

| Pedido | Como foi atendido | Situação |
|---|---|---|
| SEO técnico | Title, description, um H1 por página, URLs amigáveis, canonical, sitemap.xml, robots.txt, Open Graph e dados estruturados (InsuranceAgency, BreadcrumbList, FAQPage, Service). Auditoria automática em `scripts/seo.mjs`. | Pronto |
| Indexação no Google | Site pronto para indexar e sitemap gerado. Envio ao Search Console no passo 6. O prazo e a posição dependem do Google. | Depende da publicação |
| Analytics, Tag Manager e Search Console | O site já envia `generate_lead`, `whatsapp_click`, `form_start` e `consent_update` para o Tag Manager, com UTM. Basta informar os IDs no painel. | Depende das contas da AXLO |
| Performance e Core Web Vitals | Imagens em WebP com tamanhos responsivos, fontes hospedadas no próprio site, CSS e JS com cache longo. Lighthouse: performance 96 a 100, acessibilidade 100, boas práticas 100, SEO 100. | Pronto |
| Responsivo, SSL, LGPD e cookies | Layout testado em celular e computador. SSL automático da Vercel. Aviso de cookies com Consent Mode v2 do Google, política de privacidade e consentimento nos formulários. Cabeçalhos de segurança em `vercel.json`. | Pronto |
| Formulários sem erro e sem link quebrado | Validação no navegador e no servidor, proteção contra robôs e limite de envios. O build falha se houver link interno quebrado. 11 testes automáticos (`npm test`). | Pronto |
| WhatsApp integrado ao Kommo | O botão abre o WhatsApp da AXLO com a origem do contato na mensagem (ex.: `ref: google/campanha · página`). Com o número conectado ao Kommo, a conversa vira lead automaticamente. | Falta o número |
| Formulários no Kommo com funil e UTM | `/api/lead` cria lead, contato e empresa no funil e etapa configurados, grava UTM e gclid nos campos de rastreamento e anexa uma nota com todos os dados. | Falta o token |
| CMS para textos, imagens e SEO | Painel em `/admin` (Decap CMS): páginas, 12 produtos, configurações, contatos, rastreamento e SEO de cada página. | Pronto |
| Acessos com a empresa | GitHub, Vercel, domínio, Google e Kommo ficam no nome da AXLO, conforme os passos abaixo. | Na publicação |
| Teste na entrega | Roteiro no item 8. | No dia da entrega |

## 2. Contas necessárias (todas no nome da AXLO)

1. **GitHub:** uma organização da AXLO, que guarda o código e o conteúdo editado no painel.
2. **Vercel:** hospedagem, SSL e as funções do formulário. O plano gratuito atende; para uso comercial a Vercel pede o plano Pro.
3. **Registro do domínio:** acesso ao DNS de axlo.com.br.
4. **Google:** Tag Manager, Analytics 4 e Search Console, com o e-mail da empresa.
5. **Kommo:** acesso de administrador para criar a integração privada.

## 3. Publicar na Vercel

1. Transferir o repositório para a organização da AXLO no GitHub (Settings → Transfer).
2. Na Vercel: **Add New → Project →** importar o repositório. O `vercel.json` já define o build (`npm run build`) e a pasta `dist`.
3. Em **Settings → Environment Variables**, cadastrar:

| Variável | Valor |
|---|---|
| `KOMMO_SUBDOMAIN` | subdomínio da conta (ex.: `axlo` para axlo.kommo.com) |
| `KOMMO_TOKEN` | token de longa duração (passo 5) |
| `KOMMO_PIPELINE_ID` | ID do funil onde o lead do site entra |
| `KOMMO_STATUS_ID` | ID da etapa inicial (opcional) |
| `KOMMO_RESPONSIBLE_ID` | ID do usuário responsável (opcional) |
| `KOMMO_FIELDS` | IDs de campos de texto para cargo, porte, assunto e origem (opcional). Ex.: `{"cargo":123,"colaboradores":456}` |
| `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` | OAuth App do painel (passo 4) |
| `CMS_REPO` | `organizacao-da-axlo/axlo-site` |

4. Em **Settings → Domains**, adicionar `axlo.com.br` e `www.axlo.com.br` e criar no DNS os registros que a Vercel mostrar. O SSL sai sozinho.

## 4. Painel de edição (Decap CMS)

1. No GitHub da AXLO: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: `https://axlo.com.br`
   - Authorization callback URL: `https://axlo.com.br/api/callback`
2. Copiar Client ID e Client Secret para as variáveis da Vercel (passo 3) e publicar de novo.
3. Acessar `https://axlo.com.br/admin` e entrar com o GitHub. Quem edita precisa ser membro da organização com permissão de escrita no repositório.
4. Cada "Publicar" no painel vira um commit, e a Vercel atualiza o site em 1 a 2 minutos.

**O que dá para editar no painel:** textos de todas as páginas, slider da home (fotos, números e rótulos), seguros e benefícios (inclusive criar novos), perguntas frequentes, título e descrição para o Google de cada página, telefone, WhatsApp, e-mail, endereço, CNPJ, IDs do Tag Manager, Analytics e Search Console, logos de operadoras, novidades do sino e a política de privacidade.

## 5. Kommo

1. Em **Configurações → Integrações → Criar integração** (integração privada), gerar um **token de longa duração** com acesso a leads, contatos, empresas e notas.
2. Anotar o **ID do funil** e da **etapa** (aparecem na URL do funil e nas configurações das etapas).
3. Conectar o **WhatsApp da AXLO** ao Kommo (Configurações → Canais). Com isso, quem toca no botão do site entra como lead no Kommo, e a primeira mensagem já traz a origem.
4. No painel do site, em **Configurações → Contato → WhatsApp**, preencher o número com DDI e DDD (ex.: `5511999999999`).

**O que chega no Kommo a cada formulário:**
- **Lead:** nome "Site · Empresa · Assunto", no funil e etapa configurados.
- **Contato:** nome, telefone, e-mail e cargo; empresa vinculada.
- **Rastreamento:** campos nativos UTM_SOURCE, UTM_MEDIUM, UTM_CAMPAIGN, UTM_CONTENT, UTM_TERM, UTM_REFERRER, GCLID e FBCLID.
- **Etiquetas:** `site`, `form:<página>` e `utm:<fonte>`.
- **Nota:** tudo o que a pessoa escreveu, a origem (primeiro e último contato) e o registro do consentimento LGPD.

Se a conta não tiver os campos de rastreamento, a integração tenta de novo sem eles, e a origem fica na nota.

## 6. Google Tag Manager, Analytics 4 e Search Console

**Tag Manager** (crie o contêiner e informe o ID `GTM-XXXXXXX` no painel do site):
1. Tag **Google tag** com o ID do GA4 (`G-XXXXXXXXXX`), acionada em *Initialization - All Pages*.
2. Tag **Evento do GA4** `generate_lead`, com acionador *Evento personalizado* `generate_lead`. Parâmetros: `origem`, `interesse`, `colaboradores`, `cargo`, `utm_source`, `utm_campaign`.
3. Tag **Evento do GA4** `whatsapp_click`, com acionador *Evento personalizado* `whatsapp_click`. Parâmetros: `origem`, `pagina`.
4. Opcional: conversão do Google Ads no evento `generate_lead`.
5. Em Configurações do contêiner, ativar a **visão geral de consentimento**. O site já envia o Consent Mode v2: tudo negado por padrão e liberado conforme a escolha no aviso de cookies.

**Analytics 4:** marcar `generate_lead` como **evento-chave**.

**Search Console:**
1. Adicionar a propriedade de domínio `axlo.com.br`, verificando pelo DNS (recomendado) ou pela meta tag no painel do site.
2. Em **Sitemaps**, enviar `https://axlo.com.br/sitemap.xml`.
3. Usar **Inspeção de URL** na home e pedir indexação.

## 7. Rodar no computador (desenvolvedor)

```bash
npm install
npm run build      # gera dist/ e confere links internos
npm test           # 11 testes da integração com o Kommo
node scripts/seo.mjs
npm run dev        # http://localhost:3040 com Kommo simulado (grava em .kommo-mock.json)
npm run cms        # painel local: abra http://localhost:3040/admin com o dev rodando
```

## 8. Roteiro de testes do dia da entrega

**SEO**
- [ ] `https://axlo.com.br/sitemap.xml` abre e lista as 19 páginas.
- [ ] `https://axlo.com.br/robots.txt` aponta para o sitemap.
- [ ] Teste de pesquisa aprimorada do Google (search.google.com/test/rich-results) na home e numa página de produto, sem erros.
- [ ] Search Console com o sitemap enviado e sem erros de cobertura.
- [ ] PageSpeed Insights (pagespeed.web.dev) na home: Core Web Vitals no verde.

**Formulários e Kommo**
- [ ] Abrir `https://axlo.com.br/contato?utm_source=teste&utm_medium=entrega&utm_campaign=homologacao`, enviar o formulário e ver o lead no funil certo do Kommo, com UTM, etiquetas e nota.
- [ ] Repetir numa página de produto e conferir o assunto já preenchido.
- [ ] Enviar com e-mail inválido e confirmar a mensagem de erro.

**WhatsApp**
- [ ] Tocar no botão flutuante no celular: abre a conversa com a referência de origem.
- [ ] A conversa aparece como lead no Kommo.

**Medição e LGPD**
- [ ] Aviso de cookies aparece na primeira visita; "Recusar" e "Aceitar" funcionam e a escolha fica salva.
- [ ] No modo de visualização do Tag Manager, `generate_lead` e `whatsapp_click` disparam.
- [ ] No GA4, em Tempo real, os eventos chegam (com consentimento aceito).

**Painel**
- [ ] Entrar em `/admin`, mudar um texto, publicar e ver a mudança no ar em até 2 minutos.

**Acessos**
- [ ] AXLO é dona de: organização no GitHub, projeto na Vercel, domínio, Tag Manager, Analytics, Search Console e Kommo.

## 9. Pendências da AXLO

1. **Número de WhatsApp conectado ao Kommo.** Sem ele, o botão flutuante fica escondido e os links levam ao formulário.
2. **Razão social, CNPJ e endereço completo**, para o rodapé, a política de privacidade e os dados estruturados.
3. **Confirmar a faixa de operadoras.** As 14 logos vieram de outro projeto: confirmar com quais a AXLO trabalha e se há autorização de uso das marcas. Dá para esconder a faixa no painel (Configurações → Faixa de operadoras → Mostrar no site).
4. **Revisão técnica das 12 páginas de produto** por um especialista da AXLO, com atenção a: cobertura de multas da LGPD e de resgate em riscos cibernéticos; regras de reajuste e carência em saúde e odonto; garantia judicial trabalhista; extensões do D&O; capital do seguro de vida e inventário; abrangência da NR-01; seguro de carga na página de frota.
5. **Revisão jurídica da política de privacidade** (o texto é um modelo).
6. **Fotos reais da equipe ou do escritório**, se quiserem trocar as do slider (o brand book pede pessoas trabalhando, em ambiente brasileiro).
7. **Perfis do LinkedIn e Instagram**, para o rodapé e os dados estruturados.
8. **Números de exemplo do slider:** estão marcados como "Exemplo ilustrativo". Trocar por casos reais quando houver autorização.
