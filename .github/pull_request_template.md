<!-- Base do PR: develop (PRs para main só a partir da develop). -->

## O que muda

<!-- Resumo em 1–3 frases: o quê e por quê. -->

Closes #

## Tipo

- [ ] Funcionalidade (`feat`)
- [ ] Correção (`fix`)
- [ ] Refatoração (`refactor`)
- [ ] Documentação (`docs`)
- [ ] Infra / CI / dependências (`chore`)

## Como testar

<!-- Passos para quem for revisar. Login Google não funciona no preview da Vercel: teste no dev.redija.com.br após o merge. -->

1.

## Prints / vídeo

<!-- Obrigatório se mexer em interface. Apague a seção se não se aplicar. -->

## Checklist

- [ ] Testei localmente (`npm run dev`)
- [ ] `npm run lint`, `npm run typecheck` e `npm test` passando
- [ ] Rodei `npm run test:e2e` se a mudança afeta fluxos de tela
- [ ] Atualizei a documentação (`src/core/docs/documentationCatalog.ts`) se mudou comportamento para o usuário
- [ ] Mexi em `server/`? Conferi o impacto no serviço de importação (Railway)
