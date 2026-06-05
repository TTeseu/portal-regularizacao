# Portal de Regularizacao

Migracao independente do app Base44 `Portal de Regularizacao` para Next.js, TypeScript, Tailwind CSS, Prisma e PostgreSQL Neon.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL Neon
- Vercel

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
EMAIL_FROM="Portal de Regularizacao <no-reply@seudominio.com>"
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
```

`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` habilitam o login Google/Auth.js. `AUTH_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` continuam disponiveis para o acesso legado local.

`SUPER_ADMIN_EMAILS` aceita multiplos emails separados por virgula. O email `jabasff159@gmail.com` e sempre tratado como administrador principal aprovado.

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

## Funcionalidades implementadas

- Login com Google via Auth.js/NextAuth e Prisma Adapter.
- Fluxo de aprovacao manual para novos usuarios.
- Telas de aguardando aprovacao e acesso recusado.
- Administrador bootstrap por `SUPER_ADMIN_EMAILS`.
- Envio de email para administradores via SMTP ou Resend quando houver novo pedido.
- Login legado por cookie assinado para compatibilidade local.
- Dashboard.
- Listagem de notificacoes.
- Busca textual.
- Filtros por status, empresa, cidade, lote, vencimento, origem e arquivadas.
- Cadastro e edicao de notificacoes.
- Visualizacao de notificacao com preview de `html_content`.
- Geracao de HTML equivalente quando nao existe `html_content`.
- Download individual.
- Download por selecao.
- Download por lote.
- Download de todos os registros nao arquivados.
- Registro em `HistoricoDownload`.
- Atualizacao de `download_count`, `last_downloaded_at`, `last_downloaded_by`.
- Flags: visualizada, arquivada, sem projeto, encaminhado prefeitura.
- Observacoes, retorno do cliente e anexos por URL.
- CRUD de empresas.
- Gestao de usuarios/permissoes.
- Bloqueio de edicao/importacao para usuarios sem permissao.

## PDF

A rota `/api/notificacoes/[id]/pdf` tenta gerar PDF usando `puppeteer-core` e `@sparticuz/chromium`, compatível com Vercel. Se o renderer headless nao estiver disponivel no ambiente, a rota retorna o HTML de impressao como fallback preservando o conteudo.

## Deploy Vercel

1. Suba o repositorio para o GitHub.
2. Importe o projeto na Vercel.
3. Configure as variaveis de ambiente.
4. No Google Cloud, cadastre tambem o callback de producao:

```bash
https://SEU_DOMINIO/api/auth/callback/google
```

5. Garanta que a migration rode antes do uso:

```bash
npm run prisma:migrate
npm run seed
```

O `buildCommand` configurado roda `prisma generate && next build`.

## Limitacoes conhecidas

- O codigo-fonte original do Base44 nao foi exposto pelo conector; a UI foi recriada por engenharia reversa de schema, dados e HTML salvo.
- Links antigos em `pdfUrl` podem apontar para storage do Base44; a migracao deve baixar/preservar anexos e HTML antes de desligar o app original.
- Datas ambigueas foram mantidas como texto para evitar perda de fidelidade.
