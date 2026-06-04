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
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="senha-inicial"
ADMIN_NAME="Administrador"
BASE44_APP_ID="690248a304b1770ec9b7c4ed"
BASE44_EMAIL=""
BASE44_PASSWORD=""
```

`password_hash` e `AUTH_SECRET` sao novos no sistema independente. Eles nao existem no Base44; foram adicionados para substituir o Base44 Auth.

## Rodar local

```bash
npm install
npm run prisma:generate
npm run prisma:dev
npm run seed
npm run dev
```

Acesse `http://localhost:3000` e entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

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

Importar para o banco configurado em `DATABASE_URL`:

```bash
npm run import:base44
```

Tambem e possivel importar de uma pasta especifica:

```bash
node scripts/import-base44.mjs ./exports/base44-690248a304b1770ec9b7c4ed
```

IDs originais do Base44 sao preservados para manter historico de downloads e referencias por lote.

## Funcionalidades implementadas

- Login por cookie assinado.
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
4. Garanta que a migration rode antes do uso:

```bash
npm run prisma:migrate
npm run seed
```

O `buildCommand` configurado roda `prisma generate && next build`.

## Limitacoes conhecidas

- O codigo-fonte original do Base44 nao foi exposto pelo conector; a UI foi recriada por engenharia reversa de schema, dados e HTML salvo.
- A inspecao visual do preview/editor foi bloqueada por falha local do navegador interno.
- Links antigos em `pdfUrl` podem apontar para storage do Base44; a migracao deve baixar/preservar anexos e HTML antes de desligar o app original.
- Datas ambigueas foram mantidas como texto para evitar perda de fidelidade.
