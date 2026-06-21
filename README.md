# Portal de Notificacoes EDP

Portal central independente para notificacoes EDP, com dois modulos no mesmo projeto:

- Portal de Regularizacao
- Notifica Facil

O projeto foi migrado/recriado a partir dos apps Base44 usando Next.js, TypeScript, Tailwind CSS, Prisma e PostgreSQL Neon.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL Neon
- Auth.js/NextAuth com Google
- Vercel
- Vercel Blob opcional para PDFs

## Rotas principais

- `/home`: portal central pos-login com selecao dos modulos e Radar do Setor Eletrico.
- `/regularizacao`: dashboard executivo do Portal de Regularizacao.
- `/notificacoes`: listagem operacional do modulo Regularizacao.
- `/notificacoes/nova`: geracao em passo a passo do Portal de Regularizacao.
- `/notifica-facil`: dashboard/listagem do modulo Notifica Facil.
- `/notifica-facil/nova`: criacao de notificacao do Notifica Facil.
- `/notifica-facil/[id]`: detalhe, preview, historico e edicao.
- `/api/notifica-facil/integracoes/coleta`: endpoint para receber registros do app Coleta Dados na aba Importar CENSO.
- `/api/news/energy`: noticias do setor eletrico via GNews com cache de 6 horas e fallback seguro.

## Variaveis de ambiente

Copie `.env.example` para `.env` e configure:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
AUTH_SECRET="uma-chave-longa"
NEXTAUTH_SECRET="uma-chave-longa"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
SUPER_ADMIN_EMAILS="jabasff159@gmail.com"
EMAIL_FROM="Portal de Notificacoes EDP <no-reply@seudominio.com>"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
RESEND_API_KEY=""
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="senha-inicial"
ADMIN_NAME="Administrador"
BASE44_APP_ID="690248a304b1770ec9b7c4ed"
BASE44_TOKEN=""
BASE44_SERVER_URL="https://base44.app"
BLOB_READ_WRITE_TOKEN=""
NOTIFICA_FACIL_INTEGRATION_TOKEN=""
COLETA_DADOS_API_KEY=""
GNEWS_API_KEY=""
```

`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` habilitam o login Google/Auth.js. `AUTH_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` continuam disponiveis para o acesso legado local.

`SUPER_ADMIN_EMAILS` aceita multiplos emails separados por virgula. O email `jabasff159@gmail.com` e sempre tratado como administrador principal aprovado.

`BLOB_READ_WRITE_TOKEN` habilita armazenamento permanente de PDFs no Vercel Blob. Sem essa variavel, o sistema usa fallback no banco (`pdf_base64`) e continua evitando regeracao em cada download.

`COLETA_DADOS_API_KEY` protege o endpoint do Coleta Dados. `NOTIFICA_FACIL_INTEGRATION_TOKEN` continua aceito como nome legado, mas prefira `COLETA_DADOS_API_KEY` para novas configuracoes.

`GNEWS_API_KEY` habilita noticias reais no Radar do Setor Eletrico da Home. A chave e lida somente pela rota backend `/api/news/energy`; o frontend nunca recebe esse segredo. Se a variavel estiver ausente ou a API falhar, a Home usa noticias institucionais de fallback.

### Email de aprovacao de usuarios

Novos usuarios pendentes disparam email para os administradores aprovados e para `SUPER_ADMIN_EMAILS`.

Para enviar usando Gmail SMTP, crie uma senha de app na conta Google e configure na Vercel:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="jabasff159@gmail.com"
SMTP_PASSWORD="senha-de-app-do-gmail"
EMAIL_FROM="Portal de Notificacoes EDP <jabasff159@gmail.com>"
```

Como alternativa, configure `RESEND_API_KEY` e `EMAIL_FROM` com um remetente autorizado no Resend. Depois de alterar variaveis na Vercel, faca um novo deploy para a producao carregar os novos valores.

## Rodar local

```bash
npm install
npm run prisma:generate
npm run prisma:dev
npm run seed
npm run dev
```

Acesse `http://localhost:3000` e entre com Google. Para o OAuth local, cadastre no Google Cloud o callback:

```bash
http://localhost:3000/api/auth/callback/google
```

O acesso legado por senha ainda funciona com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Banco Neon

1. Crie um projeto Neon.
2. Copie a connection string PostgreSQL com SSL.
3. Defina `DATABASE_URL` localmente e na Vercel.
4. Rode `npm run prisma:dev` localmente para desenvolvimento ou `npm run prisma:migrate` em deploy/CI.

## Modulos e entidades

O Portal de Regularizacao preserva as entidades principais:

- `Notificacao`
- `Empresa`
- `HistoricoDownload`
- `User`

O Notifica Facil foi isolado em tabelas e rotas proprias para evitar conflito com o Portal de Regularizacao:

- `NotificaFacilNotification`
- `NotificaFacilBaseNotificacao`
- `NotificaFacilEmpresa`
- `NotificaFacilActivityLog`
- `NotificaFacilNotificationCounter`
- `NotificaFacilRelatorioEmpresaClandestina`
- `NotificaFacilRawEntity`

Renomeacao documentada: o Base44 tambem tinha entidades chamadas `Notification`, `Notificacao` e `Empresa`. No Prisma elas foram prefixadas com `NotificaFacil` para nao colidir com `Notificacao` e `Empresa` ja usadas pelo Portal de Regularizacao. A tabela `NotificaFacilRawEntity` preserva o payload bruto de todas as entidades do Base44, inclusive a `Notificacao` legada do Notifica Facil.

## Migracao de dados do Base44

Exportar:

```bash
npm run export:base44
```

O exportador usa `BASE44_TOKEN` para consultar a API do Base44 e grava os JSONs em `exports/base44-690248a304b1770ec9b7c4ed`.

Importar para o banco configurado em `DATABASE_URL`:

```bash
npm run import:base44
```

Tambem e possivel importar de uma pasta especifica:

```bash
node scripts/import-base44.mjs ./exports/base44-690248a304b1770ec9b7c4ed
```

IDs originais do Base44 sao preservados para manter historico de downloads e referencias por lote.

Na migracao inicial foram importados 2.146 registros de `Notificacao`, 140 de `Empresa`, 20 de `HistoricoDownload` e 8 usuarios do Base44, mantendo o usuario admin local criado pelo seed.

### Migracao do Notifica Facil

O app Notifica Facil do Base44 usa o App ID `68ee37fd420f50f0c3ee471e`.

Configure:

```bash
NOTIFICA_FACIL_BASE44_APP_ID="68ee37fd420f50f0c3ee471e"
BASE44_TOKEN="token-do-base44"
```

Exportar dados:

```bash
npm run export:notifica-facil
```

Importar para o banco configurado em `DATABASE_URL`:

```bash
npm run import:notifica-facil

# ou, quando o Base44 gerar um arquivo unico consolidado:
npm run import:notifica-facil -- C:\Users\davis\Downloads\base-completa-notifica-facil-1780680279940.json
```

O importador faz upsert nas tabelas operacionais `NotificaFacil*` e tambem grava todos os registros originais em `NotificaFacilRawEntity`, preservando campos, anexos, URLs de arquivos, OCR, historico e entidades legadas. A entidade `User` do Base44 e preservada como payload bruto para auditoria/migracao, sem sobrescrever os usuarios de autenticacao Google do portal.

## Funcionalidades implementadas

- Login com Google via Auth.js/NextAuth e Prisma Adapter.
- Fluxo de aprovacao manual para novos usuarios.
- Telas de aguardando aprovacao e acesso recusado.
- Administrador bootstrap por `SUPER_ADMIN_EMAILS`.
- Envio de email para administradores via SMTP ou Resend quando houver novo pedido.
- Login legado por cookie assinado para compatibilidade local.
- Portal central em `/home`.
- Dashboard do Portal de Regularizacao.
- Listagem, busca e filtros de notificacoes da Regularizacao.
- Cadastro e edicao de notificacoes da Regularizacao.
- Visualizacao com preview de HTML/PDF.
- Download individual, selecao, lote e todos.
- Registro em `HistoricoDownload`.
- Atualizacao de `download_count`, `last_downloaded_at`, `last_downloaded_by`.
- Flags: visualizada, arquivada, sem projeto, encaminhado prefeitura.
- Observacoes, retorno do cliente e anexos por URL.
- CRUD de empresas.
- Gestao de usuarios/permissoes.
- Bloqueio de edicao/importacao para usuarios sem permissao.
- Modulo Notifica Facil com dashboard, listagem, filtros, criacao, edicao, preview, historico e PDF cacheado.
- Endpoint protegido para integracao futura com Coleta de Dados.

## PDF e performance

Os PDFs sao gerados uma vez e armazenados para reuso.

Fluxo:

1. Criacao/edicao da notificacao.
2. Geracao do HTML.
3. Renderizacao do PDF com `puppeteer-core` e `@sparticuz/chromium`.
4. Armazenamento no Vercel Blob quando `BLOB_READ_WRITE_TOKEN` estiver configurado.
5. Fallback em `pdf_base64` no banco quando Blob nao estiver configurado.
6. Downloads futuros servem o PDF salvo sem reconstruir HTML nem executar Puppeteer novamente.

Rotas cacheadas:

- `/api/notificacoes/[id]/pdf`
- `/api/notifica-facil/notifications/[id]/pdf`
- `/api/downloads/lote`
- `/api/downloads/selecionados`
- `/api/downloads/todos`

Se um registro antigo ainda nao tiver PDF salvo, o sistema gera uma unica vez no primeiro download e persiste para os proximos acessos.

## Integracao com Coleta Dados

Endpoint de entrada dos registros do CENSO em campo:

```bash
POST /api/notifica-facil/integracoes/coleta
Authorization: Bearer $COLETA_DADOS_API_KEY
Content-Type: application/json
```

Tambem e aceito o header `x-api-key: $COLETA_DADOS_API_KEY`.

O endpoint recebe um unico registro, um array direto, ou um objeto com `registros`, `records`, `items` ou `data`.

Exemplo de registro unico:

```json
{
  "numero_registro_censo": "CS01003723",
  "empresa": "TERA CORPORATION",
  "endereco": "Avenida Francisco Ferreira Lopes",
  "bairro": "Vila Rubens",
  "cidade": "Mogi das Cruzes",
  "numero_poste": "343462114",
  "latitude": -23.534427,
  "longitude": -46.2170446,
  "fotos": [
    "https://exemplo.com/foto-1.jpg",
    "https://exemplo.com/foto-2.jpg"
  ],
  "observacoes": "Registro recebido do app Coleta Dados",
  "usuario_que_enviou": "usuario@empresa.com"
}
```

Exemplo em lote:

```json
{
  "registros": [
    {
      "numero_registro_censo": "CS01003723",
      "empresa": "TERA CORPORATION",
      "endereco": "Avenida Francisco Ferreira Lopes",
      "bairro": "Vila Rubens",
      "cidade": "Mogi das Cruzes"
    }
  ]
}
```

Exemplo com mais de uma empresa no mesmo CENSO:

```json
{
  "numero_registro_censo": "CS01004567",
  "empresas": ["TELEFONICA", "CLARO"],
  "endereco": "Rua das Flores, 100",
  "bairro": "Centro",
  "cidade": "Caraguatatuba",
  "numero_poste": "8844851",
  "fotos": ["https://exemplo.com/foto-censo.jpg"]
}
```

Esse exemplo cria duas linhas em `Importar CENSO`: uma para `TELEFONICA` e outra para `CLARO`.

Campos aceitos:

- `id_censo`
- `numero_registro_censo` ou `numero_registro`
- `empresa` ou `empresa_a_notificar`
- `empresas`, `empresas_identificadas`, `empresas_a_notificar` ou `ocupantes`
- `endereco`, `bairro`, `cidade` ou `municipio`
- `latitude`, `longitude` ou `coordenadas`
- `fotos`, `imagens`, `anexos`, `evidencias` ou `arquivos`
- `analise_humana`
- `numero_poste`
- `dados_plaqueta`
- `ordem_venda`
- `status`
- `usuario_que_enviou`

Regra de destino:

- registros novos entram na aba `/notifica-facil/importar-censo`;
- se um CENSO vier com mais de uma empresa, o endpoint cria uma linha por empresa mantendo as mesmas informacoes de endereco, poste, coordenadas, fotos e observacoes;
- para multiplas empresas, prefira enviar `empresas` como array, por exemplo `["TELEFONICA", "CLARO"]`;
- registros repetidos ainda ativos sao atualizados;
- registros ja processados, finalizados, em stand-by ou marcados como pendencia tecnica sao ignorados para evitar sobrescrever historico;
- o endpoint nao gera notificacao e nao gera PDF. A notificacao continua sendo criada pela tela Importar CENSO do Notifica Facil.

Resposta resumida:

```json
{
  "success": true,
  "total_recebidos": 1,
  "validos": 1,
  "criados": 1,
  "atualizados": 0,
  "ignorados": 0
}
```

## Deploy Vercel

1. Suba o repositorio para o GitHub.
2. Importe o projeto na Vercel.
3. Configure as variaveis de ambiente.
4. No Google Cloud, cadastre tambem o callback de producao:

```bash
https://portal-regularizacao.vercel.app/api/auth/callback/google
```

5. Garanta que a migration rode antes do uso:

```bash
npm run prisma:migrate
npm run seed
```

O `buildCommand` configurado roda `npm run prisma:migrate && npm run build`.

## Limitacoes conhecidas

- O codigo-fonte original do Base44 nao foi exposto pelo conector; a UI foi recriada por engenharia reversa de schema, dados e telas.
- A importacao completa dos dados do Notifica Facil depende de exportacao/API com credenciais do Base44 para preservar anexos, PDFs e historicos.
- Links antigos em `pdfUrl` podem apontar para storage do Base44; a migracao deve baixar/preservar anexos e HTML antes de desligar o app original.
- Datas ambiguas foram mantidas como texto para evitar perda de fidelidade.
