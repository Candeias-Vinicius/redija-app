# RDJ-08 — Link de Leitura Compartilhável

<!-- issue: {"id":"RDJ-08","type":"Feature","labels":["epic","categoria: diferencial","prioridade: P2","esforco: M","area: storage","area: infra"],"ciclo":2} -->
## [RDJ-08] Épico: Link de leitura compartilhável

> **Épico** · 🚀 Diferencial · Prioridade **P2** · Esforço **M** · Ciclo 2 (Retenção e viralidade)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** gerar um link de visualização do meu trabalho para enviar a qualquer pessoa, sem que ela precise de login,
- **Para que** banca, colegas e família leiam o trabalho sem que eu precise mandar o PDF por WhatsApp.

### Problema

Hoje compartilhar exige convidar por e-mail uma pessoa com conta Google (`ShareModal`). Para mostrar o trabalho à banca, a colegas ou à família, o usuário baixa o PDF e manda por WhatsApp, e o Redija some da história.

**Valor:** viralidade. Cada link aberto apresenta o Redija a alguém novo ("Feito com Redija · Crie o seu grátis"). Também facilita a vida do orientador que não quer criar conta.

### Histórias (sub-issues)

- RDJ-08.1 · Spike: validar a leitura anônima de arquivos pela Drive API
- RDJ-08.2 · Publicar um link de leitura do meu trabalho
- RDJ-08.3 · Ler um trabalho compartilhado sem precisar de login
- RDJ-08.4 · Revogar o link ou atualizar a versão publicada

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Fluxo ponta a ponta: o estudante gera o link, uma janela anônima abre e lê o PDF, e o link revogado deixa de funcionar.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto: os arquivos ficam no Drive do próprio usuário (BYOS).
- [ ] Custo de infraestrutura zero.

### Métrica de sucesso

Links gerados, visualizações por link e porcentagem de visitantes de `/ler` que criam conta.

### Dependências / Informações Técnicas

- N/A. Combina com RDJ-03 (orientador sem conta).

---

<!-- issue: {"id":"RDJ-08.1","type":"Task","labels":["spike","categoria: diferencial","prioridade: P2","esforco: P","area: infra","area: storage"],"ciclo":2} -->
## [RDJ-08.1] Spike: validar a leitura anônima de arquivos pela Drive API

### Contexto / User Story

- **Como um** time de desenvolvimento,
- **Eu quero** validar se uma API key restrita por referrer consegue baixar arquivos públicos do Drive sem OAuth, e com quais limites,
- **Para que** a arquitetura do link de leitura seja decidida antes da implementação, sem custo e sem servidor próprio.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Prova de conceito**
  - **Dado que** um PDF criado pelo app foi compartilhado como "qualquer pessoa com o link: leitor",
  - **Quando** uma página sem login o baixa pela Drive API com a API key restrita,
  - **Então** o PDF é exibido no navegador, e o código da prova de conceito fica registrado.
- [ ] **Cenário 2: Limites documentados**
  - **Dado que** a prova de conceito funciona,
  - **Quando** o spike termina,
  - **Então** há um documento de decisão (ADR) em `docs/` com cotas, limites de tamanho, comportamento com arquivos grandes (aviso de verificação de vírus do Drive), CORS e confirmação de custo zero.
- [ ] **Cenário 3: Plano B**
  - **Dado que** a cota da API pode estourar,
  - **Quando** o ADR é escrito,
  - **Então** ele define o fallback (ex.: link direto do Drive) e como detectá-lo.
- [ ] **Cenário 4: Prévia nas redes sociais**
  - **Dado que** robôs de redes sociais não executam JavaScript,
  - **Quando** o ADR é escrito,
  - **Então** ele define como gerar as tags Open Graph com o título do trabalho (ex.: função serverless que lê só os metadados) sem trafegar o arquivo por servidor do projeto.

### Regras de Negócio e Restrições

- [ ] Timebox de 3 dias.
- [ ] A entrega é o ADR com a recomendação, não a funcionalidade pronta.
- [ ] A solução escolhida não pode exigir OAuth do leitor nem servidor que guarde arquivos.

### Dependências / Informações Técnicas

- Escopo `drive.file` (permite compartilhar arquivos criados pelo app).
- A pasta `api/` já existe para funções serverless (Vercel).

---

<!-- issue: {"id":"RDJ-08.2","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: storage"],"ciclo":2} -->
## [RDJ-08.2] Publicar um link de leitura do meu trabalho

### Contexto / User Story

- **Como um** estudante que quer mostrar o trabalho à banca ou à família,
- **Eu quero** gerar com um clique um link público de leitura,
- **Para que** qualquer pessoa leia o trabalho sem login e sem eu mandar arquivos.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Aviso antes de publicar**
  - **Dado que** meu projeto está salvo no Drive,
  - **Quando** clico em "Gerar link de leitura" no compartilhamento,
  - **Então** vejo o aviso "Qualquer pessoa com o link poderá ler este trabalho" e preciso confirmar.
- [ ] **Cenário 2: Link gerado**
  - **Dado que** confirmei o aviso,
  - **Quando** a publicação termina,
  - **Então** o PDF compilado é salvo no meu Drive com permissão "qualquer pessoa com o link: leitor", e o link `/ler/<id>` é exibido e copiado para a área de transferência.
- [ ] **Cenário 3: Projeto fora do Drive**
  - **Dado que** meu projeto ainda não está salvo no Drive,
  - **Quando** abro o compartilhamento,
  - **Então** a opção de link aparece desabilitada, explicando que é preciso salvar no Drive primeiro.
- [ ] **Cenário 4: Incluir o arquivo .redija**
  - **Dado que** estou gerando o link,
  - **Quando** marco "Permitir baixar o projeto (.redija)",
  - **Então** o `.redija` também é publicado e o leitor vê a opção de baixá-lo.
- [ ] **Cenário 5: Falha na publicação**
  - **Dado que** a publicação falha (sem internet, sem permissão ou cota),
  - **Quando** o erro acontece,
  - **Então** vejo uma mensagem clara e nenhum link pela metade fica ativo.

### Regras de Negócio e Restrições

- [ ] A opção "Permitir baixar o projeto (.redija)" vem desmarcada por padrão.
- [ ] A seção mostra a data e a hora da versão publicada.
- [ ] Nenhum arquivo trafega por servidor do projeto.

### Dependências / Informações Técnicas

- Depende de RDJ-08.1.
- Relacionado: `src/components/ShareModal.tsx`, `src/core/storage/googleDriveService.ts`.

---

<!-- issue: {"id":"RDJ-08.3","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: landing","area: infra"],"ciclo":2} -->
## [RDJ-08.3] Ler um trabalho compartilhado sem precisar de login

### Contexto / User Story

- **Como um** leitor sem conta no Redija (orientador, membro da banca, colega ou familiar),
- **Eu quero** abrir o link e ler o PDF direto no navegador,
- **Para que** eu acompanhe o trabalho sem instalar nada nem criar conta.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Leitura sem login**
  - **Dado que** recebi um link de leitura válido,
  - **Quando** o abro numa janela anônima,
  - **Então** vejo o PDF do trabalho, sem pedido de login.
- [ ] **Cenário 2: Chamada para o Redija**
  - **Dado que** estou lendo um trabalho,
  - **Quando** chego ao rodapé da página,
  - **Então** vejo "Feito com Redija · Crie o seu trabalho grátis", com link para a landing.
- [ ] **Cenário 3: Prévia ao compartilhar**
  - **Dado que** colei o link no WhatsApp ou no LinkedIn,
  - **Quando** a prévia é gerada,
  - **Então** ela mostra o título do trabalho e a marca do Redija.
- [ ] **Cenário 4: Baixar o PDF**
  - **Dado que** estou lendo um trabalho,
  - **Quando** clico em "Baixar PDF",
  - **Então** o arquivo é baixado.
- [ ] **Cenário 5: Link revogado ou inexistente**
  - **Dado que** o link foi revogado ou não existe,
  - **Quando** o abro,
  - **Então** vejo "Este trabalho não está mais disponível", com a chamada para conhecer o Redija.
- [ ] **Cenário 6: Cota esgotada**
  - **Dado que** a cota da Drive API foi atingida,
  - **Quando** abro o link,
  - **Então** o fallback definido no spike é usado e consigo ler o trabalho.

### Regras de Negócio e Restrições

- [ ] O leitor nunca precisa de login.
- [ ] A API key é restrita por referrer ao domínio do app.
- [ ] Nenhum arquivo trafega por servidor do projeto.

### Dependências / Informações Técnicas

- Depende de RDJ-08.1 e RDJ-08.2.
- Visualizador: reaproveitar `src/components/PdfPreview.tsx`, se possível.
- Nova rota pública `/ler/:fileId` (ajustar rewrites em `netlify.toml` e `vercel.json`).

---

<!-- issue: {"id":"RDJ-08.4","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: storage"],"ciclo":2} -->
## [RDJ-08.4] Revogar o link ou atualizar a versão publicada

### Contexto / User Story

- **Como um** estudante que publicou um link de leitura,
- **Eu quero** revogar o link quando quiser e atualizar a versão publicada após novas edições,
- **Para que** eu controle quem lê e o que é lido.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Revogar**
  - **Dado que** tenho um link de leitura ativo,
  - **Quando** clico em "Revogar link" e confirmo,
  - **Então** a permissão pública é removida no Drive e quem abrir o link vê "Este trabalho não está mais disponível".
- [ ] **Cenário 2: Versão desatualizada**
  - **Dado que** editei o trabalho depois de publicar,
  - **Quando** abro o compartilhamento,
  - **Então** vejo "A versão publicada está desatualizada" e o botão "Atualizar versão publicada".
- [ ] **Cenário 3: Atualizar mantendo o link**
  - **Dado que** a versão publicada está desatualizada,
  - **Quando** clico em "Atualizar versão publicada",
  - **Então** o PDF publicado é substituído e o link continua o mesmo.
- [ ] **Cenário 4: Excluir projeto com link ativo**
  - **Dado que** o projeto tem link ativo,
  - **Quando** excluo o projeto,
  - **Então** o app pergunta se quero revogar o link também.

### Regras de Negócio e Restrições

- [ ] Atualizar a versão nunca muda o link.
- [ ] Revogar pede confirmação.

### Dependências / Informações Técnicas

- Depende de RDJ-08.2.
