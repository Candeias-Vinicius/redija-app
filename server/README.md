# Serviço de importação do RedijaApp

Converte `.docx`, `.tex`, `.md`, `.typ` e `.zip` (Overleaf, projeto Typst) para o **AST JSON do Pandoc**.
O front (`src/core/storage/importer/pandoc/`) transforma esse AST em um projeto `.redija`.

```
navegador ──(multipart)──► POST /convert ──► pandoc -t json ──► { ast, media, mathTypst, bibliography }
                                                                       │
                       src/core/storage/importer/pandoc/astToProject.ts ◄┘  → DocumentProject
```

O serviço **não guarda nada**: cada requisição usa uma pasta temporária que é apagada ao final.

## Endpoints

| Método | Rota       | Descrição                                                              |
| ------ | ---------- | ---------------------------------------------------------------------- |
| GET    | `/health`  | `{ ok, pandoc }`, usado pelo healthcheck do Railway                     |
| POST   | `/convert` | campo `file` (multipart). Resposta: `ConvertResponse` em `src/convert.ts` |

## Rodando localmente

Requer Node ≥ 22.18 (executa TypeScript direto) e o [Pandoc](https://pandoc.org/installing.html) no PATH.

```bash
cd server
npm install
npm start            # http://localhost:8080
npm test             # testes de segurança (zip, caminhos, CORS)
```

Ou com Docker (não precisa instalar o Pandoc):

```bash
docker build -t redija-import server
docker run --rm -p 8080:8080 redija-import
```

No front, crie `.env.local` com `VITE_IMPORT_API_URL=http://localhost:8080`.

## Deploy no Railway (Infrastructure as Code)

A infraestrutura está descrita em [`.railway/railway.ts`](../.railway/railway.ts), na raiz do repositório
(o antigo Config as Code, `railway.json`, foi descontinuado pelo Railway). Ele define o serviço
`redija-import` nos dois ambientes:

| Ambiente     | Branch    | Domínio                 | CORS (`ALLOWED_ORIGINS`)                         |
| ------------ | --------- | ----------------------- | ------------------------------------------------ |
| `production` | `main`    | `api.redija.com.br`     | `https://app.redija.com.br`                      |
| `dev`        | `develop` | `api-dev.redija.com.br` | `https://dev.redija.com.br` + localhost          |

Em ambos: build pelo `Dockerfile` de `server/`, rebuild só quando `server/**` muda, healthcheck em `/health`,
reinício em caso de falha, App Sleeping e teto de 1 GB de memória.

**Aplicando** (o arquivo só é lido pela CLI, nunca durante os deploys):

```bash
npm install -g @railway/cli
railway login
railway link          # escolha o projeto e o ambiente (production ou dev)
railway config plan   # revise: mostra o que será criado, alterado ou removido
railway config apply  # aplica após confirmação
```

Repita `link` → `plan` → `apply` para o outro ambiente. Se o ambiente `dev` ainda não existir, crie-o no
painel (seletor de ambiente → **New Environment**).

> **Atenção ao `plan`:** o arquivo declara só o `redija-import`. Serviços que já existirem no projeto e não
> estiverem no arquivo aparecem como remoção — confira antes de aplicar.

**DNS:** os domínios `api` e `api-dev` precisam de um registro **CNAME** no DNS de `redija.com.br`
apontando para o alvo que o Railway mostra em **Settings → Networking** de cada ambiente.

**Variáveis opcionais** (adicione em `env` no `railway.ts`): `MAX_UPLOAD_MB` (25), `PANDOC_TIMEOUT_MS` (45000),
`MAX_CONCURRENT_JOBS` (2), `RATE_LIMIT_PER_MINUTE` (12), `PANDOC_MAX_HEAP` (768m).
**Não coloque segredos neste serviço**: ele processa arquivos enviados por qualquer usuário.

**Vercel:** defina `VITE_IMPORT_API_URL` por ambiente — `https://api.redija.com.br` em Production e
`https://api-dev.redija.com.br` em Preview (branch `develop`) — e faça redeploy.

## Segurança

- Uploads limitados (`MAX_UPLOAD_MB`), proteção contra zip bomb (tamanho declarado e real, número de arquivos)
  e contra caminhos que escapam da pasta (`../`, absolutos).
- Antes de chamar o Pandoc, `\input`, `\include` etc. (LaTeX) e `read()`, `#include` etc. (Typst)
  que apontem para fora do projeto são recusados.
- Pandoc roda sem shell, com timeout, teto de memória (`+RTS -M`) e ambiente mínimo; o container roda sem root.
- CORS restrito a `ALLOWED_ORIGINS` (+ localhost), rate limit por IP e limite de conversões simultâneas.

## Atualizando o Pandoc

Altere `ARG PANDOC_VERSION` no `Dockerfile` (versões em https://github.com/jgm/pandoc/releases).
