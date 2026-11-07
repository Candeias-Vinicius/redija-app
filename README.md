# ✍️ RedijaApp

> **Editor acadêmico visual moderno, colaborativo e automatizado com conformidade estrita às normas da ABNT e motor tipográfico Typst WASM.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Typst](https://img.shields.io/badge/Engine-Typst_WASM-239dad.svg)](https://typst.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 A Proposta

Escrever trabalhos acadêmicos no Brasil (TCCs, dissertações, teses e artigos) costuma ser um processo exaustivo e burocrático:
* **No Word:** Alunos perdem dias lutando com margens (3-3-2-2 cm), numeração romana/arábica de páginas, sumários desajustados e formatação manual de referências.
* **No Overleaf / LaTeX:** A alta complexidade sintática e mensagens de erro de compilação afastam a grande maioria dos pesquisadores e estudantes.

O **RedijaApp** elimina essa barreira: uma **interface visual limpa estilo Notion**, orientada a blocos com formatação rica e arrastar-e-soltar, impulsionada pelo motor **Typst compilado em WebAssembly (WASM)** rodando diretamente no navegador do usuário. Você apenas escreve o conteúdo; o RedijaApp cuida de 100% da diagramação normativa em tempo real, sem custos de servidores de compilação.

---

## ✨ Funcionalidades do Sistema

### 1. Editor Visual Modular em Blocos (Estilo Notion)
* **Estrutura por Blocos:** Crie e organize o conteúdo através de blocos modulares sem ver ou editar código-fonte.
* **Títulos Hierárquicos ABNT:** Suporte completo a seções primárias (H1 numerado), secundárias (H2), terciárias (H3), quaternárias (H4), quinárias (H5) e títulos não numerados (ex.: Resumo, Introdução, Referências).
* **Formatação Rica (TipTap):** Negrito, itálico, sublinhado, sobrescrito e subscrito com atalhos de teclado.
* **Citação Direta Curta (NBR 10520):** Diálogo integrado para inserir citações no corpo do texto conectadas às referências cadastradas, com indicação de página e ano.
* **Citação Direta Longa (+ de 3 linhas):** Bloco dedicado com recuo automático de 4 cm da margem esquerda, fonte tamanho 10 pt e espaçamento entrelinhas simples.
* **Equações Matemáticas:** Renderização de fórmulas matemáticas com notação Typst e opção de numeração sequencial à direita.
* **Blocos de Código:** Apresentação de código com destaque de sintaxe (*syntax highlighting*) configurável por linguagem.
* **Figuras e Imagens:** Upload com pré-visualização, controle de largura (50%, 75% ou 100%), legenda superior e fonte inferior conforme exigido pela ABNT.
* **Tabelas Acadêmicas:** Tabelas padronizadas (normas do IBGE / ABNT), com linhas horizontais abertas nas laterais, cabeçalho e fonte.
* **Quadros:** Estruturas fechadas com grade completa para dados qualitativos, com legenda e fonte.
* **Notas de Rodapé & Quebras de Página:** Adicione notas numeradas e force quebras de página explícitas quando necessário.
* **Reorganização Dinâmica:** Arraste e solte (*drag and drop*) blocos para reposicionar seções instantaneamente.
* **Histórico Completo de Edição:** Desfazer e refazer (Undo / Redo) acessíveis por botões na barra de ferramentas ou atalhos (`Ctrl+Z` / `Ctrl+Y`).

---

### 2. Normatização e Formatação ABNT 100% Automática
* **Margens Oficiais:** Configuração estrita de 3 cm (superior e esquerda) e 2 cm (inferior e direita).
* **Tipografia Acadêmica:** Escolha entre fontes padrão *serif* (Times New Roman) e *sans-serif* (Arial), com corpo de texto em 12 pt e notas/legendas em 10 pt.
* **Espaçamento e Indentação:** Espaçamento 1,5 entre linhas no corpo do texto e recuo de parágrafo automático de 1,25 cm.
* **Predefinições Normativas (Presets):**
  * *ABNT Clássica* (Monografias e Teses).
  * *ABNT 2023* (Atualizações normativas recentes).
  * *Artigo em 2 Colunas* (Formato acadêmico para periódicos e conferências).
  * *APA 7ª Edição* (Padrão internacional).
  * *Configuração Customizada* (Ajuste fino de margens, colunas e estilos).
* **Modelos Prontos para Uso:** Crie projetos a partir de templates estruturados para **TCC / Monografia**, **Artigo Científico**, **Relatório Técnico**, **Projeto de Pesquisa** ou comece com um **Documento em Branco**.

---

### 3. Elementos Pré-Textuais e Pós-Textuais (NBR 14724)
* **Capa Personalizada:** Diagramação institucional automática com inclusão opcional de brasão ou logotipo.
* **Folha de Rosto:** Formatação com autor, título, subtítulo, nota de apresentação (natureza do trabalho), instituição, orientador e coorientador.
* **Folha de Aprovação:** Geração de página formal de avaliação com data de aprovação e lista de membros da banca examinadora com linhas de assinatura.
* **Páginas Especiais:** Seções dedicadas para Dedicatória, Agradecimentos e Epígrafe com autoria.
* **Resumo e Abstract:** Resumo vernáculo com lista de palavras-chave e versão em língua estrangeira (*Abstract*) com *keywords*.
* **Sumário e Listas Automáticas:** Sumário geral gerado dinamicamente pelo Typst, além de Listas de Figuras, Listas de Tabelas e Listas de Quadros.
* **Seções Pós-Textuais:** Campos dedicados para Lista de Abreviaturas e Siglas, Símbolos, Glossário, Apêndices e Anexos.

---

### 4. Gerenciador Bibliográfico Inteligente (NBR 6023)
* **Cadastro Estruturado por Tipo:** Suporte a Livros, Artigos de Periódicos, Teses/Dissertações, Páginas da Web e Documentos Legislativos.
* **Busca e Autopreenchimento por DOI:** Integração com a API pública da CrossRef: basta colar o código DOI para que título, autores, revista, volume, páginas e ano sejam preenchidos em segundos.
* **Ordenação Alfabética e Destaque:** Ordenação automática por sobrenome do autor e formatação do título com destaque configurável (Negrito ou Itálico) e estilo de citação (Caixa Alta `SOBRENOME, Ano` ou `Sobrenome, Ano`).

---

### 5. Compilação Typst WASM no Navegador (Zero Servidor)
* **Compilação Instantânea em WebAssembly:** Compilação do código Typst diretamente na máquina do usuário via `@myriaddreamin/typst.ts` operando em um Web Worker isolado.
* **Pré-visualização Interativa do PDF:** Visualizador do documento renderizado lado a lado com controle de zoom (50% a 200%), navegação de páginas e ajuste dinâmico de layout (painel divido ou tela cheia).
* **Painel de Diagnósticos:** Detecção de alertas e erros de sintaxe tipográfica em tempo real sem interrupção do fluxo de trabalho.

---

### 6. Arquitetura Local-First & Nuvem Pessoal (Google Drive BYOS)
* **Persistência Local (IndexedDB):** Todos os rascunhos e imagens são mantidos localmente via Dexie.js, garantindo funcionamento ininterrupto mesmo sem conexão com a internet.
* **Bring Your Own Storage (BYOS):** Seus dados pertencem a você. O RedijaApp integra-se à conta pessoal do Google Drive do usuário via Google Identity Services (OAuth2).
* **Armazenamento Transparente:** Os arquivos de projeto (`.redija`) são salvos diretamente no Google Drive do usuário, sem necessidade de servidores proprietários de banco de dados.
* **Gestão de Sessão Segura:** Tokens OAuth2 mantidos em memória RAM (protegidos contra ataques XSS), consentimento persistido sem caixas de diálogo repetidas em logins subsequentes e opção de logout seguro.
* **Modo Convidado (Offline/Sem Conta):** Acesso completo a todas as ferramentas de edição e exportação sem necessidade de autenticação.

---

### 7. Colaboração em Tempo Real & Concorrência Inteligente
* **Colaboração em Tempo Real P2P (WebRTC + BroadcastChannel):** Comunicação peer-to-peer direta entre colaboradores via canais de dados WebRTC (PeerJS) e BroadcastChannel (para abas no mesmo computador), sem latência e sem tráfego de servidores intermediários.
* **Indicadores Visuais de Presença:**
  * Indicador pulsante no cabeçalho com contagem de usuários ativos (`● 2 online`) e avatares com fotos de perfil.
  * Contorno luminoso e etiquetas flutuantes `"[Nome] está aqui"` no bloco que outro colaborador estiver visualizando ou digitando.
* **Mesclagem Automática por Blocos (Auto-Merge):** Resolução inteligente de concorrência com base em marcas temporais (`updatedAt`) por bloco. Se dois autores editarem o documento em horários ou conexões diferentes, as alterações são mescladas de maneira não destrutiva, sem perda de parágrafos nem duplicatas de referências.
* **Compartilhamento Nativo via Google Drive:** Compartilhe projetos diretamente com orientadores e colegas através do modal integrado, definindo permissões de Leitor ou Editor via Google Drive Permissions API.

---

### 8. Gestão de Projetos e Exportação
* **Gerenciador de Múltiplos Trabalhos:** Alterne facilmente entre diferentes projetos acadêmicos salvos localmente e no Drive.
* **Exportação Versátil:**
  * **PDF ABNT (.pdf):** Documento final pronto para impressão ou submissão à banca.
  * **Código-Fonte Typst (.typ):** Arquivo-fonte puro para uso e compilação externa no CLI do Typst.
  * **Backup Redija (.redija):** Arquivo JSON portátil contendo todos os blocos, metadados, imagens e configurações do projeto.
* **Métricas do Documento:** Painel com contagem em tempo real de caracteres, palavras, estimativa de páginas A4 e tamanho total de imagens embutidas.
* **Configurações de Conta e Privacidade:** Indicador de projetos locais vs. projetos na nuvem, opção para revogação explícita de permissões do Google e funcionalidade de exclusão total de dados do Drive com confirmação por texto de segurança.

---

## 🏗️ Arquitetura do Sistema

```
                        ┌──────────────────────────────────────────────┐
                        │              Interface do Usuário            │
                        │       (React 18 + Tailwind CSS + TipTap)     │
                        └──────────────────────┬───────────────────────┘
                                               │
                   ┌───────────────────────────┼───────────────────────────┐
                   ▼                           ▼                           ▼
        ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
        │  IndexedDB (Dexie)  │     │ Transpilador Typst  │     │ Colaboração P2P     │
        │ Cache Local-First   │     │ (Gera marcação .typ)│     │ WebRTC + Broadcast  │
        └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
                   │                           │                           │
                   ▼                           ▼                           ▼
        ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
        │ Google Drive v3 API │     │   Typst WASM Worker │     │ Presença e Cursors  │
        │ Armazenamento BYOS  │     │  PDF Nativo em ms   │     │  Sincronia ao Vivo  │
        └─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## 📁 Estrutura do Repositório

```
redija-app/
├── public/                      # Assets estáticos e scripts de terceiros
├── src/
│   ├── components/              # Componentes de interface do usuário
│   │   ├── AccountSettingsModal.tsx  # Configurações da conta e privacidade
│   │   ├── Editor.tsx           # Editor visual em blocos e presença
│   │   ├── Header.tsx           # Barra superior (h-14), status e menu Ferramentas
│   │   ├── LoginScreen.tsx      # Tela de autenticação e boas-vindas
│   │   ├── Preview.tsx          # Pré-visualização do PDF Typst WASM
│   │   ├── ProjectModal.tsx     # Gerenciamento e seleção de projetos
│   │   ├── ReferenceModal.tsx   # Cadastro de referências e busca por DOI
│   │   ├── RichTextInput.tsx    # Editor de texto rico TipTap
│   │   ├── ShareModal.tsx       # Compartilhamento via Google Drive API
│   │   └── Sidebar.tsx          # Configurações ABNT, metadados e sumário
│   ├── core/
│   │   ├── auth/                # Google Identity Services (OAuth2 Client)
│   │   ├── collaboration/       # Motor P2P WebRTC e BroadcastChannel
│   │   ├── storage/             # IndexedDB (Dexie), Google Drive v3 e Auto-Merge
│   │   ├── transpiler/          # Conversor de blocos JSON para marcação Typst
│   │   └── typst/               # Worker de compilação Typst WASM no navegador
│   ├── types/                   # Tipagens TypeScript (Documento, Blocos, Normas)
│   ├── App.tsx                  # Orquestrador principal de estado da aplicação
│   └── main.tsx                 # Ponto de entrada React
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **npm** (ou **pnpm** / **yarn**)

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

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](file:///c:/Users/vinic/.gemini/antigravity/scratch/redija-app/LICENSE) para obter mais informações.
