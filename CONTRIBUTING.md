# Contribuindo com o RedijaApp

Obrigado pelo interesse em contribuir com o **RedijaApp**! Contribuições envolvendo correções de bugs, melhorias de acessibilidade, novos modelos acadêmicos, regras de conformidade normativa (ABNT, SBC, IEEE, APA), testes automatizados e documentação são muito bem-vindas.

---

## Reportando Bugs e Sugerindo Melhorias

Antes de abrir uma nova issue, verifique se o tema já não foi relatado nas [Issues do repositório](https://github.com/Candeias-Vinicius/redija-app/issues).

Ao abrir uma **Bug Issue**, procure incluir:
- Passos exatos para reproduzir o problema;
- Modelo/preset utilizado (ex.: TCC ABNT, Artigo 2 Colunas, SBC, IEEE, Pôster A0 ou Typst Universe);
- Comportamento esperado versus comportamento observado;
- Capturas de tela ou o código gerado na aba **Ver Typst**, quando aplicável.

> **Nota de Segurança:** Vulnerabilidades de segurança ou exposição indevida de credenciais não devem ser publicadas em issues públicas; entre em contato via `contato.redija@gmail.com`.

---

## Configurando o Ambiente de Desenvolvimento

### Pré-requisitos
- **Node.js** `20.19+`, `22.12+` ou `24 LTS` (versão usada no CI)
- **npm**

### Passo a passo

```bash
git clone https://github.com/Candeias-Vinicius/redija-app.git
cd redija-app
npm install
cp .env.example .env
npm run dev
```

A aplicação ficará disponível em **`http://localhost:3000`**.

> **Dica:** Para desenvolvimento local não é obrigatório configurar o Google Client ID no `.env`. Basta acessar a tela inicial e clicar em **"Experimentar como Convidado"** ou **"Entrar em Modo Demonstração (Dev)"**.

---

## Fluxo de Branches e Pull Requests

O repositório segue o fluxo de integração contínua baseado em duas branches principais:

1. **`develop`**: branch padrão de integração para novas funcionalidades, correções e refatorações.
2. **`main`**: branch estável de produção.

> **Importante:** Sempre crie sua branch a partir de **`develop`** e abra o Pull Request tendo **`develop`** como base (`base: develop`). O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) bloqueia automaticamente PRs para `main` cuja origem não seja estritamente `develop`.

Sugestão de nomenclatura para branches:
- `feat/nome-da-funcionalidade`
- `fix/descricao-do-bug`
- `docs/ajuste-documentacao`
- `refactor/escopo-modular`

---

## Padrões de Código e Arquitetura

- **Separação de camadas (`src/core/`, `src/hooks/`, `src/components/`):** regras puras de transpilação Typst, parsers (`.docx`, `.tex`, `.typ`, `.redija`), serviços e validações normativas ficam em `src/core/` para facilitar testes unitários sem acoplamento com DOM.
- **Worker WASM isolado:** mantenha compilação e rasterização Typst restritas ao Web Worker (`src/core/typst/typst.worker.ts`) sem carregar WASM na thread principal.
- **Isolamento Cliente vs. Serverless:** módulos exclusivos de Node/Vercel (`api/`) e provedores externos (ex.: `resend`) nunca devem ser importados no bundle de cliente do Vite.
- **Fonte única de documentação:** atualizações em guias de usuário ou especificações de normas devem ser feitas em [`src/core/docs/documentationCatalog.ts`](src/core/docs/documentationCatalog.ts), alimentando automaticamente [`/docs`](https://app.redija.com.br/docs) e o guia rápido interno.
- **Formatação e Tipagem:** mantenha o código formatado com Prettier (`npm run format`) e livre de erros de tipagem ou warnings do ESLint.

---

## Verificações Obrigatórias Antes do PR

Antes de submeter um Pull Request, execute localmente os mesmos checks exigidos pela pipeline do GitHub Actions:

```bash
npm run lint        # ESLint com --max-warnings 0
npm run typecheck   # TypeScript strict (tsc --noEmit)
npm test            # Testes unitários e integração WASM (Vitest)
npm run test:e2e    # Testes End-to-End em navegador real (Playwright)
npm run build       # Build final de produção
```

*(Caso adicione um novo navegador Playwright pela primeira vez na máquina, execute `npx playwright install chromium`.)*

---

## Licença

Ao contribuir com código ou documentação para este repositório, você concorda que suas contribuições sejam licenciadas sob os termos da licença **MIT** ([`LICENSE`](LICENSE)).
