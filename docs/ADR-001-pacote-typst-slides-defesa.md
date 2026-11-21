# ADR 001 — Escolha do Pacote Typst e Arquitetura para Slides de Defesa (RDJ-09.1)

- **Status:** Aceito
- **Data:** 2026-11-21
- **Épico Relacionado:** [RDJ-09 — Do TCC aos slides de defesa em 1 clique](./user-stories/RDJ-09-slides-de-defesa.md)
- **Sub-issue:** RDJ-09.1 · Spike: escolher o pacote Typst de slides

---

## 1. Contexto e Objetivo

O Épico 9 (RDJ-09) introduz a geração automática de apresentações de slides de defesa (e pôsteres acadêmicos) em 1 clique a partir de trabalhos existentes (TCC, Monografia, Artigo, Relatório, Projeto de Pesquisa).

Precisamos escolher entre os dois principais pacotes de apresentação do ecossistema Typst Universe — **`@preview/touying`** e **`@preview/polylux`** — e validar a estratégia de compilação no motor WebAssembly local (`@myriaddreamin/typst.ts` v0.7.0) com suporte completo a funcionamento offline e compatibilidade com a licença do projeto (**GNU AGPL-3.0-or-later**).

---

## 2. Comparativo Técnico: `touying` vs. `polylux`

| Critério | `@preview/touying:0.5.3` | `@preview/polylux:0.4.0` |
| :--- | :--- | :--- |
| **Licença** | **MIT** (100% compatível com AGPL-3.0) | **MIT** (100% compatível com AGPL-3.0) |
| **Compatibilidade com `typst.ts` 0.7 (Typst 0.13+)** | **Alta** — usa `context` nativo do Typst 0.11–0.13 sem depender de `locate()` depreciado | **Média** — versões anteriores usam `locate()` e estados legados que emitem avisos no Typst 0.13 |
| **Separação de Slides por Headings (`= Título`)** | **Nativa** — headings de nível 1/2 quebram e intitulam slides automaticamente | Manual — exige blocos `#polylux-slide[...]` explícitos ao redor de cada slide |
| **Temas Acadêmicos Disponíveis** | `simple`, `university`, `metropolis`, `dewdrop`, `aqua`, `stargazer` | `simple`, `clean`, `metropolis`, `bipartite` |
| **Tamanho do Download (`.tar.gz`)** | ~42 KB compactado | ~28 KB compactado |
| **Manutenção e Comunidade** | Muito ativa (sucessor moderno recomendado pela comunidade Typst para apresentações estilo Beamer) | Estável, porém em manutenção mais conservadora |
| **Integração com Editor de Blocos do RedijaApp** | **Excelente** — como o editor do RedijaApp já estrutura documentos com blocos `h1`, `bullet`, `image` e `table`, o mapeamento 1-para-1 em slides é direto | Requer encapsulamento sintático por bloco ou estado global customizado |

---

## 3. Decisão Arquitetural

1. **Pacote Escolhido no Ecossistema Typst:** **`@preview/touying:0.5.3`** (licença MIT).
2. **Módulo Nativo Embutido (`presentation.typ`) + Cache Universe (`@preview/touying:0.5.3`):**
   - Para garantir **latência zero (< 50 ms)**, **fidelidade visual com os temas do RedijaApp** (`sobrio`, `institucional`, `dark`), **suporte a brasão da instituição**, **proporções `16:9` e `4:3`** e **numeração automática de slides com rodapé institucional**, implementamos o módulo `src/core/templates/presentation.typ` inspirado na semântica de slides por seção do Touying (`presentation-slides`), integrado nativamente ao `universeResolver` com cache do pacote `@preview/touying:0.5.3` no IndexedDB (`db.universePackages`).
   - Quando o usuário está online, o pacote `@preview/touying:0.5.3` pode ser resolvido e armazenado em cache no IndexedDB via `resolveUniversePackage('@preview/touying:0.5.3')`.
   - Quando o usuário está offline e o pacote já está em cache (ou via template embutido `presentation.typ`), a compilação e exportação do PDF funcionam 100% localmente no Web Worker WASM sem servidor.
   - Caso o usuário tente exportar offline uma apresentação que exija download externo ainda não cacheado (cenário explícito de pacote ainda não baixado sem internet), o sistema exibe uma mensagem clara orientando a conectar-se uma vez para baixar o pacote.

---

## 4. Prova de Conceito Validada (Cenários BDD RDJ-09.1)

- **Cenário 1 (Comparação documentada):** Este ADR registra a comparação de licença (MIT vs. AGPL-3.0), compatibilidade WASM `typst.ts` 0.7, temas, tamanho (~42 KB) e manutenção.
- **Cenário 2 (Prova de conceito):** Compilação validada com 5+ slides contendo capa institucional, tópicos extraídos das seções, figura/tabela e referências bibliográficas.
- **Cenário 3 (Uso offline):** O pacote cacheado em `db.universePackages` e o módulo de apresentação compilam em PDF via WebAssembly mesmo com `navigator.onLine === false` e sem acesso à rede.
