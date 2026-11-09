# ✍️ RedijaApp

> **Editor acadêmico visual moderno, colaborativo e automatizado com conformidade estrita às normas da ABNT e motor tipográfico Typst WASM.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Typst](https://img.shields.io/badge/Engine-Typst_WASM-239dad.svg)](https://typst.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 A Proposta

Escrever trabalhos acadêmicos no Brasil (TCCs, dissertações, teses e artigos) costuma ser um processo exaustivo e burocrático:

- **No Word:** Alunos perdem dias lutando com margens (3-3-2-2 cm), numeração romana/arábica de páginas, sumários desajustados e formatação manual de referências.
- **No Overleaf / LaTeX:** A alta complexidade sintática e mensagens de erro de compilação afastam a grande maioria dos pesquisadores e estudantes.

O **RedijaApp** elimina essa barreira: uma **interface visual limpa estilo Notion**, orientada a blocos com formatação rica e arrastar-e-soltar, impulsionada pelo motor **Typst compilado em WebAssembly (WASM)** rodando diretamente no navegador do usuário. Você apenas escreve o conteúdo; o RedijaApp cuida de 100% da diagramação normativa em tempo real, sem custos de servidores de compilação.

---

## ✨ Funcionalidades do Sistema

### 1. Nova Identidade Visual & Tela de Entrada Informativa

- **Logotipo Vetorial Transparente:** Ícone tipográfico estilizado com gradiente esmeralda e ciano, totalmente desacoplado da tipografia para excelente legibilidade em fundos claros e escuros.
- **Layout Split-Screen Moderno:** Tela de boas-vindas dividida com carrossel interativo apresentando as principais propostas de valor do aplicativo:
  - Normatização ABNT 100% automática em tempo real.
  - Nuvem Pessoal no Google Drive (arquivos sob o controle do usuário).
  - Colaboração ao vivo no estilo Google Docs sem servidores intermediários.
  - Importação inteligente de arquivos Word (.docx) com conversão de imagens e estilos.
- **Alternador de Tema Claro e Escuro:** Suporte a modo escuro profundo (Dark Mode) e modo claro elegante com alternância instantânea na tela de login e no cabeçalho do editor.
- **Entrada com Perfil Local:** Opção clara para utilizar o aplicativo offline e localmente sem necessidade de conta ou login imediato.

---

### 2. Editor Visual Modular em Blocos (Estilo Notion)

- **Estrutura por Blocos:** Crie e organize o conteúdo através de blocos modulares sem ver ou editar código-fonte.
- **Títulos Hierárquicos ABNT:** Suporte completo a seções primárias (H1 numerado), secundárias (H2), terciárias (H3), quaternárias (H4), quinárias (H5) e títulos não numerados (ex.: Resumo, Introdução, Referências).
- **Formatação Rica (TipTap):** Negrito, itálico, sublinhado, sobrescrito e subscrito com atalhos de teclado.
- **Citação Direta Curta (NBR 10520):** Diálogo integrado para inserir citações no corpo do texto conectadas às referências cadastradas, com indicação de página e ano.
- **Citação Direta Longa (+ de 3 linhas):** Bloco dedicado com recuo automático de 4 cm da margem esquerda, fonte tamanho 10 pt e espaçamento entrelinhas simples.
- **Equações Matemáticas:** Renderização de fórmulas matemáticas com notação Typst e opção de numeração sequencial à direita.
- **Blocos de Código:** Apresentação de código com destaque de sintaxe (_syntax highlighting_) configurável por linguagem.
- **Figuras e Imagens:** Upload com pré-visualização, controle de largura (50%, 75% ou 100%), legenda superior e fonte inferior conforme exigido pela ABNT. Quota de até 150 MB de imagens por trabalho.
- **Tabelas Acadêmicas:** Tabelas padronizadas (normas do IBGE / ABNT), com linhas horizontais abertas nas laterais, cabeçalho e fonte.
- **Quadros:** Estruturas fechadas com grade completa para dados qualitativos, com legenda e fonte.
- **Notas de Rodapé & Quebras de Página:** Adicione notas numeradas e force quebras de página explícitas quando necessário.
- **Reorganização Dinâmica:** Arraste e solte (_drag and drop_) blocos para reposicionar seções instantaneamente.
- **Histórico Completo de Edição:** Desfazer e refazer (Undo / Redo) acessíveis por botões na barra de ferramentas ou atalhos (`Ctrl+Z` / `Ctrl+Y`).

---

### 3. Importação Inteligente de Documentos (.docx, Overleaf/LaTeX, Typst e Backups)

- **Detecção Heurística & Field Matching:** Identifica automaticamente o modelo acadêmico compatível (TCC, Artigo Científico NBR 6022, Relatório Técnico, IEEE, SBC, Pôster ou Typst Universe) e preenche metadados semânticos (título, autores, orientador, instituição, resumo, abstract e palavras-chave).
- **Importador Word (.docx):** Converte títulos hierárquicos, parágrafos, listas, tabelas e imagens embutidas com sanitização contra HTML/SVG malicioso.
- **Projetos LaTeX / Overleaf (.tex / .zip) & Typst (.typ / .zip):** Extrai seções, equações, figuras, pacotes `@preview/...` e referências `.bib` preservando ativos em subpastas.
- **Backups Portáteis (.redija):** Importação e exportação de projetos completos em JSON padronizado com preservação integral de referências, imagens e configurações normativas.

---

### 4. Normatização e Formatação ABNT 100% Automática

- **Margens Oficiais:** Configuração estrita de 3 cm (superior e esquerda) e 2 cm (inferior e direita).
- **Tipografia Acadêmica:** Escolha entre fontes padrão _serif_ (Times New Roman) e _sans-serif_ (Arial), com corpo de texto em 12 pt e notas/legendas em 10 pt.
- **Espaçamento e Indentação:** Espaçamento 1,5 entre linhas no corpo do texto e recuo de parágrafo automático de 1,25 cm.
- **Predefinições Normativas (Presets):**
  - _ABNT Clássica_ (Monografias e Teses).
  - _ABNT 2023_ (Atualizações da NBR 10520:2023 com citações em caixa mista).
  - _Artigo em 2 Colunas_ (Formato acadêmico para periódicos e conferências).
  - _APA 7ª Edição_ (Padrão internacional com margens de 2,54 cm).
  - _Configuração Customizada_ (Ajuste fino de margens, colunas e estilos).
- **Modelos Prontos para Uso:** Crie projetos a partir de templates estruturados para **TCC / Monografia**, **Artigo Científico**, **Relatório Técnico**, **Projeto de Pesquisa** ou comece com um **Documento em Branco**.

---

### 5. Elementos Pré-Textuais e Pós-Textuais (NBR 14724)

- **Capa Personalizada:** Diagramação institucional automática com inclusão opcional de brasão ou logotipo.
- **Folha de Rosto:** Formatação com autor, título, subtítulo, nota de apresentação (natureza do trabalho), instituição, orientador e coorientador.
- **Folha de Aprovação:** Geração de página formal de avaliação com data de aprovação e lista de membros da banca examinadora com linhas de assinatura.
- **Páginas Especiais:** Seções dedicadas para Dedicatória, Agradecimentos e Epígrafe com autoria.
- **Resumo e Abstract:** Resumo vernáculo com lista de palavras-chave e versão em língua estrangeira (_Abstract_) com _keywords_.
- **Sumário e Listas Automáticas:** Sumário geral gerado dinamicamente pelo Typst, além de Listas de Figuras, Listas de Tabelas e Listas de Quadros.
- **Seções Pós-Textuais:** Campos dedicados para Lista de Abreviaturas e Siglas, Símbolos, Glossário, Apêndices e Anexos.

---

### 6. Gerenciador Bibliográfico Inteligente (NBR 6023)

- **Cadastro Estruturado por Tipo:** Suporte a Livros, Artigos de Periódicos, Teses/Dissertações, Páginas da Web e Documentos Legislativos.
- **Busca e Autopreenchimento por DOI:** Integração com a API pública da CrossRef: basta colar o código DOI para que título, autores, revista, volume, páginas e ano sejam preenchidos em segundos.
- **Ordenação Alfabética e Destaque:** Ordenação automática por sobrenome do autor e formatação do título com destaque configurável (Negrito ou Itálico) e estilo de citação (Caixa Alta `SOBRENOME, Ano` ou `Sobrenome, Ano`).

---

### 7. Engine Typst WASM 100% Isolada em Web Worker (Zero Bloqueio de UI)

- **Isolamento Completo (Compiler + Renderer em Worker):** Tanto o compilador (`typst-ts-web-compiler`) quanto o renderizador tipográfico (`typst-ts-renderer`) operam exclusivamente dentro de um Web Worker dedicado (`src/core/typst/typst.worker.ts`), sem carregar nem instanciar módulos WASM na thread principal do navegador.
- **Rasterização via OffscreenCanvas & ImageBitmap:** O Worker rasteriza as páginas vetoriais em `OffscreenCanvas` e transfere os quadros gerados como `ImageBitmap` (Transferable Objects de zero-copy) para o DOM principal, garantindo digitação e animações fluidas a 60 fps constantes.
- **Cancelamento Inteligente de Renderizações Obsoletas:** Request IDs descartam automaticamente frames de compilações intermediárias quando o usuário digita em ritmo acelerado.
- **Pré-visualização Interativa do PDF:** Visualizador do documento renderizado lado a lado com controle de zoom (70% a 145%), modo de folha clara/noturna, navegação de páginas e ajuste dinâmico de layout (painel dividido ou tela cheia).
- **Painel de Diagnósticos em Tempo Real:** Detecção e tradução amigável de alertas e erros de sintaxe tipográfica em português sem travar a interface.

---

### 8. Suporte Amplo a Modelos Acadêmicos e Typst Universe

- **Normas ABNT NBR 14724 / 6023 / 10520:** TCCs, Monografias, Dissertações e Artigos em 1 ou 2 colunas.
- **Artigo SBC:** Modelo oficial da Sociedade Brasileira de Computação (`sbc.typ`) para simpósios e periódicos de TI.
- **Artigo IEEE Conference:** Formato internacional de conferências de engenharia e tecnologia em 2 colunas (`ieee.typ`).
- **Pôster Acadêmico A0:** Painel científico diagramado em alta resolução para impressão de congressos (`poster.typ`).
- **Typst Universe Dinâmico:** Resolução e injeção automática de templates do repositório oficial da comunidade Typst (`@preview/...`) com fallback offline.
- **Aba Lateral Adaptativa (Matriz de Capacidades):** A barra lateral adapta cabeçalho, badges de norma (ex.: `NBR 14724`, `ABNT Modificado`, `SBC`, `IEEE`, `Typst Universe`), campos de metadados, Linter ABNT e Guia de Normas ao template ativo, preservando em gaveta segura eventuais dados ocultos preenchidos em outro modelo.

---

### 9. Arquitetura Multi-Perfil & Nuvem Pessoal (Google Drive BYOS)

- **Persistência Local (IndexedDB):** Todos os rascunhos e imagens são mantidos localmente via Dexie.js, garantindo funcionamento ininterrupto mesmo sem conexão com a internet.
- **Isolamento Estrito entre Perfil Local e Contas Google:**
  - O Perfil Local opera isoladamente no navegador com opção explícita de "Sair do Perfil Local".
  - Se um colega sentar na mesma máquina e logar com a conta Google dele, os arquivos locais do proprietário permanecem protegidos e isolados: o sincronizador nunca herda nem envia trabalhos locais para a conta Google de terceiros.
- **Bring Your Own Storage (BYOS):** Seus dados pertencem a você. O RedijaApp integra-se à conta pessoal do Google Drive do usuário via Google Identity Services (OAuth2).
- **Gestão de Sessão Segura:** Tokens OAuth2 mantidos em memória RAM (protegidos contra ataques XSS), consentimento persistido sem caixas de diálogo repetidas em logins subsequentes e opção de logout seguro.

---

### 10. Colaboração em Tempo Real & Concorrência Inteligente

- **Colaboração em Tempo Real P2P (WebRTC + BroadcastChannel):** Comunicação peer-to-peer direta entre navegadores de colaboradores via canais de dados WebRTC (PeerJS) e BroadcastChannel (para abas no mesmo computador), sem latência e sem custo de servidores intermediários.
- **Indicadores Visuais de Presença:**
  - Indicador pulsante no cabeçalho com contagem de usuários ativos (`● 2 online`) e avatares com fotos de perfil.
  - Contorno luminoso e etiquetas flutuantes `"[Nome] está aqui"` no bloco exato que outro colaborador estiver visualizando ou editando.
- **Mesclagem Automática por Blocos (Auto-Merge):** Resolução inteligente de concorrência com base em marcas temporais (`updatedAt`) por bloco. Se dois autores editarem o documento em horários ou conexões diferentes, as alterações são mescladas de maneira não destrutiva, sem perda de parágrafos nem duplicatas de referências.
- **Compartilhamento Nativo via Google Drive:** Compartilhe projetos diretamente com orientadores e colegas através do modal integrado, definindo permissões de Leitor ou Editor via Google Drive Permissions API.

---

### 11. Gestão de Trabalhos & Lixeira com Retenção de 30 Dias

- **Gerenciador de Trabalhos:** Alterne facilmente entre diferentes projetos acadêmicos salvos no perfil ativo.
- **Lixeira com Retenção de 30 Dias:** Exclusão suave com contagem regressiva de retenção e expurgo automático de itens antigos. Restauração de projetos com um clique.
- **Permissão de Exclusão Total:** Liberdade para apagar qualquer trabalho, mesmo quando for o último existente, exibindo um estado inicial vazio (_Empty State_) acolhedor para recomeçar do zero.
- **Exportação Versátil:**
  - **PDF ABNT (.pdf):** Documento final pronto para impressão ou submissão à banca.
  - **Código-Fonte Typst (.typ):** Arquivo-fonte puro para uso e compilação externa no CLI do Typst.
  - **Backup Redija (.redija):** Arquivo JSON portátil contendo todos os blocos, metadados, imagens e configurações do projeto.
- **Métricas do Documento:** Painel com contagem em tempo real de caracteres, palavras, estimativa de páginas A4 e tamanho total de imagens embutidas.
- **Configurações de Conta e Privacidade:** Indicador de projetos locais vs. projetos na nuvem, opção para revogação explícita de permissões do Google e funcionalidade de exclusão total de dados do Drive com confirmação por texto de segurança.

---

## 🏗️ Arquitetura do Sistema

```
                      ┌─────────────────────────────────────────────────────────────────┐
                      │                 Thread Principal da Interface (DOM)             │
                      │  • React 18 + TipTap (Editor em blocos com histórico Undo/Redo) │
                      │  • Sidebar com Linter ABNT memoizado                            │
                      │  • PdfPreview com geração Typst sob demanda                     │
                      │  • Viewport de Canvases (exibe ImageBitmaps via GPU Blitting)   │
                      └───────────────────────────────┬─────────────────────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
            ┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
            │  IndexedDB (Dexie)  │        │ Transpilador Typst  │        │ Colaboração P2P     │
            │ Cache Local-First   │        │ • Cache LRU Imagens │        │ WebRTC + Broadcast  │
            └──────────┬──────────┘        │ • Geração main.typ  │        └──────────┬──────────┘
                       │                   └──────────┬──────────┘                   │
                       ▼                              │                              ▼
            ┌─────────────────────┐                   ▼ postMessage(files, [buffers])┌─────────────────────┐
            │ Google Drive v3 API │        ┌────────────────────────────────────┐    │ Presença e Cursors  │
            │ Armazenamento BYOS  │        │        Web Worker Dedicado         │    │  Sincronia ao Vivo  │
            └─────────────────────┘        │  • Typst Compiler WASM             │    └─────────────────────┘
                                           │  • Typst Renderer WASM             │
                                           │  • OffscreenCanvas Rasterizer      │
                                           └──────────────────┬─────────────────┘
                                                              │
                                                              ▼ Zero-Copy Transferable
                                                   [Transferable ImageBitmaps]
                                                              │
                                                              ▼
                                                   [Canvas DOM: drawImage()]
```

---

## 📁 Estrutura do Repositório

```
redija-app/
├── public/                      # Assets estáticos, fontes TrueType (Tinos, Arimo) e scripts
├── src/
│   ├── components/              # Componentes de interface do usuário (React 18)
│   │   ├── landing/             # Seções modulares da Landing Page de entrada
│   │   ├── sidebar/             # Subcomponentes modulares (Linter adaptativo e Campos preservados)
│   │   ├── AccountSettingsModal.tsx  # Configurações de conta, armazenamento e privacidade
│   │   ├── BackupNoticeBanner.tsx    # Alerta sutil de incentivo a backup para convidados
│   │   ├── BugReportModal.tsx   # Modal de reporte de problemas com dados do ambiente
│   │   ├── Editor.tsx           # Editor visual em blocos estilo Notion e presença P2P
│   │   ├── Header.tsx           # Barra superior com status, ações e ferramentas
│   │   ├── LoginScreen.tsx      # Tela de autenticação com split-screen e carrossel
│   │   ├── Logo.tsx             # Logotipo oficial com transparência alfa e gradiente
│   │   ├── PdfPreview.tsx       # Visualizador de PDF via Web Worker e código Typst
│   │   ├── ProjectsModal.tsx    # Gerenciamento de trabalhos e lixeira de 30 dias
│   │   ├── ReferenceModal.tsx   # Cadastro de referências ABNT e busca por DOI
│   │   ├── RichTextInput.tsx    # Editor de texto rico TipTap (tags semânticas)
│   │   ├── ShareModal.tsx       # Compartilhamento via Google Drive API
│   │   ├── Sidebar.tsx          # Aba lateral adaptativa por template, metadados, linter e referências
│   │   ├── TemplateCustomizerModal.tsx # Personalização de normas, margens e fontes
│   │   └── WelcomeModal.tsx     # Guia interativo inicial de recursos
│   ├── core/
│   │   ├── auth/                # Google Identity Services (OAuth2 Client)
│   │   ├── collaboration/       # Motor P2P WebRTC (PeerJS) e BroadcastChannel
│   │   ├── storage/             # Dexie.js (IndexedDB), Google Drive, Auto-Merge e Importer (.docx)
│   │   ├── templates/           # Modelos Typst nativos e matriz de capacidades (templateCapabilities.ts)
│   │   ├── transpiler/          # Transpilador de blocos, cache LRU de imagens e Linter ABNT
│   │   ├── typst/               # Web Worker com Typst Compiler + Typst Renderer WASM isolados
│   │   └── universe/            # Resolução e injeção de pacotes do Typst Universe (@preview/...)
│   ├── types/                   # Tipagens TypeScript (Documento, Metadados, Blocos, Presets)
│   ├── App.tsx                  # Orquestrador principal da aplicação
│   └── main.tsx                 # Ponto de entrada React 18
├── e2e/                         # Testes End-to-End automatizados com Playwright
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **npm** (ou **pnpm** / **yarn**)

### Instalação e Execução

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/Candeias-Vinicius/redija-app.git
   cd redija-app
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente (Opcional para Google Drive):**
   Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Adicione o seu Google Client ID gerado no Google Cloud Console:

   ```env
   VITE_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
   ```

   > **Nota de Desenvolvimento:** Se preferir testar sem credenciais do Google, inicie normalmente e selecione **"Entrar em Modo Demonstração (Dev)"** ou **"Continuar como Convidado"** na tela inicial.

4. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

5. Acesse a aplicação no seu navegador:
   ```
   http://localhost:3000
   ```

---

## 🧪 Testes e Validação de Código

Para executar os testes unitários e de integração:

```bash
npm run test
```

Para validar a tipagem estática do TypeScript:

```bash
npm run typecheck
```

Para verificar regras de formatação e linting:

```bash
npm run lint
```

Para gerar o bundle de produção otimizado:

```bash
npm run build
```

---

## 🚀 Deploy e Hospedagem Contínua (GitHub Pages)

O RedijaApp é hospedado como aplicação estática de custo zero via **GitHub Pages**, com deploy automatizado pelo **GitHub Actions** a cada alteração aprovada na branch `main`.

- **Domínio oficial:** `https://app.redija.com.br`
- **Workflow:** `.github/workflows/deploy.yml`
- **Configuração de DNS (CNAME):** O subdomínio `app` aponta via registro CNAME para `candeias-vinicius.github.io`.
- **Certificado SSL / HTTPS:** Gerado e renovado automaticamente de forma gratuita pelo GitHub Pages (Let's Encrypt).
- **Segredos necessários no GitHub Actions:**
  - `VITE_GOOGLE_CLIENT_ID`: ID do cliente OAuth 2.0 cadastrado no Google Cloud Console com o domínio `https://app.redija.com.br` liberado em Origens JavaScript autorizadas.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](file:///c:/Users/vinic/.gemini/antigravity/scratch/redija-app/LICENSE) para obter mais informações.
