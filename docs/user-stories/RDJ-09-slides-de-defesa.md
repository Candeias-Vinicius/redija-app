# RDJ-09 — Do TCC aos Slides de Defesa em 1 Clique

<!-- issue: {"id":"RDJ-09","type":"Feature","labels":["epic","categoria: inovacao","prioridade: P2","esforco: G","area: transpiler","area: templates"],"ciclo":2} -->
## [RDJ-09] Épico: Do TCC aos slides de defesa em 1 clique

> **Épico** · 💡 Inovação · Prioridade **P2** · Esforço **G** · Ciclo 2 (Retenção e viralidade)

### Contexto / User Story

- **Como um** estudante que acabou de entregar o TCC,
- **Eu quero** gerar automaticamente uma apresentação de defesa a partir do meu trabalho, com a mesma identidade visual,
- **Para que** eu só ajuste os slides, em vez de começar do zero no PowerPoint.

### Problema

Depois de entregar o TCC, o estudante tem poucos dias para montar a apresentação da banca e recomeça do zero, copiando textos e figuras.

**Valor:** efeito "uau" que nenhum concorrente direto oferece. Transforma o Redija na "ferramenta do TCC inteiro", da escrita à defesa, e rende ótimo conteúdo de divulgação.

### Histórias (sub-issues)

- RDJ-09.1 · Spike: escolher o pacote Typst de slides
- RDJ-09.2 · Gerar slides de defesa a partir do meu trabalho
- RDJ-09.3 · Editar os slides gerados no editor de blocos
- RDJ-09.4 · Inserir figuras e tabelas do trabalho nos slides
- RDJ-09.5 · Escolher o tema visual e a proporção dos slides
- RDJ-09.6 · Exportar a apresentação em PDF, inclusive offline
- RDJ-09.7 · Gerar um pôster a partir do meu trabalho

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente (RDJ-09.7 pode ficar para depois, por ter prioridade P3).
- [ ] Um TCC criado a partir do modelo inicial gera slides, é editado e exportado em PDF sem erros.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero (compilação no WASM local).

### Fora de escopo (v1)

- Exportação em `.pptx` (avaliar na v2).
- Resumo das seções com IA (v2, depende de RDJ-10).

### Métrica de sucesso

Porcentagem de projetos TCC que geram slides e menções em redes sociais.

### Dependências / Informações Técnicas

- Nenhuma obrigatória. Melhora com RDJ-10 (resumo com IA) e RDJ-04 (cache offline do pacote).

---

<!-- issue: {"id":"RDJ-09.1","type":"Task","labels":["spike","categoria: inovacao","prioridade: P2","esforco: P","area: transpiler"],"ciclo":2} -->
## [RDJ-09.1] Spike: escolher o pacote Typst de slides

### Contexto / User Story

- **Como um** time de desenvolvimento,
- **Eu quero** comparar os pacotes Typst de slides e validar a compilação no WASM local,
- **Para que** a geração de slides seja construída sobre uma base compatível, leve e com licença adequada.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Comparação documentada**
  - **Dado que** os candidatos são **touying** e **polylux**,
  - **Quando** o spike termina,
  - **Então** há um ADR em `docs/` comparando licença (compatível com AGPL-3.0), compatibilidade com o compilador WASM atual (`typst.ts` 0.7), temas disponíveis, tamanho do download e manutenção.
- [ ] **Cenário 2: Prova de conceito**
  - **Dado que** um pacote foi escolhido,
  - **Quando** a prova de conceito roda no app,
  - **Então** compila 5 slides com título, tópicos e uma figura, pelo Typst Universe (`universeResolver`).
- [ ] **Cenário 3: Uso offline**
  - **Dado que** o pacote já foi baixado uma vez,
  - **Quando** compilo sem internet,
  - **Então** a compilação funciona com o pacote em cache.

### Regras de Negócio e Restrições

- [ ] Timebox de 3 dias.
- [ ] A entrega é o ADR com a recomendação, não a funcionalidade pronta.

### Dependências / Informações Técnicas

- Relacionado: `src/core/universe/`, `src/core/typst/`.

---

<!-- issue: {"id":"RDJ-09.2","type":"Task","labels":["user story","categoria: inovacao","prioridade: P2","esforco: M","area: transpiler","area: templates"],"ciclo":2} -->
## [RDJ-09.2] Gerar slides de defesa a partir do meu trabalho

### Contexto / User Story

- **Como um** estudante que vai defender o TCC,
- **Eu quero** gerar com um clique uma apresentação a partir do meu trabalho,
- **Para que** eu tenha um rascunho completo e só precise ajustá-lo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Gerar a apresentação**
  - **Dado que** tenho um projeto TCC ou artigo aberto,
  - **Quando** clico em "Gerar slides de defesa",
  - **Então** um novo projeto do tipo Apresentação é criado e aberto, e o projeto original não muda.
- [ ] **Cenário 2: Capa**
  - **Dado que** preenchi os campos de identificação do trabalho,
  - **Quando** a apresentação é gerada,
  - **Então** a capa traz título, autor, orientador e instituição.
- [ ] **Cenário 3: Um slide por seção**
  - **Dado que** o trabalho tem seções de nível 1,
  - **Quando** a apresentação é gerada,
  - **Então** cada seção vira um slide com o título dela e até 5 tópicos extraídos das primeiras frases dos parágrafos.
- [ ] **Cenário 4: Encerramento**
  - **Dado que** a apresentação foi gerada,
  - **Quando** chego ao final dela,
  - **Então** há um slide de agradecimentos e um com até 5 referências citadas no trabalho.
- [ ] **Cenário 5: Trabalho sem seções**
  - **Dado que** o trabalho não tem títulos de nível 1,
  - **Quando** gero os slides,
  - **Então** a apresentação tem capa e um slide único, com um aviso explicando o motivo.
- [ ] **Cenário 6: Tipo não suportado**
  - **Dado que** o projeto é um pôster ou uma apresentação,
  - **Quando** abro o menu,
  - **Então** a opção "Gerar slides de defesa" não aparece.

### Regras de Negócio e Restrições

- [ ] O projeto original nunca é modificado.
- [ ] A apresentação guarda o vínculo com o projeto de origem e mostra "Gerado a partir de <nome do projeto>".
- [ ] Gerar de novo cria outra apresentação, sem sobrescrever a anterior.
- [ ] Um trabalho de cerca de 60 páginas gera a apresentação em até 3 segundos.

### Dependências / Informações Técnicas

- Depende de RDJ-09.1.
- Relacionado: `src/core/storage/projectTemplates.ts` (novo tipo Apresentação).

---

<!-- issue: {"id":"RDJ-09.3","type":"Task","labels":["user story","categoria: inovacao","prioridade: P2","esforco: M","area: editor"],"ciclo":2} -->
## [RDJ-09.3] Editar os slides gerados no editor de blocos

### Contexto / User Story

- **Como um** estudante ajustando a apresentação de defesa,
- **Eu quero** editar os slides no mesmo editor de blocos que já conheço,
- **Para que** eu não precise aprender outra ferramenta.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Slides como blocos**
  - **Dado que** abri uma apresentação,
  - **Quando** vejo o editor,
  - **Então** cada slide aparece como uma seção editável, com título e conteúdo.
- [ ] **Cenário 2: Adicionar, remover e reordenar**
  - **Dado que** estou editando a apresentação,
  - **Quando** adiciono, removo ou arrasto um slide para outra posição,
  - **Então** a ordem e o conteúdo são atualizados na prévia.
- [ ] **Cenário 3: Prévia atualizada**
  - **Dado que** editei o texto de um slide,
  - **Quando** a prévia compila,
  - **Então** ela mostra a alteração no slide correspondente.

### Regras de Negócio e Restrições

- [ ] Os atalhos e o menu de comandos (`/`) funcionam nos slides.
- [ ] Só os blocos que fazem sentido em slides ficam disponíveis (ex.: sem folha de rosto).

### Dependências / Informações Técnicas

- Depende de RDJ-09.2.
- Relacionado: `src/components/Editor.tsx`, `src/components/editor/SlashCommandMenu.tsx`.

---

<!-- issue: {"id":"RDJ-09.4","type":"Task","labels":["user story","categoria: inovacao","prioridade: P2","esforco: P","area: editor"],"ciclo":2} -->
## [RDJ-09.4] Inserir figuras e tabelas do trabalho nos slides

### Contexto / User Story

- **Como um** estudante montando os slides de resultados,
- **Eu quero** inserir as figuras e tabelas que já estão no meu trabalho,
- **Para que** eu não precise exportar e reimportar imagens.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Figuras na geração**
  - **Dado que** uma seção do trabalho tem figuras ou tabelas,
  - **Quando** os slides são gerados,
  - **Então** a primeira figura ou tabela da seção entra no slide dela.
- [ ] **Cenário 2: Inserir manualmente**
  - **Dado que** estou editando um slide,
  - **Quando** escolho "Inserir figura do trabalho",
  - **Então** vejo a lista de figuras e tabelas do projeto de origem, com as legendas, e posso inserir qualquer uma.
- [ ] **Cenário 3: Figura com várias imagens**
  - **Dado que** a figura tem de 2 a 4 imagens,
  - **Quando** a insiro num slide,
  - **Então** a disposição das imagens é preservada.
- [ ] **Cenário 4: Original alterado**
  - **Dado que** inseri uma figura e depois a removi do trabalho original,
  - **Quando** abro a apresentação,
  - **Então** a figura continua no slide.

### Regras de Negócio e Restrições

- [ ] As imagens são copiadas para a apresentação (não ficam ligadas ao original).
- [ ] As cópias respeitam a cota de imagens existente.

### Dependências / Informações Técnicas

- Depende de RDJ-09.2 e RDJ-09.3.
- Relacionado: `src/core/storage/imageQuota.ts`.

---

<!-- issue: {"id":"RDJ-09.5","type":"Task","labels":["user story","categoria: inovacao","prioridade: P2","esforco: P","area: templates"],"ciclo":2} -->
## [RDJ-09.5] Escolher o tema visual e a proporção dos slides

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** escolher o tema visual e a proporção da apresentação,
- **Para que** ela combine com o projetor e com o estilo da minha banca.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Temas**
  - **Dado que** estou editando uma apresentação,
  - **Quando** abro as opções de tema,
  - **Então** vejo pelo menos 2 temas (sóbrio e institucional) e, ao escolher um, a prévia é atualizada.
- [ ] **Cenário 2: Proporção**
  - **Dado que** estou editando uma apresentação,
  - **Quando** escolho 16:9 ou 4:3,
  - **Então** todos os slides passam a usar a proporção escolhida.
- [ ] **Cenário 3: Conteúdo preservado**
  - **Dado que** troquei de tema ou de proporção,
  - **Quando** a prévia atualiza,
  - **Então** nenhum conteúdo é perdido.

### Regras de Negócio e Restrições

- [ ] 16:9 é a proporção padrão.
- [ ] Um tema escuro é opcional nesta história.

### Dependências / Informações Técnicas

- Depende de RDJ-09.2.

---

<!-- issue: {"id":"RDJ-09.6","type":"Task","labels":["user story","categoria: inovacao","prioridade: P2","esforco: P","area: transpiler"],"ciclo":2} -->
## [RDJ-09.6] Exportar a apresentação em PDF, inclusive offline

### Contexto / User Story

- **Como um** estudante no dia da defesa,
- **Eu quero** exportar a apresentação em PDF, mesmo sem internet,
- **Para que** eu a abra em qualquer computador da sala da banca.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Exportar PDF**
  - **Dado que** estou editando uma apresentação,
  - **Quando** clico em "Baixar PDF",
  - **Então** baixo um PDF com um slide por página, na proporção escolhida.
- [ ] **Cenário 2: Offline com pacote em cache**
  - **Dado que** o pacote de slides já foi baixado antes,
  - **Quando** exporto sem internet,
  - **Então** o PDF é gerado normalmente.
- [ ] **Cenário 3: Offline sem pacote em cache**
  - **Dado que** o pacote de slides nunca foi baixado,
  - **Quando** tento exportar sem internet,
  - **Então** vejo uma mensagem explicando que é preciso conectar uma vez para baixar o pacote.

### Regras de Negócio e Restrições

- [ ] O PDF é gerado localmente, no WASM, sem servidor.

### Dependências / Informações Técnicas

- Depende de RDJ-09.2.
- O cache offline depende de RDJ-04.2.

---

<!-- issue: {"id":"RDJ-09.7","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: templates","area: transpiler"],"ciclo":2} -->
## [RDJ-09.7] Gerar um pôster a partir do meu trabalho

### Contexto / User Story

- **Como um** estudante que vai apresentar o trabalho num congresso ou numa feira acadêmica,
- **Eu quero** gerar um pôster a partir do meu trabalho,
- **Para que** eu aproveite o conteúdo já escrito em vez de montar o pôster do zero.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Gerar o pôster**
  - **Dado que** tenho um projeto TCC ou artigo,
  - **Quando** clico em "Gerar pôster",
  - **Então** um novo projeto de pôster A0 é criado com título, autores, instituição, seções resumidas e as principais figuras.
- [ ] **Cenário 2: Validação do pôster**
  - **Dado que** o pôster foi gerado,
  - **Quando** o linter de pôster roda,
  - **Então** não há avisos de estrutura obrigatória ausente.
- [ ] **Cenário 3: Original preservado**
  - **Dado que** gerei o pôster,
  - **Quando** volto ao projeto original,
  - **Então** ele não foi alterado.

### Regras de Negócio e Restrições

- [ ] Usa o template de pôster A0 existente.
- [ ] Segue as mesmas regras de vínculo e cópia de RDJ-09.2 e RDJ-09.4.
- [ ] Prioridade P3: entra depois das demais histórias do épico.

### Dependências / Informações Técnicas

- Depende de RDJ-09.2 (mesma lógica de extração de conteúdo).
- Relacionado: `src/core/templates/poster.typ`, `src/core/transpiler/linters/posterLinter.ts`.
