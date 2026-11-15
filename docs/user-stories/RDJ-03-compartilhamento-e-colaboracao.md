# RDJ-03 — Compartilhamento e Colaboração

<!-- issue: {"id":"RDJ-03","type":"Feature","labels":["epic","categoria: essencial","prioridade: P1","esforco: G","area: editor","area: collaboration","area: storage","area: infra"],"ciclo":1} -->
## [RDJ-03] Épico: Compartilhamento e colaboração (Drive, tempo real e revisão)

> **Épico** · 🔥 Essencial · Prioridade **P1** · Esforço **G** · Ciclo 1 (Aquisição)
> **Arquitetura:** [`docs/arquitetura-compartilhamento-colaboracao.md`](../arquitetura-compartilhamento-colaboracao.md)

### Contexto / User Story

- **Como um** estudante e meu orientador,
- **Eu quero** compartilhar o trabalho, editar ao mesmo tempo sem perder texto e deixar comentários no próprio texto,
- **Para que** todo o ciclo "aluno escreve, orientador corrige" aconteça dentro do Redija.

### Problema

Escrever um trabalho acadêmico é um ciclo de "aluno escreve, orientador corrige". Hoje esse ciclo sai do Redija, porque as duas peças de colaboração que existem não funcionam:

- **Compartilhamento via Drive:** o convidado não vê o projeto (escopo `drive.file`), não consegue salvar (`addParents` em arquivo de outra pessoa) e a mesclagem entre duas versões perde ou duplica texto (`projectMerger`).
- **Tempo real P2P (PeerJS):** depende do servidor público do PeerJS, não conecta em redes de universidade e 4G (sem TURN), as salas não têm autenticação e duas pessoas no mesmo bloco sobrescrevem uma à outra.

A causa comum é o formato do documento (JSON de blocos com HTML), que não sabe juntar edições concorrentes. A arquitetura aprovada troca esse formato por **Yjs (CRDT)**, usa o **Drive como arquivo oficial** e um **servidor de sincronização no Railway** para o tempo real.

**Valor:** mantém o aluno no app durante o semestre e transforma o orientador em canal de aquisição (um professor orienta vários alunos por ano).

### Histórias (sub-issues)

**Fase 1: base colaborativa e compartilhamento que funciona** (sem servidor novo)
- RDJ-03.7 · Converter meus trabalhos para o formato colaborativo sem perder nada
- RDJ-03.8 · Editar com o editor preparado para colaboração
- RDJ-03.5 · Salvar no Drive juntando versões, sem perder edições
- RDJ-03.9 · Abrir um trabalho que compartilharam comigo
- RDJ-03.10 · Salvar alterações num trabalho de outra pessoa
- RDJ-03.11 · Abrir em modo somente leitura quando só tenho permissão de leitura

**Fase 2: tempo real**
- RDJ-03.12 · Conectar à colaboração em tempo real com segurança, em qualquer rede
- RDJ-03.6 · Editar ao mesmo tempo, vendo quem está no documento
- RDJ-03.13 · Remover a colaboração P2P antiga

**Fase 3: revisão**
- RDJ-03.1 · Comentar um trecho selecionado do texto
- RDJ-03.2 · Responder, editar, excluir e resolver comentários
- RDJ-03.3 · Ver e navegar pelos comentários no painel lateral
- RDJ-03.4 · Manter os comentários salvos, sincronizados e fora do PDF
- RDJ-03.14 · Ver e restaurar versões anteriores do trabalho
- RDJ-03.15 · Sugerir alterações no texto (modo sugestão)

### Critérios de Aceite do Épico

- [ ] **Fase 1:** convidar alguém e os dois editarem o mesmo trabalho, em momentos diferentes, sem perder texto e sem servidor novo.
- [ ] **Fase 2:** edição simultânea com presença e cursores, em qualquer rede.
- [ ] **Fase 3:** o orientador comenta pelo projeto compartilhado, o aluno responde e resolve, e nenhum comentário se perde.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] O **Drive do usuário continua sendo o arquivo oficial** (BYOS).
- [ ] **Exceção aprovada à regra de ouro:** o servidor de colaboração roda no Railway já contratado, como serviço separado do `redija-import`. Ele mantém as salas **só em memória**, não grava conteúdo em banco nem em log, e usa TLS. A política de privacidade é atualizada antes da Fase 2 ir para produção.
- [ ] A permissão é sempre a do Google Drive: o app não cria um sistema de permissões próprio.
- [ ] Manter o escopo OAuth `drive.file` (o escopo `drive` completo é restrito e exige auditoria paga).
- [ ] Não usar a extensão de comentários paga do Tiptap Pro.

### Fora de escopo

- Convidado sem conta Google editando ou comentando (o Drive exige conta). A leitura sem login é o épico RDJ-08.
- Menções e notificações por e-mail.

### Métrica de sucesso

Porcentagem de projetos com mais de um autor de edição ou comentário e número de contas novas vindas de convite de compartilhamento.

### Dependências / Informações Técnicas

- Arquitetura completa, diagnóstico e riscos: [`docs/arquitetura-compartilhamento-colaboracao.md`](../arquitetura-compartilhamento-colaboracao.md).
- Combina com RDJ-08 (link de leitura) para quem não tem conta.

---

<!-- issue: {"id":"RDJ-03.7","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: G","area: editor","area: storage"],"ciclo":1} -->
## [RDJ-03.7] Converter meus trabalhos para o formato colaborativo sem perder nada

### Contexto / User Story

- **Como um** estudante com trabalhos já escritos no Redija,
- **Eu quero** que meus projetos sejam convertidos para o novo formato colaborativo sem nenhuma diferença no conteúdo nem no PDF,
- **Para que** eu ganhe a colaboração sem correr o risco de perder o que já escrevi.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Conversão transparente**
  - **Dado que** tenho um projeto no formato atual (`.redija` v1),
  - **Quando** abro o projeto pela primeira vez depois da atualização,
  - **Então** ele é convertido uma única vez e o conteúdo, a ordem dos blocos, as referências e as configurações ficam idênticos.
- [ ] **Cenário 2: PDF idêntico**
  - **Dado que** um projeto foi convertido,
  - **Quando** compilo o PDF,
  - **Então** o resultado é igual ao gerado antes da conversão, e os linters e a exportação continuam funcionando.
- [ ] **Cenário 3: Novo arquivo .redija**
  - **Dado que** exporto um projeto convertido,
  - **Quando** abro o arquivo,
  - **Então** ele está no formato v2, com o estado colaborativo e um retrato legível do documento (`snapshot`).
- [ ] **Cenário 4: Arquivo antigo**
  - **Dado que** recebo um `.redija` v1,
  - **Quando** o importo,
  - **Então** ele é convertido e abre normalmente.
- [ ] **Cenário 5: Falha na conversão**
  - **Dado que** a conversão de um projeto falha,
  - **Quando** o erro acontece,
  - **Então** o projeto original é preservado sem alteração, vejo uma mensagem clara e consigo baixar um backup.

### Regras de Negócio e Restrições

- [ ] A conversão fica atrás de uma *feature flag* até a Fase 1 estar completa.
- [ ] Imagens não entram no documento colaborativo: ficam como arquivos e o documento guarda só a referência (alinhado à cota de imagens).
- [ ] O transpilador, os linters e o exportador continuam recebendo o mesmo `DocumentProject`, gerado a partir do documento colaborativo.
- [ ] Testes de ida e volta (`projectToYDoc` → `yDocToProject`) com os 9 modelos iniciais.

### Dependências / Informações Técnicas

- Arquitetura, seções 3.1 e 3.2: modelo `Y.Doc` (meta, config, blockOrder, blocks, references), `projectToYDoc` / `yDocToProject` e `.redija` v2 `{ version: 2, yjsState, snapshot }`.
- Relacionado: `src/core/storage/schemaNormalizer.ts`, `src/types/document.ts`.

---

<!-- issue: {"id":"RDJ-03.8","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: G","area: editor"],"ciclo":1} -->
## [RDJ-03.8] Editar com o editor preparado para colaboração

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** continuar escrevendo do mesmo jeito, agora num editor que sabe juntar as edições de várias pessoas,
- **Para que** a colaboração funcione sem mudar a minha forma de trabalhar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Edição normal**
  - **Dado que** abri um projeto convertido,
  - **Quando** escrevo, formato texto e uso o menu `/`,
  - **Então** tudo funciona como antes, inclusive tabelas, imagens, equações e código.
- [ ] **Cenário 2: Persistência local**
  - **Dado que** editei um projeto,
  - **Quando** recarrego a página, inclusive offline,
  - **Então** todas as edições continuam lá.
- [ ] **Cenário 3: Desfazer só o que eu fiz**
  - **Dado que** outra pessoa editou o mesmo documento,
  - **Quando** pressiono `Ctrl+Z`,
  - **Então** só as minhas últimas alterações são desfeitas, nunca as da outra pessoa.
- [ ] **Cenário 4: Desempenho**
  - **Dado que** o trabalho tem cerca de 60 páginas,
  - **Quando** digito,
  - **Então** não há atraso perceptível.

### Regras de Negócio e Restrições

- [ ] O histórico de desfazer por *snapshot* (`useUndoRedoHistory`) é substituído pelo de colaboração.
- [ ] Os testes E2E atuais do editor continuam passando.

### Dependências / Informações Técnicas

- Depende de RDJ-03.7.
- Arquitetura, seção 3.1: `@tiptap/extension-collaboration` (via `y-prosemirror`) em cada bloco de texto rico, `Y.UndoManager` e persistência local do estado Yjs (Dexie ou `y-indexeddb`).
- Relacionado: `src/components/RichTextInput.tsx`, `src/components/Editor.tsx`, `src/core/storage/db.ts`.

---

<!-- issue: {"id":"RDJ-03.5","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: collaboration"],"ciclo":1} -->
## [RDJ-03.5] Salvar no Drive juntando versões, sem perder edições

### Contexto / User Story

- **Como um** orientador ou orientando que edita o mesmo trabalho compartilhado, em momentos diferentes,
- **Eu quero** que as alterações de cada um sejam juntadas ao salvar no Drive,
- **Para que** nenhum texto se perca nem apareça duplicado.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Parágrafos diferentes**
  - **Dado que** duas pessoas editaram parágrafos diferentes sem sincronizar,
  - **Quando** as duas salvam no Drive,
  - **Então** as duas alterações aparecem para ambas.
- [ ] **Cenário 2: Mesmo parágrafo**
  - **Dado que** as duas editaram o mesmo parágrafo,
  - **Quando** sincronizam,
  - **Então** as duas edições são preservadas no mesmo parágrafo, sem criar um parágrafo duplicado.
- [ ] **Cenário 3: Exclusão e edição**
  - **Dado que** uma pessoa apagou um bloco e a outra criou um bloco novo,
  - **Quando** sincronizam,
  - **Então** o bloco apagado não volta e o bloco novo aparece.
- [ ] **Cenário 4: Gravações cruzadas**
  - **Dado que** as duas salvaram quase ao mesmo tempo,
  - **Quando** a próxima sincronização acontece,
  - **Então** o que faltou é recuperado e nada se perde.

### Regras de Negócio e Restrições

- [ ] Antes de gravar, o app compara a revisão do arquivo no Drive. Se mudou, baixa, junta e só então grava.
- [ ] A junção de versões é idempotente: repetir a sincronização não altera o resultado.
- [ ] O `projectMerger` deixa de ser usado no fluxo de sincronização.
- [ ] Testes automatizados cobrem os 4 cenários.

### Dependências / Informações Técnicas

- Depende de RDJ-03.7.
- Arquitetura, Opção A, item 6: comparar `headRevisionId` e aplicar `Y.applyUpdate`.
- Relacionado: `src/core/storage/googleDriveService.ts`, `src/hooks/useDriveSyncOrchestrator.ts`, `src/core/storage/projectMerger.ts`.

---

<!-- issue: {"id":"RDJ-03.9","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: storage","area: collaboration"],"ciclo":1} -->
## [RDJ-03.9] Abrir um trabalho que compartilharam comigo

### Contexto / User Story

- **Como um** orientador convidado para o trabalho de um aluno,
- **Eu quero** abrir o trabalho no Redija a partir do convite,
- **Para que** eu consiga ler, editar e comentar sem pedir que o aluno me mande arquivos.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Abrir pelo link do convite**
  - **Dado que** recebi um convite para um trabalho,
  - **Quando** abro o link `/abrir?file=<id>` e confirmo o arquivo no seletor do Google,
  - **Então** o trabalho abre no Redija.
- [ ] **Cenário 2: Trabalho na minha lista**
  - **Dado que** já abri um trabalho compartilhado comigo,
  - **Quando** abro a lista de projetos,
  - **Então** ele aparece com o selo "Compartilhado com você" e o nome do dono.
- [ ] **Cenário 3: Sem acesso**
  - **Dado que** abri um link de um trabalho que não foi compartilhado comigo,
  - **Quando** a página carrega,
  - **Então** vejo uma mensagem explicando que preciso pedir acesso ao dono.
- [ ] **Cenário 4: Convite a partir do app**
  - **Dado que** sou o dono e convido alguém pelo compartilhamento,
  - **Quando** o convite é enviado,
  - **Então** ele inclui o link de abertura direta no Redija.

### Regras de Negócio e Restrições

- [ ] O escopo OAuth continua `drive.file`: o Google libera o arquivo para o app quando o convidado o escolhe no seletor.
- [ ] O app guarda que o arquivo é compartilhado e quem é o dono real, sem sobrescrever o dono com o usuário atual.

### Dependências / Informações Técnicas

- Arquitetura, Opção A, itens 1 a 3: Google Picker com `setFileIds` e, opcionalmente, "Abrir com" do Drive.
- Relacionado: `src/components/ShareModal.tsx`, `src/core/auth/GoogleAuthContext.tsx`, `src/hooks/useDriveSyncOrchestrator.ts`.

---

<!-- issue: {"id":"RDJ-03.10","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: storage"],"ciclo":1} -->
## [RDJ-03.10] Salvar alterações num trabalho de outra pessoa

### Contexto / User Story

- **Como um** convidado com permissão de edição,
- **Eu quero** salvar as minhas alterações no trabalho de outra pessoa,
- **Para que** a minha colaboração não se perca com um erro ao salvar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Salvar como convidado**
  - **Dado que** abri um trabalho compartilhado comigo com permissão de edição,
  - **Quando** edito e o app salva,
  - **Então** as alterações são gravadas no arquivo original, sem erro.
- [ ] **Cenário 2: Arquivo não é movido**
  - **Dado que** salvei um trabalho de outra pessoa,
  - **Quando** o dono abre o Drive,
  - **Então** o arquivo continua na pasta dele e ele continua sendo o dono.
- [ ] **Cenário 3: PDF do trabalho**
  - **Dado que** o app grava o PDF compilado no Drive,
  - **Quando** o trabalho é de outra pessoa,
  - **Então** o PDF também não é movido para as minhas pastas.

### Regras de Negócio e Restrições

- [ ] O app só altera a pasta de um arquivo quando o usuário é o dono.
- [ ] Teste automatizado do fluxo de salvamento como convidado.

### Dependências / Informações Técnicas

- Arquitetura, problemas 2 e 3 e Opção A, item 4: usar `addParents` só quando `ownedByMe === true` e preservar `isSharedWithMe`.
- Relacionado: `src/core/storage/googleDriveService.ts` (salvamento e gravação do PDF), `src/hooks/useDriveSyncOrchestrator.ts`.

---

<!-- issue: {"id":"RDJ-03.11","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: editor","area: storage"],"ciclo":1} -->
## [RDJ-03.11] Abrir em modo somente leitura quando só tenho permissão de leitura

### Contexto / User Story

- **Como um** convidado com permissão só de leitura,
- **Eu quero** ler o trabalho sem conseguir alterá-lo por engano,
- **Para que** eu acompanhe o trabalho respeitando o que o dono permitiu.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Somente leitura**
  - **Dado que** tenho permissão de leitura no Drive,
  - **Quando** abro o trabalho,
  - **Então** o editor fica bloqueado para edição, aparece o aviso "Somente leitura" e consigo ver e baixar o PDF.
- [ ] **Cenário 2: Nunca grava**
  - **Dado que** estou em modo somente leitura,
  - **Quando** o app sincroniza,
  - **Então** ele nunca tenta gravar no arquivo.
- [ ] **Cenário 3: Permissão alterada**
  - **Dado que** o dono me deu permissão de edição,
  - **Quando** reabro o trabalho,
  - **Então** consigo editar.

### Regras de Negócio e Restrições

- [ ] A permissão vem sempre do Drive (`capabilities.canEdit`).

### Dependências / Informações Técnicas

- Depende de RDJ-03.9.
- Arquitetura, Opção A, item 5.

---

<!-- issue: {"id":"RDJ-03.12","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: G","area: infra","area: collaboration"],"ciclo":1} -->
## [RDJ-03.12] Conectar à colaboração em tempo real com segurança, em qualquer rede

### Contexto / User Story

- **Como um** estudante que edita com o orientador pela rede da universidade ou pelo 4G,
- **Eu quero** que a conexão de tempo real funcione em qualquer rede e que só quem tem acesso ao trabalho possa entrar,
- **Para que** a colaboração seja confiável e o meu texto fique protegido.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Entrada autorizada**
  - **Dado que** tenho permissão de edição no Drive,
  - **Quando** abro o trabalho,
  - **Então** conecto à sala de colaboração dele.
- [ ] **Cenário 2: Sem permissão**
  - **Dado que** não tenho acesso ao arquivo no Drive,
  - **Quando** tento conectar à sala,
  - **Então** a conexão é recusada.
- [ ] **Cenário 3: Só leitura**
  - **Dado que** tenho só permissão de leitura,
  - **Quando** conecto,
  - **Então** recebo as atualizações, mas não consigo enviar edições.
- [ ] **Cenário 4: Acesso revogado**
  - **Dado que** o dono removeu o meu acesso,
  - **Quando** a conexão é refeita,
  - **Então** sou desconectado da sala.
- [ ] **Cenário 5: Reinício do servidor**
  - **Dado que** o servidor reiniciou,
  - **Quando** os participantes reconectam,
  - **Então** a sala se recompõe a partir do estado de cada um, sem perder edições.
- [ ] **Cenário 6: Qualquer rede**
  - **Dado que** estou numa rede de universidade, 4G ou rede corporativa,
  - **Quando** abro o trabalho,
  - **Então** a conexão fecha normalmente.

### Regras de Negócio e Restrições

- [ ] Serviço `redija-collab` separado do `redija-import`, no Railway já contratado, sem hibernar (`sleepApplication: false`).
- [ ] A autorização usa o token do próprio usuário para consultar o arquivo no Drive (`files.get` com `capabilities.canEdit`).
- [ ] As salas ficam só em memória: nenhum conteúdo gravado em banco nem em log.
- [ ] CSP atualizada (`vercel.json`, `netlify.toml`) com o domínio `wss://` de produção e de dev.
- [ ] A política de privacidade é atualizada antes do deploy em produção.

### Dependências / Informações Técnicas

- Depende de RDJ-03.8.
- Arquitetura, Opção C: Hocuspocus (ou `y-websocket`) em `server-collab/`, entrada em `.railway/railway.ts`, `onAuthenticate` com validação no Drive.

---

<!-- issue: {"id":"RDJ-03.6","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: M","area: editor","area: collaboration"],"ciclo":1} -->
## [RDJ-03.6] Editar ao mesmo tempo, vendo quem está no documento

### Contexto / User Story

- **Como um** orientador numa reunião de orientação ao vivo com o aluno,
- **Eu quero** editar o trabalho ao mesmo tempo que ele, vendo onde cada um está escrevendo,
- **Para que** a gente discuta e corrija o texto juntos, como no Google Docs.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Edição simultânea**
  - **Dado que** duas pessoas estão com o mesmo trabalho aberto,
  - **Quando** uma delas digita,
  - **Então** a outra vê o texto aparecer em menos de 1 segundo, sem recarregar.
- [ ] **Cenário 2: Mesmo parágrafo**
  - **Dado que** as duas digitam no mesmo parágrafo,
  - **Quando** as edições se cruzam,
  - **Então** nenhuma sobrescreve a outra e o cursor de ninguém "pula".
- [ ] **Cenário 3: Presença e cursores**
  - **Dado que** há mais de uma pessoa no trabalho,
  - **Quando** olho o editor,
  - **Então** vejo no Header quem está online e, no texto, o cursor de cada pessoa com nome e cor.
- [ ] **Cenário 4: Arquivo oficial atualizado**
  - **Dado que** estamos editando juntos,
  - **Quando** ficamos 30 segundos sem digitar ou alguém fecha o trabalho,
  - **Então** o estado é gravado no Drive.
- [ ] **Cenário 5: Sem conexão com o servidor**
  - **Dado que** o servidor de colaboração está fora do ar,
  - **Quando** continuo editando,
  - **Então** o app avisa que estou sem tempo real e segue salvando pelo Drive (RDJ-03.5).

### Regras de Negócio e Restrições

- [ ] Funciona com mais de 5 pessoas no mesmo trabalho.
- [ ] Só quem tem permissão de edição grava no Drive.

### Dependências / Informações Técnicas

- Depende de RDJ-03.12 e RDJ-03.5.
- Arquitetura, Fase 2: `@hocuspocus/provider` e *awareness* para presença e cursores; indicadores no `Header` e no `Editor`.

---

<!-- issue: {"id":"RDJ-03.13","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: collaboration","area: infra"],"ciclo":1} -->
## [RDJ-03.13] Remover a colaboração P2P antiga

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** que a colaboração antiga por P2P seja desligada quando a nova estiver no ar,
- **Para que** o meu trabalho não passe por um servidor público de terceiros nem fique acessível a quem souber o identificador da sala.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Sem PeerJS**
  - **Dado que** a colaboração em tempo real nova está publicada,
  - **Quando** uso o app,
  - **Então** nenhuma requisição vai para `*.peerjs.com`.
- [ ] **Cenário 2: Código e dependências removidos**
  - **Dado que** o build é gerado,
  - **Quando** confiro o bundle e o `package.json`,
  - **Então** `peerjs`, `RealtimeCollabManager` e `useRealtimeCollab` não existem mais.
- [ ] **Cenário 3: CSP**
  - **Dado que** confiro a configuração de deploy,
  - **Quando** leio a CSP,
  - **Então** `*.peerjs.com` foi removido.

### Regras de Negócio e Restrições

- [ ] Sai na mesma entrega de RDJ-03.6, para nunca haver duas formas de tempo real ao mesmo tempo.

### Dependências / Informações Técnicas

- Depende de RDJ-03.6.
- Relacionado: `src/core/collaboration/RealtimeCollabManager.ts`, `src/hooks/useRealtimeCollab.ts`, `vercel.json`, `netlify.toml`.

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
  - **Quando** alguém edita o texto antes ou depois dele, inclusive ao mesmo tempo,
  - **Então** o comentário continua ancorado no mesmo trecho.
- [ ] **Cenário 6: Trecho apagado**
  - **Dado que** um trecho tem comentário,
  - **Quando** todo o trecho é apagado,
  - **Então** o comentário é mantido e marcado como "trecho removido".

### Regras de Negócio e Restrições

- [ ] Um comentário tem no máximo 5.000 caracteres.
- [ ] Comentar não altera o conteúdo do texto.
- [ ] Trechos comentados podem se sobrepor.
- [ ] Projetos sem comentários abrem sem erro.

### Dependências / Informações Técnicas

- Depende de RDJ-03.8.
- Arquitetura, Fase 3: âncoras com posições relativas do Yjs e threads (autor, data, texto, respostas, status) dentro do documento colaborativo.
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

<!-- issue: {"id":"RDJ-03.4","type":"Task","labels":["user story","categoria: essencial","prioridade: P1","esforco: P","area: storage","area: collaboration"],"ciclo":1} -->
## [RDJ-03.4] Manter os comentários salvos, sincronizados e fora do PDF

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** que os comentários fiquem salvos com o projeto, cheguem a todos os colaboradores e não apareçam no PDF,
- **Para que** eu não perca a revisão do orientador e entregue um PDF limpo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Persistência local**
  - **Dado que** criei comentários em um projeto,
  - **Quando** recarrego a página,
  - **Então** os comentários, as respostas e os status continuam lá.
- [ ] **Cenário 2: Sincronização**
  - **Dado que** o orientador e o aluno comentam o mesmo trabalho, ao mesmo tempo ou em momentos diferentes,
  - **Quando** os dois sincronizam (tempo real ou Drive),
  - **Então** todos os comentários e respostas aparecem para os dois, sem perda.
- [ ] **Cenário 3: Exportar e importar .redija**
  - **Dado que** o projeto tem comentários,
  - **Quando** exporto o `.redija` e o importo em outro navegador,
  - **Então** os comentários, as respostas, os autores e os status são preservados.
- [ ] **Cenário 4: PDF sem comentários**
  - **Dado que** o projeto tem comentários abertos,
  - **Quando** compilo ou exporto o PDF,
  - **Então** nenhum comentário nem destaque aparece no PDF.

### Regras de Negócio e Restrições

- [ ] A sincronização dos comentários usa o mesmo mecanismo do documento (RDJ-03.5 e RDJ-03.6), sem lógica de merge própria.
- [ ] A exportação `.docx` (RDJ-01) também não leva comentários na v1.

### Dependências / Informações Técnicas

- Depende de RDJ-03.1 e RDJ-03.5.
- O tempo real dos comentários vem de RDJ-03.6.

---

<!-- issue: {"id":"RDJ-03.14","type":"Task","labels":["user story","categoria: essencial","prioridade: P2","esforco: M","area: storage","area: editor"],"ciclo":1} -->
## [RDJ-03.14] Ver e restaurar versões anteriores do trabalho

### Contexto / User Story

- **Como um** estudante que edita o trabalho com outras pessoas,
- **Eu quero** ver versões anteriores do trabalho e restaurar uma delas,
- **Para que** eu recupere um texto apagado por engano, por mim ou por um colaborador.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Lista de versões**
  - **Dado que** o trabalho foi salvo várias vezes,
  - **Quando** abro "Histórico de versões",
  - **Então** vejo as versões com data, hora e autor.
- [ ] **Cenário 2: Visualizar**
  - **Dado que** escolhi uma versão,
  - **Quando** a abro,
  - **Então** vejo o conteúdo daquela versão sem alterar o trabalho atual.
- [ ] **Cenário 3: Restaurar**
  - **Dado que** estou vendo uma versão antiga,
  - **Quando** clico em "Restaurar" e confirmo,
  - **Então** o trabalho volta àquele conteúdo como uma nova versão, e a versão atual continua no histórico.

### Regras de Negócio e Restrições

- [ ] Restaurar nunca apaga versões.
- [ ] Só quem tem permissão de edição pode restaurar.
- [ ] Prioridade P2: entra depois dos comentários.

### Dependências / Informações Técnicas

- Depende de RDJ-03.5.
- Arquitetura, Fase 3: snapshots do Yjs ou `revisions` do Drive (decidir no início da história).

---

<!-- issue: {"id":"RDJ-03.15","type":"Task","labels":["user story","categoria: essencial","prioridade: P2","esforco: G","area: editor","area: collaboration"],"ciclo":1} -->
## [RDJ-03.15] Sugerir alterações no texto (modo sugestão)

### Contexto / User Story

- **Como um** orientador,
- **Eu quero** propor alterações no texto do aluno sem aplicá-las diretamente,
- **Para que** ele veja o que mudei, aprenda com a correção e decida o que aceitar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Ativar o modo sugestão**
  - **Dado que** tenho permissão de edição,
  - **Quando** ativo o "Modo sugestão" e edito o texto,
  - **Então** as inserções e exclusões aparecem marcadas, com meu nome, sem substituir o texto original.
- [ ] **Cenário 2: Aceitar**
  - **Dado que** há uma sugestão no texto,
  - **Quando** o aluno clica em "Aceitar",
  - **Então** a alteração é aplicada e a marcação some.
- [ ] **Cenário 3: Recusar**
  - **Dado que** há uma sugestão no texto,
  - **Quando** o aluno clica em "Recusar",
  - **Então** o texto volta ao original.
- [ ] **Cenário 4: PDF**
  - **Dado que** há sugestões pendentes,
  - **Quando** compilo o PDF,
  - **Então** o PDF mostra o texto sem as sugestões pendentes.

### Regras de Negócio e Restrições

- [ ] As sugestões ficam listadas no painel de comentários (RDJ-03.3), com filtro próprio.
- [ ] Prioridade P2: entra depois dos comentários.

### Dependências / Informações Técnicas

- Depende de RDJ-03.1 e RDJ-03.3.
