# RDJ-07 — Minha Biblioteca de Referências

<!-- issue: {"id":"RDJ-07","type":"Feature","labels":["epic","categoria: diferencial","prioridade: P2","esforco: G","area: storage","area: references"],"ciclo":2} -->
## [RDJ-07] Épico: Minha biblioteca de referências

> **Épico** · 🚀 Diferencial · Prioridade **P2** · Esforço **M/G** · Ciclo 2 (Retenção e viralidade)

### Contexto / User Story

- **Como um** pesquisador ou pós-graduando,
- **Eu quero** manter um acervo pessoal de referências e inseri-las em qualquer trabalho, buscando também pelo título da obra,
- **Para que** eu não recadastre as mesmas fontes a cada trabalho.

### Problema

Hoje as referências vivem dentro de cada projeto. Quem escreve vários trabalhos por semestre recadastra as mesmas fontes. A busca automática atual exige DOI ou ISBN, que o estudante muitas vezes não tem em mãos: ele tem o título.

**Valor:** agilidade e aumento do custo de troca (quanto maior o acervo no Redija, menor a chance de migrar). Também atrai pós-graduandos que já usam Zotero ou Mendeley.

### Histórias (sub-issues)

- RDJ-07.1 · Salvar referências na minha biblioteca e usá-las em qualquer projeto
- RDJ-07.2 · Buscar uma referência pelo título ou pelo autor
- RDJ-07.3 · Importar referências do Zotero e do Mendeley (.ris e CSL-JSON)
- RDJ-07.4 · Sincronizar minha biblioteca pelo Google Drive
- RDJ-07.5 · Organizar a biblioteca com pastas e tags
- RDJ-07.6 · Atualizar num projeto uma referência alterada na biblioteca

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Uma referência salva na biblioteca em um dispositivo pode ser inserida em um projeto em outro dispositivo, após sincronizar.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero (APIs públicas e gratuitas).

### Fora de escopo (v1)

- Sincronização com a Zotero Web API usando a chave do próprio usuário (BYOK). Prevista para a v2.

### Métrica de sucesso

Tamanho médio da biblioteca por usuário e porcentagem de referências inseridas a partir dela.

### Dependências / Informações Técnicas

- N/A.

---

<!-- issue: {"id":"RDJ-07.1","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: references","area: storage"],"ciclo":2} -->
## [RDJ-07.1] Salvar referências na minha biblioteca e usá-las em qualquer projeto

### Contexto / User Story

- **Como um** estudante que escreve vários trabalhos por semestre,
- **Eu quero** guardar referências num acervo pessoal e inseri-las em qualquer projeto,
- **Para que** eu cadastre cada fonte uma única vez.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Salvar ao adicionar a um projeto**
  - **Dado que** estou adicionando uma referência a um projeto,
  - **Quando** marco "Salvar também na minha biblioteca" e confirmo,
  - **Então** a referência é adicionada ao projeto e ao meu acervo.
- [ ] **Cenário 2: Inserir a partir da biblioteca**
  - **Dado que** tenho referências no acervo,
  - **Quando** abro a aba "Minha Biblioteca" na janela de referências, busco por título, autor ou ano e clico em "Inserir",
  - **Então** a referência é adicionada ao projeto atual.
- [ ] **Cenário 3: Cópia independente**
  - **Dado que** inseri uma referência da biblioteca num projeto,
  - **Quando** edito a referência no projeto,
  - **Então** a biblioteca não muda, e editar a biblioteca também não altera o projeto.
- [ ] **Cenário 4: Referência repetida**
  - **Dado que** a referência já está no projeto (mesmo DOI/ISBN, ou mesmo título e ano),
  - **Quando** tento inseri-la de novo,
  - **Então** vejo o aviso "Esta referência já está neste projeto" e nada é duplicado.
- [ ] **Cenário 5: Excluir da biblioteca**
  - **Dado que** uma referência da biblioteca foi usada em projetos,
  - **Quando** a excluo da biblioteca,
  - **Então** os projetos continuam com a cópia deles.
- [ ] **Cenário 6: Biblioteca vazia**
  - **Dado que** meu acervo está vazio,
  - **Quando** abro a aba "Minha Biblioteca",
  - **Então** vejo atalhos para importar um arquivo e para buscar por título.

### Regras de Negócio e Restrições

- [ ] O acervo é global e separado dos projetos.
- [ ] Deduplicação por DOI ou ISBN; sem eles, por título normalizado (sem acentos, caixa e pontuação) + ano.
- [ ] A biblioteca funciona offline.
- [ ] A busca local responde em menos de 200 ms com até 5.000 referências.

### Dependências / Informações Técnicas

- Sugestão do backlog: nova tabela Dexie `library` em `src/core/storage/db.ts`, com migração de versão.
- Relacionado: `src/components/ReferenceModal.tsx`.

---

<!-- issue: {"id":"RDJ-07.2","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: references"],"ciclo":2} -->
## [RDJ-07.2] Buscar uma referência pelo título ou pelo autor

### Contexto / User Story

- **Como um** estudante que sabe o título da obra, mas não o DOI,
- **Eu quero** buscar a referência pelo título ou pelo autor e ter os campos preenchidos automaticamente,
- **Para que** eu não precise digitar a referência inteira.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Busca por título**
  - **Dado que** estou na janela de referências, com internet,
  - **Quando** digito o título de uma obra,
  - **Então** em até 3 segundos vejo resultados com título, autores, ano, veículo e DOI.
- [ ] **Cenário 2: Preenchimento automático**
  - **Dado que** a busca retornou resultados,
  - **Quando** escolho um deles,
  - **Então** os campos da referência são preenchidos e posso revisá-los antes de salvar.
- [ ] **Cenário 3: Resultados duplicados entre fontes**
  - **Dado que** a mesma obra aparece no OpenAlex e no Crossref,
  - **Quando** os resultados são exibidos,
  - **Então** ela aparece uma única vez.
- [ ] **Cenário 4: Nenhum resultado**
  - **Dado que** a busca não encontrou nada,
  - **Quando** os resultados são exibidos,
  - **Então** vejo "Nenhuma obra encontrada" e a opção de cadastro manual.
- [ ] **Cenário 5: Sem internet ou API fora do ar**
  - **Dado que** estou offline ou as APIs não respondem,
  - **Quando** tento buscar,
  - **Então** vejo uma mensagem clara e a opção de cadastro manual.

### Regras de Negócio e Restrições

- [ ] As chamadas saem direto do navegador para APIs gratuitas, sem chave e com CORS.
- [ ] A busca espera pelo menos 400 ms sem digitação antes de consultar as APIs.
- [ ] Nenhum dado pessoal do usuário é enviado às APIs. Se uma API pedir e-mail de contato, usar um contato do projeto configurado no app, nunca o do usuário.
- [ ] Ao escolher um resultado, o usuário pode salvar na biblioteca (RDJ-07.1).

### Dependências / Informações Técnicas

- APIs: [OpenAlex](https://openalex.org) e [Crossref](https://api.crossref.org).
- Integra com RDJ-07.1 para salvar na biblioteca.

---

<!-- issue: {"id":"RDJ-07.3","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: references"],"ciclo":2} -->
## [RDJ-07.3] Importar referências do Zotero e do Mendeley (.ris e CSL-JSON)

### Contexto / User Story

- **Como um** pós-graduando que já organiza as referências no Zotero ou no Mendeley,
- **Eu quero** importar arquivos `.ris` e CSL-JSON,
- **Para que** eu traga meu acervo para o Redija sem redigitar nada.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Importar .ris**
  - **Dado que** exportei minhas referências do Zotero ou do Mendeley em `.ris`,
  - **Quando** importo o arquivo,
  - **Então** as referências são criadas com tipo, autores, título, ano, veículo, DOI e ISBN quando existirem.
- [ ] **Cenário 2: Importar CSL-JSON**
  - **Dado que** exportei minhas referências em CSL-JSON,
  - **Quando** importo o arquivo,
  - **Então** as referências são criadas com os mesmos campos.
- [ ] **Cenário 3: Escolher o destino**
  - **Dado que** estou importando um arquivo,
  - **Quando** escolho o destino,
  - **Então** posso enviar as referências para a biblioteca, para o projeto atual ou para os dois.
- [ ] **Cenário 4: Duplicatas**
  - **Dado que** o arquivo tem referências que já existem no destino,
  - **Quando** a importação termina,
  - **Então** vejo o resumo "12 importadas, 3 duplicadas ignoradas", com a opção de ver as duplicadas.
- [ ] **Cenário 5: Arquivo inválido**
  - **Dado que** o arquivo está corrompido ou em outro formato,
  - **Quando** tento importá-lo,
  - **Então** vejo uma mensagem indicando o problema e a entrada afetada, sem importar nada pela metade.
- [ ] **Cenário 6: .bib continua funcionando**
  - **Dado que** importo um `.bib`,
  - **Quando** a importação termina,
  - **Então** o comportamento é o mesmo de hoje, agora com a opção de destino.

### Regras de Negócio e Restrições

- [ ] Deduplicação com as mesmas regras de RDJ-07.1.
- [ ] O mapeamento de tipos (.ris/CSL → tipos de referência do Redija) é documentado.
- [ ] Os arquivos são processados localmente, no navegador.

### Dependências / Informações Técnicas

- Depende de RDJ-07.1.
- Reaproveitar o importador `.bib` existente.

---

<!-- issue: {"id":"RDJ-07.4","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: storage","area: references"],"ciclo":2} -->
## [RDJ-07.4] Sincronizar minha biblioteca pelo Google Drive

### Contexto / User Story

- **Como um** pesquisador que usa o Redija no notebook e no computador do laboratório,
- **Eu quero** que minha biblioteca sincronize pelo meu Google Drive,
- **Para que** eu tenha o mesmo acervo em qualquer dispositivo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Restaurar em outro dispositivo**
  - **Dado que** tenho referências na biblioteca e estou logado com o Google,
  - **Quando** abro o Redija em outro dispositivo com a mesma conta,
  - **Então** a biblioteca é baixada do meu Drive e fica disponível.
- [ ] **Cenário 2: Edições em dois dispositivos**
  - **Dado que** editei referências diferentes em dois dispositivos sem sincronizar,
  - **Quando** os dois sincronizam,
  - **Então** as duas edições são preservadas.
- [ ] **Cenário 3: Mesma referência editada nos dois**
  - **Dado que** editei a mesma referência em dois dispositivos,
  - **Quando** sincronizam,
  - **Então** prevalece a edição mais recente, sem perder as outras referências.
- [ ] **Cenário 4: Exclusão**
  - **Dado que** excluí uma referência em um dispositivo,
  - **Quando** os dispositivos sincronizam,
  - **Então** ela não reaparece.
- [ ] **Cenário 5: Sem login**
  - **Dado que** não estou logado com o Google,
  - **Quando** uso a biblioteca,
  - **Então** ela funciona só neste navegador, com um aviso de que não está sincronizada.

### Regras de Negócio e Restrições

- [ ] A biblioteca é salva como arquivo próprio no Drive do usuário, separado dos projetos.
- [ ] O merge é não destrutivo (exclusões registradas como tombstone), coberto por testes.
- [ ] Alterações feitas offline sincronizam quando a conexão volta.

### Dependências / Informações Técnicas

- Depende de RDJ-07.1.
- Relacionado: `src/core/storage/googleDriveService.ts` e o padrão de merge de `src/core/storage/projectMerger.ts`.

---

<!-- issue: {"id":"RDJ-07.5","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: references"],"ciclo":2} -->
## [RDJ-07.5] Organizar a biblioteca com pastas e tags

### Contexto / User Story

- **Como um** estudante com muitas referências de disciplinas diferentes,
- **Eu quero** organizar o acervo em pastas e tags,
- **Para que** eu encontre rápido as fontes de cada trabalho.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Criar pasta e mover referências**
  - **Dado que** estou na aba "Minha Biblioteca",
  - **Quando** crio a pasta "TCC" e movo referências para ela,
  - **Então** as referências aparecem dentro da pasta.
- [ ] **Cenário 2: Tags**
  - **Dado que** selecionei uma referência,
  - **Quando** adiciono as tags "metodologia" e "qualitativa",
  - **Então** a referência mostra as duas tags.
- [ ] **Cenário 3: Filtrar**
  - **Dado que** tenho pastas e tags,
  - **Quando** filtro por uma pasta ou por uma tag,
  - **Então** vejo só as referências correspondentes.
- [ ] **Cenário 4: Excluir pasta**
  - **Dado que** uma pasta tem referências,
  - **Quando** excluo a pasta,
  - **Então** as referências não são excluídas e vão para "Sem pasta".

### Regras de Negócio e Restrições

- [ ] Uma referência fica em no máximo uma pasta (v1) e pode ter várias tags.
- [ ] Nomes de pasta e de tag são únicos, sem diferenciar maiúsculas e minúsculas.
- [ ] Pastas e tags sincronizam com a biblioteca (RDJ-07.4).

### Dependências / Informações Técnicas

- Depende de RDJ-07.1.

---

<!-- issue: {"id":"RDJ-07.6","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: references"],"ciclo":2} -->
## [RDJ-07.6] Atualizar num projeto uma referência alterada na biblioteca

### Contexto / User Story

- **Como um** estudante que corrigiu uma referência na biblioteca,
- **Eu quero** escolher se aplico a correção nos projetos que usam essa referência,
- **Para que** eu corrija onde quero sem alterar trabalhos já entregues.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Indicador de versão nova**
  - **Dado que** editei na biblioteca uma referência que um projeto usa,
  - **Quando** abro esse projeto,
  - **Então** a referência mostra o indicador "Há uma versão mais nova na biblioteca".
- [ ] **Cenário 2: Ver diferenças e atualizar**
  - **Dado que** o indicador aparece,
  - **Quando** clico em "Atualizar",
  - **Então** vejo as diferenças campo a campo e, ao confirmar, a cópia do projeto é atualizada.
- [ ] **Cenário 3: Manter a versão do projeto**
  - **Dado que** o indicador aparece,
  - **Quando** escolho "Manter esta versão",
  - **Então** a cópia do projeto não muda e o indicador some até a próxima edição na biblioteca.

### Regras de Negócio e Restrições

- [ ] Nenhuma referência de projeto é atualizada automaticamente.
- [ ] A cópia no projeto guarda o identificador da referência de origem na biblioteca.

### Dependências / Informações Técnicas

- Depende de RDJ-07.1.
