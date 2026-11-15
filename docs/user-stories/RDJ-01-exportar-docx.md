# RDJ-01 — Exportar para Word (.docx)

<!-- issue: {"id":"RDJ-01","type":"Feature","labels":["epic","categoria: essencial","prioridade: P1","esforco: M","area: storage"],"ciclo":1} -->
## [RDJ-01] Épico: Exportar o trabalho para Word (.docx)

> **Épico** · 🔥 Essencial · Prioridade **P1** · Esforço **M** · Ciclo 1 (Aquisição)

### Contexto / User Story

- **Como um** estudante que precisa entregar ou enviar o trabalho em Word,
- **Eu quero** baixar meu trabalho em `.docx` com a formatação preservada,
- **Para que** eu atenda ao orientador, à secretaria ou ao programa de pós sem abandonar o Redija.

### Problema

Muitos orientadores, secretarias e programas de pós exigem a entrega ou a revisão em `.docx`. Hoje o estudante que ouve "me manda em Word" abandona o Redija, ou nem começa a usá-lo. A exportação remove a objeção nº 1 de adoção ("e se eu precisar do Word depois?").

### Histórias (sub-issues)

- RDJ-01.1 · Baixar o trabalho em .docx com a estrutura e a formatação da norma
- RDJ-01.2 · Preservar tabelas, figuras e legendas no .docx
- RDJ-01.3 · Exportar equações editáveis para o Word
- RDJ-01.4 · Exportar citações e referências no padrão da norma para o .docx

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Um projeto criado a partir de cada um dos 9 modelos iniciais exporta para `.docx` e abre sem erro no Word e no LibreOffice.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero (ou dentro do Railway existente).

### Fora de escopo (v1)

- Reimportar sem perdas um `.docx` editado no Word (já existe um importador separado).
- Capa com layout idêntico ao PDF, pixel a pixel.

### Métrica de sucesso

Porcentagem de projetos ativos que exportam `.docx` e queda nos feedbacks do tipo "preciso entregar em Word".

### Dependências / Informações Técnicas

- N/A (não depende de outros épicos).

---

<!-- issue: {"id":"RDJ-01.1","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: infra"],"ciclo":1} -->
## [RDJ-01.1] Baixar o trabalho em .docx com a estrutura e a formatação da norma

### Contexto / User Story

- **Como um** estudante que precisa entregar o trabalho em Word,
- **Eu quero** baixar meu projeto em `.docx` com títulos, parágrafos, listas e ênfases preservados nas medidas da norma,
- **Para que** eu entregue ao orientador ou à secretaria sem refazer a formatação no Word.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Exportação com sucesso**
  - **Dado que** tenho um projeto aberto com conteúdo,
  - **Quando** clico em "Baixar .docx" no menu de exportação,
  - **Então** o navegador baixa o arquivo `<nome-do-projeto>.docx`, que abre no Word e no LibreOffice sem aviso de arquivo corrompido.
- [ ] **Cenário 2: Títulos viram estilos do Word**
  - **Dado que** meu projeto tem títulos de nível 1, 2 e 3,
  - **Quando** abro o `.docx` no Word,
  - **Então** os títulos usam os estilos nativos Título 1, Título 2 e Título 3, e o recurso "Sumário automático" do Word os reconhece.
- [ ] **Cenário 3: Formatação de texto preservada**
  - **Dado que** o texto tem negrito, itálico, sublinhado, sobrescrito, subscrito, listas numeradas e listas com marcadores,
  - **Quando** exporto para `.docx`,
  - **Então** todos esses elementos aparecem com a mesma formatação no arquivo.
- [ ] **Cenário 4: Layout da norma aplicado**
  - **Dado que** o projeto usa a norma ABNT,
  - **Quando** exporto para `.docx`,
  - **Então** o documento tem margens 3/2/3/2 cm, fonte de 12 pt e entrelinha 1,5, e projetos de outras normas recebem as medidas do próprio preset.
- [ ] **Cenário 5: Aviso de conversão**
  - **Dado que** é a primeira vez que exporto para `.docx`,
  - **Quando** o download termina,
  - **Então** vejo o aviso "O .docx é uma conversão. O PDF continua sendo a versão de referência do seu trabalho", com a opção "Não mostrar novamente".
- [ ] **Cenário 6: Serviço de conversão indisponível**
  - **Dado que** estou offline ou o serviço de conversão não responde,
  - **Quando** clico em "Baixar .docx",
  - **Então** vejo uma mensagem de erro clara com a opção "Tentar novamente", e nenhum arquivo parcial é baixado.

### Regras de Negócio e Restrições

- [ ] O botão "Baixar .docx" fica junto da exportação de PDF (Header ou menu de exportação).
- [ ] O nome do arquivo é o nome do projeto sem caracteres inválidos para sistemas de arquivos.
- [ ] Elementos ainda não cobertos (tabelas, figuras, equações, citações) não quebram a exportação: saem como texto simples até a entrega das histórias RDJ-01.2 a RDJ-01.4.
- [ ] O serviço de conversão não persiste arquivos: segue a mesma política de pasta temporária do endpoint `/convert`.
- [ ] Um trabalho de cerca de 60 páginas exporta em até 10 segundos.

### Dependências / Informações Técnicas

- A abordagem técnica fica com o time e deve ser registrada nesta issue antes do início. O backlog recomenda a opção **(B)**: serializar o projeto em Pandoc AST/Markdown e criar `POST /export` no serviço `server/` (Railway), com um `reference.docx` por norma para os estilos. A alternativa **(A)** é gerar o arquivo no navegador com a lib [`docx`](https://www.npmjs.com/package/docx) (MIT), sem servidor.
- Arquivos relacionados: `server/src/convert.ts`, `server/src/pandoc.ts`, `src/components/Header.tsx`.

---

<!-- issue: {"id":"RDJ-01.2","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage"],"ciclo":1} -->
## [RDJ-01.2] Preservar tabelas, figuras e legendas no .docx

### Contexto / User Story

- **Como um** estudante que entrega o trabalho em Word,
- **Eu quero** que minhas tabelas, figuras e legendas cheguem ao `.docx` como no PDF,
- **Para que** eu não precise reinserir imagens nem refazer tabelas no Word.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Tabela nativa e editável**
  - **Dado que** o projeto tem uma tabela com linha de cabeçalho,
  - **Quando** exporto para `.docx`,
  - **Então** a tabela aparece como tabela nativa do Word, editável, com o mesmo número de linhas e colunas e o cabeçalho destacado.
- [ ] **Cenário 2: Figura com uma imagem**
  - **Dado que** o projeto tem uma figura com legenda e fonte,
  - **Quando** exporto para `.docx`,
  - **Então** a imagem fica embutida no arquivo, com a legenda acima ("Figura 1 – …") e a fonte abaixo, como no PDF.
- [ ] **Cenário 3: Figura com várias imagens**
  - **Dado que** o projeto tem uma figura com 2 a 4 imagens,
  - **Quando** exporto para `.docx`,
  - **Então** as imagens ficam agrupadas na mesma figura, na mesma disposição do PDF, com legenda e fonte únicas.
- [ ] **Cenário 4: Imagem maior que a página**
  - **Dado que** uma imagem é mais larga que a área útil da página,
  - **Quando** exporto para `.docx`,
  - **Então** ela é redimensionada para caber na largura útil, mantendo a proporção.
- [ ] **Cenário 5: Imagem ausente ou corrompida**
  - **Dado que** uma imagem do projeto não pode ser lida,
  - **Quando** exporto para `.docx`,
  - **Então** a exportação conclui, o lugar da imagem mostra o texto "[imagem indisponível]" e o aviso final lista a figura afetada.

### Regras de Negócio e Restrições

- [ ] As legendas usam o estilo "Legenda" do Word, para que o usuário gere a lista de figuras e de tabelas automaticamente.
- [ ] A numeração de figuras e tabelas é igual à do PDF.
- [ ] As imagens mantêm a resolução original, sem recompressão perceptível.

### Dependências / Informações Técnicas

- Depende de RDJ-01.1.
- Figuras com até 4 imagens foram introduzidas na v0.3.0-beta (bloco de figura em `src/components/editor/blocks`).

---

<!-- issue: {"id":"RDJ-01.3","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: transpiler"],"ciclo":1} -->
## [RDJ-01.3] Exportar equações editáveis para o Word

### Contexto / User Story

- **Como um** estudante de exatas que entrega o trabalho em Word,
- **Eu quero** que as equações cheguem ao `.docx` como equações nativas e editáveis,
- **Para que** meu orientador possa corrigi-las no Word sem que eu precise redigitá-las.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Equação em bloco**
  - **Dado que** o projeto tem uma equação em bloco,
  - **Quando** exporto para `.docx` e abro no Word,
  - **Então** a equação é um objeto de equação nativo (OMML), editável pelo editor de equações do Word.
- [ ] **Cenário 2: Equação no meio do parágrafo**
  - **Dado que** um parágrafo tem uma equação inline,
  - **Quando** exporto para `.docx`,
  - **Então** a equação aparece na mesma posição do texto, como equação nativa inline.
- [ ] **Cenário 3: Numeração preservada**
  - **Dado que** as equações em bloco são numeradas no PDF,
  - **Quando** exporto para `.docx`,
  - **Então** cada equação mantém o mesmo número, alinhado à direita.
- [ ] **Cenário 4: Equação que não pode ser convertida**
  - **Dado que** uma equação usa uma construção que o conversor não suporta,
  - **Quando** exporto para `.docx`,
  - **Então** a exportação conclui, a equação sai como texto com o código original e o aviso final informa "N equações não puderam ser convertidas", com a localização de cada uma.

### Regras de Negócio e Restrições

- [ ] Equações nunca são exportadas como imagem.
- [ ] Equações que abrem no Word também abrem no LibreOffice Writer.

### Dependências / Informações Técnicas

- Depende de RDJ-01.1.
- O Pandoc converte matemática para OMML nativo. Verificar a sintaxe de origem das equações no editor (`InlineMathNodeView.tsx`) e o suporte do leitor Typst do Pandoc a ela.

---

<!-- issue: {"id":"RDJ-01.4","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: references"],"ciclo":1} -->
## [RDJ-01.4] Exportar citações e referências no padrão da norma para o .docx

### Contexto / User Story

- **Como um** estudante que entrega o trabalho em Word,
- **Eu quero** que as citações e a lista de referências saiam no `.docx` exatamente como no PDF,
- **Para que** o trabalho continue dentro da norma mesmo fora do Redija.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Citação autor-data (ABNT)**
  - **Dado que** o projeto ABNT tem a citação "(SILVA, 2020, p. 15)" no PDF,
  - **Quando** exporto para `.docx`,
  - **Então** a citação aparece no mesmo lugar e com o mesmo texto.
- [ ] **Cenário 2: Citação numérica (IEEE/SBC)**
  - **Dado que** o projeto usa uma norma com citação numérica,
  - **Quando** exporto para `.docx`,
  - **Então** as citações aparecem como no PDF (ex.: "[1]") e a numeração bate com a lista de referências.
- [ ] **Cenário 3: Lista de referências**
  - **Dado que** o projeto tem referências cadastradas,
  - **Quando** exporto para `.docx`,
  - **Então** a lista de referências aparece no final com a mesma ordem, os mesmos destaques (ex.: título em negrito na NBR 6023), o mesmo alinhamento e o mesmo espaçamento do PDF.
- [ ] **Cenário 4: Citação de referência inexistente**
  - **Dado que** uma citação aponta para uma referência que não existe mais,
  - **Quando** exporto para `.docx`,
  - **Então** a citação sai com a mesma marcação de erro do PDF e o aviso final lista a citação afetada.

### Regras de Negócio e Restrições

- [ ] O texto das citações e referências vem do mesmo formatador usado no PDF (fonte única de verdade), para que os dois formatos nunca divirjam.
- [ ] As citações são exportadas como texto, não como campos do Word ou do Zotero.

### Dependências / Informações Técnicas

- Depende de RDJ-01.1.
- Relacionado: `CitationNodeView.tsx`, `citationRenderContext.ts`, `SidebarReferencesSection.tsx`.
