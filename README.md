# ✍️ RedijaApp

> **Editor acadêmico visual moderno, intuitivo e automatizado com foco em ABNT e Typst.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Typst](https://img.shields.io/badge/Engine-Typst-239dad.svg)](https://typst.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 A Proposta

Escrever trabalhos acadêmicos no Brasil (TCCs, dissertações e artigos) é um processo frustrante:
* **No Word:** Alunos perdem dias lutando com margens (3-3-2-2 cm), paginação, sumários que quebram e referências manuais.
* **No Overleaf / LaTeX:** A barreira de entrada técnica e erros de compilação afastam 95% dos estudantes que não são da área de exatas.

O **RedijaApp** une o melhor dos dois mundos: uma **interface visual limpa estilo Notion** (orientada a blocos e comandos com clique) com o poder tipográfico do **Typst** rodando por baixo dos panos. O usuário apenas escreve; o RedijaApp cuida de 100% da diagramação ABNT.

---

## ✨ Funcionalidades Principais

* **Editor Visual em Blocos:** Escreva sem ver código. Use títulos, parágrafos, listas e blocos estruturados.
* **Citação Direta Longa Automática (NBR 10520):** Bloco visual com recuo exato de 4cm, fonte tamanho 10pt e espaçamento simples gerado automaticamente.
* **Capa e Folha de Rosto (NBR 14724):** Preencha os campos (Instituição, Autor, Título, Cidade, Ano) e a capa é diagramada instantaneamente.
* **Gerenciador de Referências (NBR 6023):** Cadastre livros e artigos em um formulário intuitivo; o sistema ordena e formata em caixa alta e negrito automaticamente.
* **Transpilador Typst:** Conversão instantânea da árvore de blocos em código Typst puro e semântico.
* **Prévia em Tempo Real:** Visualize as páginas diagramadas lado a lado enquanto digita.
* **Exportação .typ:** Baixe o arquivo pronto para compilação ou integração.

---

## 🏗️ Arquitetura do Sistema

```
[ Usuário ] 
     ↓ (Digitação visual / cliques)
[ Editor em Blocos (React / UI) ]
     ↓ (Árvore de Dados JSON)
[ Transpilador RedijaApp (src/core/transpiler) ]
     ↓ (Gera marcação semântica Typst)
[ Motor Typst (WASM / CLI) ]
     ↓
[ PDF ABNT Perfeito ]
```

---

## 📁 Estrutura de Diretórios

```
redija-app/
├── .github/workflows/       # CI/CD (Testes e Typecheck automático)
├── public/                  # Arquivos estáticos
├── src/
│   ├── components/          # Componentes de UI (Editor, Sidebar, Header, Preview)
│   ├── core/
│   │   ├── abnt/            # Regras e constantes normativas (NBRs)
│   │   ├── templates/       # Modelos base em Typst
│   │   └── transpiler/      # Conversor de blocos JSON para Typst
│   ├── types/               # Tipagens TypeScript (Documento, Referências, Metadados)
│   ├── App.tsx              # Componente raiz com orquestração de estado
│   └── main.tsx             # Entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **npm** ou **pnpm**

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Candeias-Vinicius/redija-app.git
   cd redija-app
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. Abra `http://localhost:3000` no seu navegador.

---

## 🗺️ Roadmap de Evolução

- [x] **Fase 1 (MVP):** Editor visual em blocos, modelos de Capa e Citação ABNT, gerador Typst e prévia A4.
- [ ] **Fase 2 (Compilação Wasm In-Browser):** Integrar `@myriaddreamin/typst.ts` para renderizar PDFs reais em milissegundos dentro do navegador sem custos de servidor.
- [ ] **Fase 3 (Busca Automática de Referências):** Inserção de referências colando apenas o DOI ou ISBN (busca via CrossRef API).
- [ ] **Fase 4 (Colaboração em Tempo Real):** Suporte a multiusuário com WebSockets / Yjs (estilo Google Docs).
- [ ] **Fase 5 (Modelos Customizados):** Suporte a regras de revistas específicas (SBC, IEEE, periódicos Capes).

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
