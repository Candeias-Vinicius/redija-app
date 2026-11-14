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

## Deploy no Railway

1. **New Project → Deploy from GitHub repo** e escolha este repositório.
2. Em **Settings → Source**, defina **Root Directory** como `server`. O Railway lê `server/railway.json`
   (build pelo `Dockerfile`, healthcheck em `/health`).
3. Em **Variables**:
   - `ALLOWED_ORIGINS=https://seu-dominio.com.br,https://*.vercel.app` (domínio de produção + previews da Vercel)
   - Opcionais: `MAX_UPLOAD_MB` (25), `PANDOC_TIMEOUT_MS` (45000), `MAX_CONCURRENT_JOBS` (2),
     `RATE_LIMIT_PER_MINUTE` (12), `PANDOC_MAX_HEAP` (768m).
   - **Não coloque segredos neste serviço**: ele processa arquivos enviados por qualquer usuário.
4. Em **Settings → Networking**, gere um domínio público (`*.up.railway.app`).
5. Em **Settings → Deploy**, ative **Serverless / App Sleeping** para não pagar com o serviço ocioso
   (a primeira importação depois de um tempo parado leva alguns segundos a mais).
6. Em **Settings → Resources**, limite a memória (1 GB é suficiente).
7. Na **Vercel**, adicione `VITE_IMPORT_API_URL=https://<seu-servico>.up.railway.app` e faça redeploy.
   O CSP (`vercel.json`) já libera `https://*.up.railway.app`; troque pelo domínio exato quando ele existir.

## Segurança

- Uploads limitados (`MAX_UPLOAD_MB`), proteção contra zip bomb (tamanho declarado e real, número de arquivos)
  e contra caminhos que escapam da pasta (`../`, absolutos).
- Antes de chamar o Pandoc, `\input`, `\include` etc. (LaTeX) e `read()`, `#include` etc. (Typst)
  que apontem para fora do projeto são recusados.
- Pandoc roda sem shell, com timeout, teto de memória (`+RTS -M`) e ambiente mínimo; o container roda sem root.
- CORS restrito a `ALLOWED_ORIGINS` (+ localhost), rate limit por IP e limite de conversões simultâneas.

## Atualizando o Pandoc

Altere `ARG PANDOC_VERSION` no `Dockerfile` (versões em https://github.com/jgm/pandoc/releases).
