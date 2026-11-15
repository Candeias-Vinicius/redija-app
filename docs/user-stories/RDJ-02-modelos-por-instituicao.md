# RDJ-02 — Modelos por Instituição (feitos pela comunidade)

<!-- issue: {"id":"RDJ-02","type":"Feature","labels":["epic","categoria: essencial","prioridade: P1","esforco: M","area: templates","area: landing"],"ciclo":1} -->
## [RDJ-02] Épico: Modelos por Instituição feitos pela comunidade

> **Épico** · 🔥 Essencial · Prioridade **P1** · Esforço **M** · Ciclo 1 (Aquisição)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** escolher o modelo da minha instituição ao criar um trabalho,
- **Para que** eu tenha certeza de que ele segue o manual de normalização que a minha banca vai cobrar.

### Problema

Cada universidade e IF tem seu manual de normalização, com variações sobre a ABNT: capa, ordem dos pré-textuais, folha de aprovação, recuos. O estudante não confia que o "ABNT genérico" atende à instituição dele.

**Valor:** aquisição orgânica (cada modelo vira uma página indexável, como "modelo de TCC ABNT IFSP"), confiança ("já tem o da minha faculdade") e escala sem custo (a comunidade contribui modelos por PR).

### Histórias (sub-issues)

- RDJ-02.1 · Definir o schema de modelo institucional
- RDJ-02.2 · Escolher minha instituição na tela "Novo Trabalho"
- RDJ-02.3 · Fazer os linters respeitarem as regras do modelo institucional
- RDJ-02.4 · Enviar o brasão da minha instituição para a capa
- RDJ-02.5 · Publicar páginas públicas e indexáveis para cada modelo
- RDJ-02.6 · Publicar o guia e o formulário para pedir ou enviar um modelo
- RDJ-02.7 · Modelo institucional: USP
- RDJ-02.8 · Modelo institucional: UNICAMP
- RDJ-02.9 · Modelo institucional: UFMG
- RDJ-02.10 · Modelo institucional: IFSP
- RDJ-02.11 · Modelo institucional: instituição particular de grande porte

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Pelo menos 5 modelos institucionais publicados e disponíveis na tela "Novo Trabalho" e em `/modelos`.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.
- [ ] **Jurídico:** brasões e logos de universidades são marcas. O repositório só embute um logo com autorização expressa ou licença clara. Na v1, o próprio usuário envia o brasão (RDJ-02.4).

### Métrica de sucesso

Tráfego orgânico nas páginas `/modelos/*`, porcentagem de projetos criados a partir de modelo institucional e número de modelos contribuídos pela comunidade.

### Dependências / Informações Técnicas

- N/A. Ganha força com RDJ-05 (checklist com itens por instituição).

---

<!-- issue: {"id":"RDJ-02.1","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: templates"],"ciclo":1} -->
## [RDJ-02.1] Definir o schema de modelo institucional

### Contexto / User Story

- **Como um** contribuidor da comunidade open source,
- **Eu quero** um formato documentado para descrever o modelo de uma instituição a partir de uma norma base,
- **Para que** eu adicione o modelo da minha faculdade sem precisar alterar o motor de templates.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Herança da norma base**
  - **Dado que** um modelo institucional declara `abnt_classic` como norma base e sobrescreve só as margens,
  - **Quando** um projeto é criado a partir dele,
  - **Então** o projeto usa as margens do modelo e todos os outros valores da norma base.
- [ ] **Cenário 2: Campos que o modelo pode sobrescrever**
  - **Dado que** um contribuidor escreve um modelo novo,
  - **Quando** consulta a documentação do schema,
  - **Então** encontra, com exemplo, como sobrescrever capa, folha de rosto, ordem dos elementos pré-textuais, margens, textos padrão (ex.: natureza do trabalho) e campos obrigatórios.
- [ ] **Cenário 3: Modelo inválido**
  - **Dado que** um modelo aponta para uma norma base inexistente, tem um campo desconhecido ou uma margem negativa,
  - **Quando** os testes rodam (localmente ou no CI),
  - **Então** a validação falha com uma mensagem que indica o arquivo e o campo com problema.
- [ ] **Cenário 4: Descoberta automática**
  - **Dado que** um contribuidor adiciona um arquivo de modelo válido na pasta de modelos,
  - **Quando** o app é compilado,
  - **Então** o modelo fica disponível sem registro manual em outro arquivo.

### Regras de Negócio e Restrições

- [ ] Todo modelo tem os metadados: nome da instituição, sigla, cidade/UF, tipos de trabalho cobertos, link do manual oficial, versão ou ano do manual e autor da contribuição.
- [ ] A validação do schema é coberta por testes Vitest que rodam no CI.
- [ ] O schema é documentado em Markdown, com um exemplo completo.
- [ ] Nenhum logo ou brasão é embutido no repositório sem autorização expressa.

### Dependências / Informações Técnicas

- Pasta sugerida: `src/core/templates/institutions/`.
- Relacionado: `src/core/storage/projectTemplates.ts`, `src/core/templates/fieldRegistry.ts`, `src/core/templates/templateCapabilities.ts`.

---

<!-- issue: {"id":"RDJ-02.2","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: templates","area: editor"],"ciclo":1} -->
## [RDJ-02.2] Escolher minha instituição na tela "Novo Trabalho"

### Contexto / User Story

- **Como um** estudante criando um trabalho novo,
- **Eu quero** informar minha instituição e ver os modelos dela em destaque,
- **Para que** eu comece já no padrão exigido pela minha faculdade.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Busca de instituição**
  - **Dado que** estou na tela "Novo Trabalho Acadêmico",
  - **Quando** digito parte do nome ou da sigla da instituição (ex.: "unicamp", "Campinas"),
  - **Então** vejo as instituições correspondentes, sem diferenciar maiúsculas nem acentos.
- [ ] **Cenário 2: Modelos em destaque**
  - **Dado que** selecionei uma instituição com modelos publicados,
  - **Quando** a lista de modelos é exibida,
  - **Então** os modelos da instituição aparecem primeiro, com selo de "Modelo da instituição", seguidos dos modelos genéricos.
- [ ] **Cenário 3: Projeto criado a partir do modelo**
  - **Dado que** escolhi um modelo institucional,
  - **Quando** crio o projeto,
  - **Então** ele já nasce com a capa, a folha de rosto, as margens e os textos padrão do modelo.
- [ ] **Cenário 4: Instituição sem modelo**
  - **Dado que** busquei uma instituição que ainda não tem modelo,
  - **Quando** a busca termina,
  - **Então** vejo "Ainda não temos o modelo da sua instituição", um link "Solicitar modelo" e os modelos genéricos.
- [ ] **Cenário 5: Campo opcional**
  - **Dado que** não informei instituição,
  - **Quando** escolho um modelo,
  - **Então** a tela funciona como hoje, sem nenhum bloqueio.

### Regras de Negócio e Restrições

- [ ] O campo "Sua instituição (opcional)" nunca bloqueia a criação do projeto.
- [ ] A última instituição escolhida fica salva no navegador e vem preenchida no próximo projeto.
- [ ] A instituição escolhida fica registrada no projeto.
- [ ] A busca acontece localmente e responde em menos de 100 ms com até 500 modelos.

### Dependências / Informações Técnicas

- Depende de RDJ-02.1.
- O link "Solicitar modelo" abre o formulário criado em RDJ-02.6.
- Tela existente: modal "Meus Trabalhos Acadêmicos" (`src/components/ProjectsModal.tsx`).

---

<!-- issue: {"id":"RDJ-02.3","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: transpiler","area: templates"],"ciclo":1} -->
## [RDJ-02.3] Fazer os linters respeitarem as regras do modelo institucional

### Contexto / User Story

- **Como um** estudante que usa o modelo da minha instituição,
- **Eu quero** que os avisos de formatação considerem as regras do manual da minha faculdade,
- **Para que** eu não receba falsos alertas nem deixe passar exigências da instituição.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Sobrescrita não gera falso positivo**
  - **Dado que** o modelo institucional define margens diferentes das da ABNT,
  - **Quando** o linter analisa o projeto,
  - **Então** nenhum aviso de margem é exibido.
- [ ] **Cenário 2: Campo obrigatório da instituição**
  - **Dado que** o modelo torna a folha de aprovação obrigatória e o projeto não a tem,
  - **Quando** o linter analisa o projeto,
  - **Então** aparece um aviso que cita a exigência do manual da instituição.
- [ ] **Cenário 3: Projeto sem modelo institucional**
  - **Dado que** o projeto não usa modelo institucional,
  - **Quando** o linter analisa o projeto,
  - **Então** o comportamento é idêntico ao atual.

### Regras de Negócio e Restrições

- [ ] Testes de regressão garantem que os 9 modelos iniciais continuam sem avisos novos.
- [ ] Há pelo menos um teste com um modelo institucional que sobrescreve margens e campos obrigatórios.

### Dependências / Informações Técnicas

- Depende de RDJ-02.1.
- Linters em `src/core/transpiler/linters/` (`abntLinter.ts`, `sbcLinter.ts`, `ieeeLinter.ts`, `posterLinter.ts`, `sanityLinter.ts`).

---

<!-- issue: {"id":"RDJ-02.4","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","area: sidebar"],"ciclo":1} -->
## [RDJ-02.4] Enviar o brasão da minha instituição para a capa

### Contexto / User Story

- **Como um** estudante cujo manual exige o brasão da instituição na capa,
- **Eu quero** enviar a imagem do brasão eu mesmo,
- **Para que** a capa siga o manual sem que o projeto distribua marcas de terceiros.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Envio do brasão**
  - **Dado que** o modelo do meu projeto prevê brasão na capa,
  - **Quando** envio uma imagem PNG, JPG ou SVG de até 2 MB no campo "Brasão da instituição" da seção de identificação,
  - **Então** o brasão aparece na capa do PDF, na posição e no tamanho definidos pelo modelo.
- [ ] **Cenário 2: Arquivo inválido**
  - **Dado que** escolhi um arquivo de outro formato ou maior que 2 MB,
  - **Quando** tento enviá-lo,
  - **Então** vejo uma mensagem explicando o formato e o tamanho aceitos, e nada é salvo.
- [ ] **Cenário 3: Capa sem brasão**
  - **Dado que** o modelo prevê brasão e eu não enviei nenhum,
  - **Quando** compilo o PDF,
  - **Então** a capa compila normalmente, sem espaço vazio no lugar do brasão.
- [ ] **Cenário 4: Reaproveitamento**
  - **Dado que** já enviei o brasão em um projeto da mesma instituição,
  - **Quando** crio um novo projeto com um modelo dessa instituição,
  - **Então** o brasão já vem preenchido.

### Regras de Negócio e Restrições

- [ ] O brasão fica no projeto (IndexedDB) e sincroniza pelo Drive do usuário. Nunca passa por servidor do projeto.
- [ ] A imagem respeita a cota de imagens existente.
- [ ] O usuário pode remover ou trocar o brasão a qualquer momento.

### Dependências / Informações Técnicas

- Depende de RDJ-02.1.
- Relacionado: `src/core/storage/imageQuota.ts`, `src/components/sidebar/SidebarIdentificationSection.tsx`.

---

<!-- issue: {"id":"RDJ-02.5","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: landing","area: infra"],"ciclo":1} -->
## [RDJ-02.5] Publicar páginas públicas e indexáveis para cada modelo

### Contexto / User Story

- **Como um** estudante que pesquisa no Google "modelo de TCC ABNT <minha instituição>",
- **Eu quero** encontrar uma página do modelo com prévia e um botão "Usar este modelo",
- **Para que** eu comece meu trabalho no padrão certo sem procurar arquivos de Word.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Página do modelo**
  - **Dado que** existe o modelo "TCC IFSP",
  - **Quando** acesso `/modelos/ifsp-tcc`,
  - **Então** vejo nome da instituição, tipo de trabalho, descrição, prévia da capa, link para o manual oficial e o botão "Usar este modelo".
- [ ] **Cenário 2: Conteúdo indexável**
  - **Dado que** um robô de busca acessa a página sem executar JavaScript,
  - **Quando** lê o HTML,
  - **Então** encontra o conteúdo completo, `title` e `meta description` próprios, URL canônica e tags Open Graph.
- [ ] **Cenário 3: Usar o modelo**
  - **Dado que** estou na página de um modelo,
  - **Quando** clico em "Usar este modelo",
  - **Então** o app abre e cria um projeto a partir dele (após o login, se necessário).
- [ ] **Cenário 4: Índice e sitemap**
  - **Dado que** o build terminou,
  - **Quando** acesso `/modelos` e `/sitemap.xml`,
  - **Então** a página `/modelos` lista todas as instituições com busca, e o sitemap inclui todas as páginas de modelo.
- [ ] **Cenário 5: Modelo inexistente**
  - **Dado que** acesso um slug que não existe,
  - **Quando** a página carrega,
  - **Então** vejo uma página 404 com link para `/modelos`.

### Regras de Negócio e Restrições

- [ ] Um modelo novo publicado gera sua página e entra no sitemap automaticamente, sem passo manual.
- [ ] As páginas de modelo têm nota de SEO ≥ 90 no Lighthouse.
- [ ] O slug segue o padrão `<sigla>-<tipo-de-trabalho>` em minúsculas e sem acentos.

### Dependências / Informações Técnicas

- Depende de RDJ-02.1.
- O app é uma SPA (Vite). Avaliar pré-renderização (`vite-ssg` ou geração estática no build).
- Ajustar rewrites em `netlify.toml` e `vercel.json`.

---

<!-- issue: {"id":"RDJ-02.6","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","documentation","good first issue"],"ciclo":1} -->
## [RDJ-02.6] Publicar o guia e o formulário para pedir ou enviar um modelo

### Contexto / User Story

- **Como um** estudante, mesmo sem saber programar,
- **Eu quero** pedir ou enviar o modelo da minha instituição por um formulário guiado,
- **Para que** a comunidade publique o modelo e outros alunos da minha faculdade se beneficiem.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Formulário de issue**
  - **Dado que** clico em "New issue" no repositório,
  - **Quando** a lista de formulários aparece,
  - **Então** vejo "Solicitar/Enviar modelo da minha instituição", com os campos instituição, sigla, cidade/UF, tipo de trabalho, link ou PDF do manual e observações.
- [ ] **Cenário 2: Labels automáticas**
  - **Dado que** preenchi e enviei o formulário,
  - **Quando** a issue é criada,
  - **Então** ela recebe a label `area: templates` automaticamente.
- [ ] **Cenário 3: Guia de contribuição técnica**
  - **Dado que** quero contribuir com código,
  - **Quando** abro o `CONTRIBUTING.md`,
  - **Então** encontro a seção "Como contribuir com um modelo institucional", com o passo a passo (schema, testes, prévia e PR).
- [ ] **Cenário 4: Atalho a partir do app**
  - **Dado que** busquei uma instituição sem modelo na tela "Novo Trabalho",
  - **Quando** clico em "Solicitar modelo",
  - **Então** o formulário abre no GitHub em uma nova aba.

### Regras de Negócio e Restrições

- [ ] Formulário e guia escritos em PT-BR.
- [ ] O guia inclui um checklist de revisão para mantenedores (conferir o PDF gerado contra o manual oficial).

### Dependências / Informações Técnicas

- O guia técnico depende de RDJ-02.1. O formulário pode ser publicado antes.
- Arquivos: `.github/ISSUE_TEMPLATE/modelo-institucional.yml` e `CONTRIBUTING.md`.

---

<!-- issue: {"id":"RDJ-02.7","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","good first issue"],"ciclo":1} -->
## [RDJ-02.7] Modelo institucional: USP

### Contexto / User Story

- **Como um** estudante da Universidade de São Paulo (USP),
- **Eu quero** criar meu trabalho com o modelo da USP,
- **Para que** ele atenda às diretrizes de apresentação de trabalhos da universidade.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Modelo encontrado**
  - **Dado que** estou na tela "Novo Trabalho",
  - **Quando** busco por "USP" ou "Universidade de São Paulo",
  - **Então** o modelo da USP aparece em destaque.
- [ ] **Cenário 2: Projeto no padrão do manual**
  - **Dado que** criei um projeto com o modelo da USP,
  - **Quando** compilo o PDF,
  - **Então** capa, folha de rosto, folha de aprovação (se exigida), ordem dos pré-textuais e margens seguem o manual vigente.
- [ ] **Cenário 3: Sem falso positivo**
  - **Dado que** o projeto foi criado com o modelo da USP e não foi alterado,
  - **Quando** os linters rodam,
  - **Então** nenhum aviso de formatação é exibido.

### Regras de Negócio e Restrições

- [ ] O modelo registra o link e a versão ou o ano do manual oficial usado como base.
- [ ] O PR traz prints do PDF gerado ao lado das páginas correspondentes do manual.
- [ ] O PR informa quais tipos de trabalho o modelo cobre (ex.: dissertação, tese, TCC).
- [ ] Nenhum brasão é embutido no repositório: o usuário envia o dele (RDJ-02.4).

### Dependências / Informações Técnicas

- Depende de RDJ-02.1. Se o manual exigir brasão, depende também de RDJ-02.4.
- Siga o guia de RDJ-02.6.

---

<!-- issue: {"id":"RDJ-02.8","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","good first issue"],"ciclo":1} -->
## [RDJ-02.8] Modelo institucional: UNICAMP

### Contexto / User Story

- **Como um** estudante da Universidade Estadual de Campinas (UNICAMP),
- **Eu quero** criar meu trabalho com o modelo da UNICAMP,
- **Para que** ele atenda às diretrizes de normalização da universidade.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Modelo encontrado**
  - **Dado que** estou na tela "Novo Trabalho",
  - **Quando** busco por "UNICAMP" ou "Campinas",
  - **Então** o modelo da UNICAMP aparece em destaque.
- [ ] **Cenário 2: Projeto no padrão do manual**
  - **Dado que** criei um projeto com o modelo da UNICAMP,
  - **Quando** compilo o PDF,
  - **Então** capa, folha de rosto, folha de aprovação (se exigida), ordem dos pré-textuais e margens seguem o manual vigente.
- [ ] **Cenário 3: Sem falso positivo**
  - **Dado que** o projeto foi criado com o modelo da UNICAMP e não foi alterado,
  - **Quando** os linters rodam,
  - **Então** nenhum aviso de formatação é exibido.

### Regras de Negócio e Restrições

- [ ] O modelo registra o link e a versão ou o ano do manual oficial usado como base.
- [ ] O PR traz prints do PDF gerado ao lado das páginas correspondentes do manual.
- [ ] O PR informa quais tipos de trabalho o modelo cobre (ex.: dissertação, tese, TCC).
- [ ] Nenhum brasão é embutido no repositório: o usuário envia o dele (RDJ-02.4).

### Dependências / Informações Técnicas

- Depende de RDJ-02.1. Se o manual exigir brasão, depende também de RDJ-02.4.
- Siga o guia de RDJ-02.6.

---

<!-- issue: {"id":"RDJ-02.9","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","good first issue"],"ciclo":1} -->
## [RDJ-02.9] Modelo institucional: UFMG

### Contexto / User Story

- **Como um** estudante da Universidade Federal de Minas Gerais (UFMG),
- **Eu quero** criar meu trabalho com o modelo da UFMG,
- **Para que** ele atenda às diretrizes de normalização da universidade.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Modelo encontrado**
  - **Dado que** estou na tela "Novo Trabalho",
  - **Quando** busco por "UFMG" ou "Minas Gerais",
  - **Então** o modelo da UFMG aparece em destaque.
- [ ] **Cenário 2: Projeto no padrão do manual**
  - **Dado que** criei um projeto com o modelo da UFMG,
  - **Quando** compilo o PDF,
  - **Então** capa, folha de rosto, folha de aprovação (se exigida), ordem dos pré-textuais e margens seguem o manual vigente.
- [ ] **Cenário 3: Sem falso positivo**
  - **Dado que** o projeto foi criado com o modelo da UFMG e não foi alterado,
  - **Quando** os linters rodam,
  - **Então** nenhum aviso de formatação é exibido.

### Regras de Negócio e Restrições

- [ ] O modelo registra o link e a versão ou o ano do manual oficial usado como base.
- [ ] O PR traz prints do PDF gerado ao lado das páginas correspondentes do manual.
- [ ] O PR informa quais tipos de trabalho o modelo cobre (ex.: dissertação, tese, TCC).
- [ ] Nenhum brasão é embutido no repositório: o usuário envia o dele (RDJ-02.4).

### Dependências / Informações Técnicas

- Depende de RDJ-02.1. Se o manual exigir brasão, depende também de RDJ-02.4.
- Siga o guia de RDJ-02.6.

---

<!-- issue: {"id":"RDJ-02.10","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","good first issue"],"ciclo":1} -->
## [RDJ-02.10] Modelo institucional: IFSP

### Contexto / User Story

- **Como um** estudante do Instituto Federal de São Paulo (IFSP),
- **Eu quero** criar meu TCC com o modelo do IFSP,
- **Para que** ele atenda às diretrizes de normalização do instituto.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Modelo encontrado**
  - **Dado que** estou na tela "Novo Trabalho",
  - **Quando** busco por "IFSP" ou "Instituto Federal de São Paulo",
  - **Então** o modelo do IFSP aparece em destaque.
- [ ] **Cenário 2: Projeto no padrão do manual**
  - **Dado que** criei um projeto com o modelo do IFSP,
  - **Quando** compilo o PDF,
  - **Então** capa, folha de rosto, folha de aprovação (se exigida), ordem dos pré-textuais e margens seguem o manual vigente.
- [ ] **Cenário 3: Sem falso positivo**
  - **Dado que** o projeto foi criado com o modelo do IFSP e não foi alterado,
  - **Quando** os linters rodam,
  - **Então** nenhum aviso de formatação é exibido.

### Regras de Negócio e Restrições

- [ ] O modelo registra o link e a versão ou o ano do manual oficial usado como base.
- [ ] O PR traz prints do PDF gerado ao lado das páginas correspondentes do manual.
- [ ] O modelo cobre pelo menos o TCC de cursos técnicos ou de graduação.
- [ ] Nenhum brasão é embutido no repositório: o usuário envia o dele (RDJ-02.4).
- [ ] O slug da página pública é `ifsp-tcc` (usado como exemplo no backlog e em RDJ-02.5).

### Dependências / Informações Técnicas

- Depende de RDJ-02.1. Se o manual exigir brasão, depende também de RDJ-02.4.
- Siga o guia de RDJ-02.6.

---

<!-- issue: {"id":"RDJ-02.11","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: templates","good first issue","help wanted"],"ciclo":1} -->
## [RDJ-02.11] Modelo institucional: instituição particular de grande porte

### Contexto / User Story

- **Como um** estudante de uma instituição particular com grande número de alunos,
- **Eu quero** criar meu trabalho com o modelo da minha instituição,
- **Para que** ele atenda às diretrizes de normalização exigidas pela minha banca.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Escolha da instituição**
  - **Dado que** a issue foi aberta sem instituição definida,
  - **Quando** um contribuidor assume a issue,
  - **Então** ele registra nos comentários qual instituição particular vai modelar (ex.: Mackenzie, PUC), com o link do manual, antes de abrir o PR.
- [ ] **Cenário 2: Modelo encontrado**
  - **Dado que** estou na tela "Novo Trabalho",
  - **Quando** busco pelo nome ou pela sigla da instituição escolhida,
  - **Então** o modelo dela aparece em destaque.
- [ ] **Cenário 3: Projeto no padrão do manual**
  - **Dado que** criei um projeto com esse modelo,
  - **Quando** compilo o PDF,
  - **Então** capa, folha de rosto, folha de aprovação (se exigida), ordem dos pré-textuais e margens seguem o manual vigente.
- [ ] **Cenário 4: Sem falso positivo**
  - **Dado que** o projeto foi criado com esse modelo e não foi alterado,
  - **Quando** os linters rodam,
  - **Então** nenhum aviso de formatação é exibido.

### Regras de Negócio e Restrições

- [ ] O título da issue é atualizado com o nome da instituição escolhida.
- [ ] O modelo registra o link e a versão ou o ano do manual oficial usado como base.
- [ ] O PR traz prints do PDF gerado ao lado das páginas correspondentes do manual.
- [ ] Nenhum brasão é embutido no repositório: o usuário envia o dele (RDJ-02.4).

### Dependências / Informações Técnicas

- Depende de RDJ-02.1. Se o manual exigir brasão, depende também de RDJ-02.4.
- Siga o guia de RDJ-02.6.
