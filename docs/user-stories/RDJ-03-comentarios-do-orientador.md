# RDJ-03 — Comentários do Orientador

<!-- issue: {"id":"RDJ-03","type":"Feature","labels":["epic","categoria: essencial","prioridade: P1","esforco: G","area: editor","area: collaboration"],"ciclo":1} -->
## [RDJ-03] Épico: Comentários do orientador no texto

> **Épico** · 🔥 Essencial · Prioridade **P1** · Esforço **G** · Ciclo 1 (Aquisição)

### Contexto / User Story

- **Como um** orientador,
- **Eu quero** selecionar um trecho e deixar um comentário,
- **Para que** meu orientando veja exatamente o que ajustar.

- **Como um** estudante,
- **Eu quero** ver os comentários pendentes, responder e marcar como resolvidos,
- **Para que** eu acompanhe as correções sem sair do Redija.

### Problema

Escrever um trabalho acadêmico é um ciclo de "aluno escreve, orientador corrige". Sem comentários no texto, esse ciclo acontece no Word, por e-mail ou em PDF anotado, e o aluno sai do Redija.

**Valor:** mantém o aluno no app durante o semestre e transforma o orientador em canal de aquisição (um professor orienta vários alunos por ano).

### Histórias (sub-issues)

- RDJ-03.1 · Comentar um trecho selecionado do texto
- RDJ-03.2 · Responder, editar, excluir e resolver comentários
- RDJ-03.3 · Ver e navegar pelos comentários no painel lateral
- RDJ-03.4 · Manter os comentários no projeto e no arquivo .redija, fora do PDF
- RDJ-03.5 · Sincronizar comentários pelo Google Drive sem perder dados
- RDJ-03.6 · Ver comentários em tempo real numa sessão colaborativa

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Fluxo ponta a ponta validado: o orientador comenta pelo projeto compartilhado no Drive, o aluno responde e resolve, e nenhum comentário se perde.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.
- [ ] Não usar a extensão de comentários paga do Tiptap Pro.

### Fora de escopo (v1)

- Modo Sugestão (controle de alterações em que o orientador propõe uma substituição e o aluno aceita ou recusa). Previsto para a v2.
- Menções e notificações por e-mail (exigiriam backend).

### Métrica de sucesso

Porcentagem de projetos com mais de um autor de comentário e número de contas novas vindas de convite de compartilhamento.

### Dependências / Informações Técnicas

- N/A. Combina com RDJ-08 (link de leitura) para o orientador sem conta.

---

<!-- issue: {"id":"RDJ-03.1","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: editor"],"ciclo":1} -->
## [RDJ-03.1] Comentar um trecho selecionado do texto

### Contexto / User Story

- **Como um** orientador revisando o trabalho do meu orientando,
- **Eu quero** selecionar um trecho e deixar um comentário ancorado nele,
- **Para que** o aluno saiba exatamente onde e o que ajustar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Comentar pela barra flutuante**
  - **Dado que** selecionei um trecho de texto no editor,
  - **Quando** clico em "Comentar" na barra flutuante, escrevo o comentário e salvo,
  - **Então** o trecho fica destacado e o comentário fica vinculado a ele.
- [ ] **Cenário 2: Comentar pelo atalho**
  - **Dado que** selecionei um trecho de texto,
  - **Quando** pressiono `Ctrl+Alt+M` (`Cmd+Option+M` no macOS),
  - **Então** a caixa de novo comentário abre para o trecho selecionado.
- [ ] **Cenário 3: Autoria**
  - **Dado que** estou logado com minha conta Google,
  - **Quando** salvo um comentário,
  - **Então** ele mostra meu nome e minha foto da conta Google, além da data e da hora.
- [ ] **Cenário 4: Comentário vazio ou sem seleção**
  - **Dado que** não há texto selecionado, ou a caixa de comentário está vazia,
  - **Quando** tento comentar ou salvar,
  - **Então** a ação fica indisponível e uma dica explica o que fazer.
- [ ] **Cenário 5: Texto editado ao redor**
  - **Dado que** um trecho tem comentário,
  - **Quando** alguém edita o texto antes ou depois dele,
  - **Então** o comentário continua ancorado no mesmo trecho.
- [ ] **Cenário 6: Trecho apagado**
  - **Dado que** um trecho tem comentário,
  - **Quando** todo o trecho é apagado,
  - **Então** o comentário é mantido e marcado como "trecho removido".

### Regras de Negócio e Restrições

- [ ] Um comentário tem no máximo 5.000 caracteres.
- [ ] Comentar não altera o conteúdo do texto.
- [ ] Trechos comentados podem se sobrepor.
- [ ] Projetos antigos, sem comentários, abrem sem erro.

### Dependências / Informações Técnicas

- Sugestão técnica do backlog: mark customizado do TipTap (`comment`, com `commentId`), com as threads (autor, data, texto, respostas, status) no JSON do projeto (`src/types/document.ts`).
- Migração de schema em `src/core/storage/schemaNormalizer.ts`.
- Autor obtido de `src/core/auth/GoogleAuthContext.tsx`.

---

<!-- issue: {"id":"RDJ-03.2","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: editor"],"ciclo":1} -->
## [RDJ-03.2] Responder, editar, excluir e resolver comentários

### Contexto / User Story

- **Como um** estudante que recebeu comentários do orientador,
- **Eu quero** responder, marcar como resolvido e reabrir comentários,
- **Para que** eu converse com meu orientador e acompanhe o que já ajustei.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Responder**
  - **Dado que** há um comentário aberto,
  - **Quando** escrevo uma resposta e envio,
  - **Então** a resposta aparece na thread, em ordem cronológica, com meu nome e a data.
- [ ] **Cenário 2: Editar o próprio comentário**
  - **Dado que** sou o autor de um comentário ou resposta,
  - **Quando** edito o texto e salvo,
  - **Então** o texto é atualizado e exibe a marca "(editado)".
- [ ] **Cenário 3: Comentário de outra pessoa**
  - **Dado que** o comentário é de outra pessoa,
  - **Quando** abro o menu dele,
  - **Então** as opções Editar e Excluir não aparecem.
- [ ] **Cenário 4: Excluir uma thread**
  - **Dado que** sou o autor do comentário que abriu a thread,
  - **Quando** escolho Excluir e confirmo,
  - **Então** a thread inteira e o destaque no texto são removidos.
- [ ] **Cenário 5: Resolver**
  - **Dado que** há um comentário aberto,
  - **Quando** clico em "Resolver",
  - **Então** o destaque some do texto e a thread passa para a lista de resolvidos, registrando quem resolveu e quando.
- [ ] **Cenário 6: Reabrir**
  - **Dado que** há um comentário resolvido cujo trecho ainda existe,
  - **Quando** clico em "Reabrir",
  - **Então** a thread volta para os abertos e o destaque reaparece no texto.

### Regras de Negócio e Restrições

- [ ] Só o autor edita ou exclui o próprio comentário ou resposta.
- [ ] Qualquer pessoa com acesso de edição ao projeto pode resolver ou reabrir uma thread.
- [ ] Excluir uma thread pede confirmação. Excluir uma resposta não pede.

### Dependências / Informações Técnicas

- Depende de RDJ-03.1.

---

<!-- issue: {"id":"RDJ-03.3","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: editor"],"ciclo":1} -->
## [RDJ-03.3] Ver e navegar pelos comentários no painel lateral

### Contexto / User Story

- **Como um** estudante com vários comentários pendentes,
- **Eu quero** ver todos os comentários em um painel e ir direto ao trecho de cada um,
- **Para que** eu trate as correções uma a uma sem procurar no texto.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Lista de comentários**
  - **Dado que** o projeto tem comentários,
  - **Quando** abro o painel "Comentários",
  - **Então** vejo cada thread com o trecho citado, o autor, a data e o número de respostas, na ordem em que aparecem no documento.
- [ ] **Cenário 2: Contador de abertos**
  - **Dado que** há comentários abertos,
  - **Quando** olho o botão do painel,
  - **Então** ele mostra o número de comentários abertos.
- [ ] **Cenário 3: Filtro**
  - **Dado que** o painel está aberto,
  - **Quando** escolho o filtro Abertos, Resolvidos ou Todos,
  - **Então** a lista mostra só as threads daquele estado.
- [ ] **Cenário 4: Ir até o trecho**
  - **Dado que** o painel está aberto,
  - **Quando** clico em uma thread,
  - **Então** o editor rola até o trecho e o destaca.
- [ ] **Cenário 5: Abrir a partir do texto**
  - **Dado que** um trecho do texto está destacado por um comentário,
  - **Quando** clico nele,
  - **Então** o painel abre na thread correspondente.
- [ ] **Cenário 6: Sem comentários**
  - **Dado que** o projeto não tem comentários,
  - **Quando** abro o painel,
  - **Então** vejo um estado vazio que ensina como comentar e mostra o atalho.

### Regras de Negócio e Restrições

- [ ] O painel é navegável só pelo teclado.
- [ ] Threads com trecho removido aparecem no fim da lista, com a marca "trecho removido".

### Dependências / Informações Técnicas

- Depende de RDJ-03.1 e RDJ-03.2.

---

<!-- issue: {"id":"RDJ-03.4","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: storage"],"ciclo":1} -->
## [RDJ-03.4] Manter os comentários no projeto e no arquivo .redija, fora do PDF

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** que os comentários fiquem salvos com o projeto e viajem no arquivo `.redija`, mas não apareçam no PDF,
- **Para que** eu não perca a revisão do orientador e entregue um PDF limpo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Persistência local**
  - **Dado que** criei comentários em um projeto,
  - **Quando** recarrego a página,
  - **Então** os comentários, as respostas e os status continuam lá.
- [ ] **Cenário 2: Exportar e importar .redija**
  - **Dado que** o projeto tem comentários,
  - **Quando** exporto o `.redija` e o importo em outro navegador,
  - **Então** os comentários, as respostas, os autores e os status são preservados.
- [ ] **Cenário 3: PDF sem comentários**
  - **Dado que** o projeto tem comentários abertos,
  - **Quando** compilo ou exporto o PDF,
  - **Então** nenhum comentário nem destaque aparece no PDF.
- [ ] **Cenário 4: Arquivo antigo**
  - **Dado que** tenho um `.redija` criado antes desta funcionalidade,
  - **Quando** o importo,
  - **Então** ele abre sem erro e sem comentários.

### Regras de Negócio e Restrições

- [ ] O formato `.redija` continua retrocompatível (versão de schema incrementada, se necessário).
- [ ] A exportação `.docx` (RDJ-01) também não leva comentários na v1.

### Dependências / Informações Técnicas

- Depende de RDJ-03.1.
- Relacionado: `src/core/storage/schemaNormalizer.ts`, `src/core/storage/db.ts` e o export/import `.redija`.

---

<!-- issue: {"id":"RDJ-03.5","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: collaboration"],"ciclo":1} -->
## [RDJ-03.5] Sincronizar comentários pelo Google Drive sem perder dados

### Contexto / User Story

- **Como um** orientador ou orientando que trabalha num projeto compartilhado pelo Drive,
- **Eu quero** que os comentários feitos por cada um sejam mesclados na sincronização,
- **Para que** nenhum comentário ou resposta se perca quando editamos ao mesmo tempo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Comentários criados em paralelo**
  - **Dado que** o orientador e o aluno criaram comentários diferentes sem sincronizar,
  - **Quando** os dois sincronizam com o Drive,
  - **Então** ambos veem todos os comentários.
- [ ] **Cenário 2: Respostas em paralelo na mesma thread**
  - **Dado que** os dois responderam à mesma thread sem sincronizar,
  - **Quando** sincronizam,
  - **Então** todas as respostas são preservadas, em ordem cronológica.
- [ ] **Cenário 3: Resolver e responder ao mesmo tempo**
  - **Dado que** um resolveu a thread enquanto o outro respondia,
  - **Quando** sincronizam,
  - **Então** a resposta é preservada e o status final é o da ação mais recente.
- [ ] **Cenário 4: Exclusão concorrente**
  - **Dado que** o autor excluiu uma thread enquanto outra pessoa a editava,
  - **Quando** sincronizam,
  - **Então** a exclusão prevalece e a thread não reaparece em sincronizações futuras.

### Regras de Negócio e Restrições

- [ ] O merge nunca descarta comentários ou respostas, exceto exclusões explícitas (registradas como tombstone).
- [ ] Testes automatizados cobrem os 4 cenários acima.
- [ ] Nenhum dado passa por servidor do projeto: o transporte é o Drive do usuário (BYOS).

### Dependências / Informações Técnicas

- Depende de RDJ-03.1 e RDJ-03.2.
- Relacionado: `src/core/storage/projectMerger.ts`, `src/core/storage/googleDriveService.ts` e o compartilhamento por e-mail que já existe em `src/components/ShareModal.tsx`.

---

<!-- issue: {"id":"RDJ-03.6","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: collaboration"],"ciclo":1} -->
## [RDJ-03.6] Ver comentários em tempo real numa sessão colaborativa

### Contexto / User Story

- **Como um** orientador numa reunião de orientação ao vivo com o aluno,
- **Eu quero** que meus comentários apareçam na tela dele na hora,
- **Para que** possamos discutir as correções juntos durante a sessão.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Comentário em tempo real**
  - **Dado que** duas pessoas estão na mesma sessão colaborativa (P2P),
  - **Quando** uma delas cria um comentário,
  - **Então** a outra vê o comentário em até 2 segundos, sem recarregar.
- [ ] **Cenário 2: Respostas e status em tempo real**
  - **Dado que** duas pessoas estão na mesma sessão,
  - **Quando** uma responde, edita, exclui, resolve ou reabre um comentário,
  - **Então** a mudança aparece para a outra em até 2 segundos.
- [ ] **Cenário 3: Entrada tardia na sessão**
  - **Dado que** uma sessão já tem comentários,
  - **Quando** um novo participante entra,
  - **Então** ele recebe todos os comentários existentes.
- [ ] **Cenário 4: Queda de conexão**
  - **Dado que** um participante comentou enquanto estava desconectado,
  - **Quando** a conexão volta,
  - **Então** os comentários são mesclados com as mesmas regras de RDJ-03.5.

### Regras de Negócio e Restrições

- [ ] A propagação usa as mesmas regras de merge de RDJ-03.5.
- [ ] Nenhum servidor do projeto armazena comentários.

### Dependências / Informações Técnicas

- Depende de RDJ-03.5.
- Relacionado: `src/core/collaboration/RealtimeCollabManager.ts` (PeerJS).
