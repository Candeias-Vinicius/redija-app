# RDJ-04 — App Instalável e Offline (PWA)

<!-- issue: {"id":"RDJ-04","type":"Feature","labels":["epic","categoria: diferencial","prioridade: P1","esforco: P","area: infra"],"ciclo":1} -->
## [RDJ-04] Épico: App instalável e offline (PWA)

> **Épico** · 🚀 Diferencial · Prioridade **P1** · Esforço **P** · Ciclo 1 (Aquisição)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** instalar o Redija no meu computador ou celular e continuar escrevendo sem internet,
- **Para que** eu use o app na biblioteca, no ônibus ou com Wi-Fi ruim, como um aplicativo de verdade.

### Problema

O Redija já é local-first, mas o usuário precisa lembrar a URL e estar online para abrir o app. Hoje não há `manifest` nem service worker.

**Valor:** ícone na tela inicial e na barra de tarefas (lembrete visual diário), uso offline e sensação de app nativo. É também pré-requisito para os lembretes de RDJ-06 e para o cache offline de RDJ-09.

### Histórias (sub-issues)

- RDJ-04.1 · Instalar o Redija no computador e no celular
- RDJ-04.2 · Abrir o app e compilar o PDF sem internet
- RDJ-04.3 · Ser avisado quando houver uma nova versão do app
- RDJ-04.4 · Saber quando estou offline e quais funções dependem de internet

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] O Lighthouse aprova o app como PWA instalável no build de produção.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.

### Métrica de sucesso

Número de instalações (evento `appinstalled`) e retorno em 7 dias de usuários que instalaram contra os que não instalaram.

### Dependências / Informações Técnicas

- N/A.

---

<!-- issue: {"id":"RDJ-04.1","type":"Task","labels":["user story","categoria: diferencial","prioridade: P1","esforco: P","area: infra"],"ciclo":1} -->
## [RDJ-04.1] Instalar o Redija no computador e no celular

### Contexto / User Story

- **Como um** estudante que usa o Redija toda semana,
- **Eu quero** instalar o app e abri-lo por um ícone, em janela própria,
- **Para que** eu não precise lembrar a URL e tenha o Redija à mão como qualquer outro aplicativo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Instalação no desktop**
  - **Dado que** acesso o Redija no Chrome ou no Edge do computador,
  - **Quando** clico no ícone de instalar da barra de endereço ou no banner "Instalar o Redija",
  - **Então** o app é instalado e abre em janela própria, com nome e ícone do Redija.
- [ ] **Cenário 2: Instalação no Android**
  - **Dado que** acesso o Redija no Chrome do Android,
  - **Quando** escolho "Instalar app" ou "Adicionar à tela inicial",
  - **Então** o ícone do Redija aparece na tela inicial e abre o app em tela cheia, sem a barra do navegador.
- [ ] **Cenário 3: Banner dispensado**
  - **Dado que** o banner "Instalar o Redija" apareceu,
  - **Quando** clico em "Agora não",
  - **Então** o banner não reaparece por 30 dias.
- [ ] **Cenário 4: App já instalado**
  - **Dado que** já instalei o app,
  - **Quando** abro o Redija pelo ícone ou pelo navegador,
  - **Então** o banner de instalação não aparece.
- [ ] **Cenário 5: iOS**
  - **Dado que** acesso pelo Safari do iPhone, que não oferece instalação automática,
  - **Quando** abro o app pela primeira vez,
  - **Então** posso ver uma dica discreta de como usar "Compartilhar → Adicionar à Tela de Início".

### Regras de Negócio e Restrições

- [ ] O Lighthouse aprova o critério "Installable".
- [ ] O manifest declara nome, nome curto, ícones 192 px e 512 px (incluindo maskable), `theme_color`, `display: standalone` e `start_url`.
- [ ] O banner é discreto e nunca interrompe a escrita (não é modal).

### Dependências / Informações Técnicas

- Sugestão do backlog: `vite-plugin-pwa` (Workbox), configurado em `vite.config.ts`.
- Evento `beforeinstallprompt` para o banner próprio.

---

<!-- issue: {"id":"RDJ-04.2","type":"Task","labels":["user story","categoria: diferencial","prioridade: P1","esforco: M","area: infra"],"ciclo":1} -->
## [RDJ-04.2] Abrir o app e compilar o PDF sem internet

### Contexto / User Story

- **Como um** estudante que escreve na biblioteca, no ônibus ou com Wi-Fi ruim,
- **Eu quero** abrir meus projetos e compilar o PDF mesmo sem conexão,
- **Para que** a falta de internet não interrompa meu trabalho.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Abrir offline**
  - **Dado que** já acessei o Redija online pelo menos uma vez neste navegador,
  - **Quando** abro o app sem internet,
  - **Então** o app carrega normalmente.
- [ ] **Cenário 2: Projetos disponíveis offline**
  - **Dado que** tenho projetos salvos no navegador,
  - **Quando** abro o app sem internet,
  - **Então** vejo a lista de projetos e consigo abrir e editar qualquer um deles.
- [ ] **Cenário 3: Compilar PDF offline**
  - **Dado que** estou offline com um projeto aberto,
  - **Quando** compilo o PDF,
  - **Então** o PDF é gerado com as fontes corretas, como online.
- [ ] **Cenário 4: Pacotes Typst já usados**
  - **Dado que** um projeto usa um pacote do Typst Universe que já foi baixado antes,
  - **Quando** compilo offline,
  - **Então** a compilação usa o pacote em cache.
- [ ] **Cenário 5: Primeiro acesso sem internet**
  - **Dado que** nunca acessei o Redija neste navegador,
  - **Quando** tento abrir o app offline,
  - **Então** vejo uma página amigável pedindo conexão para o primeiro acesso.

### Regras de Negócio e Restrições

- [ ] O shell do app é pré-armazenado (precache) na primeira visita.
- [ ] Os arquivos `.wasm` do Typst e as fontes de `public/fonts` usam cache-first, por serem grandes e versionados.
- [ ] A documentação usa network-first.
- [ ] O precache não inclui a documentação nem recursos opcionais, para não atrasar o primeiro acesso.

### Dependências / Informações Técnicas

- Depende de RDJ-04.1.
- Relacionado: `src/core/typst/`, `src/core/universe/` (`universeResolver`), `public/fonts`.

---

<!-- issue: {"id":"RDJ-04.3","type":"Task","labels":["user story","categoria: diferencial","prioridade: P1","esforco: P","area: infra"],"ciclo":1} -->
## [RDJ-04.3] Ser avisado quando houver uma nova versão do app

### Contexto / User Story

- **Como um** estudante que deixa o Redija aberto ou instalado,
- **Eu quero** ser avisado quando sair uma versão nova e escolher a hora de atualizar,
- **Para que** eu receba correções sem perder o que estou escrevendo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Aviso de nova versão**
  - **Dado que** uma nova versão foi publicada enquanto o app estava aberto,
  - **Quando** o app detecta a atualização,
  - **Então** aparece o aviso "Nova versão disponível" com o botão "Recarregar".
- [ ] **Cenário 2: Atualizar sem perder dados**
  - **Dado que** tenho alterações ainda não salvas,
  - **Quando** clico em "Recarregar",
  - **Então** o app salva o projeto antes e reabre na nova versão com tudo preservado.
- [ ] **Cenário 3: Ignorar o aviso**
  - **Dado que** o aviso apareceu,
  - **Quando** o fecho sem recarregar,
  - **Então** a nova versão é aplicada na próxima vez que eu abrir o app.
- [ ] **Cenário 4: Service worker sempre atual**
  - **Dado que** um novo deploy foi feito,
  - **Quando** o navegador verifica atualizações,
  - **Então** recebe o `sw.js` novo, sem cache agressivo do servidor.

### Regras de Negócio e Restrições

- [ ] O app nunca recarrega sozinho enquanto há edição em andamento.
- [ ] `netlify.toml` e `vercel.json` servem `sw.js` e `manifest.webmanifest` com `Cache-Control: no-cache`.

### Dependências / Informações Técnicas

- Depende de RDJ-04.1.

---

<!-- issue: {"id":"RDJ-04.4","type":"Task","labels":["user story","categoria: diferencial","prioridade: P1","esforco: P","area: infra","area: editor"],"ciclo":1} -->
## [RDJ-04.4] Saber quando estou offline e quais funções dependem de internet

### Contexto / User Story

- **Como um** estudante usando o app sem conexão,
- **Eu quero** ver claramente que estou offline e quais funções estão indisponíveis,
- **Para que** eu não perca tempo com ações que falhariam sem explicação.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Indicador offline**
  - **Dado que** estou usando o app,
  - **Quando** a conexão cai,
  - **Então** o Header mostra o indicador "Offline".
- [ ] **Cenário 2: Ações online-only desabilitadas**
  - **Dado que** estou offline,
  - **Quando** passo o mouse ou toco em sincronizar com o Drive, buscar DOI/ISBN, importar documento, iniciar sessão colaborativa ou compartilhar,
  - **Então** a ação aparece desabilitada, com uma explicação de que precisa de internet.
- [ ] **Cenário 3: Conexão restabelecida**
  - **Dado que** estava offline,
  - **Quando** a conexão volta,
  - **Então** o indicador some, as ações voltam a funcionar e as alterações feitas offline sincronizam com o Drive.
- [ ] **Cenário 4: Falha de rede inesperada**
  - **Dado que** o navegador indica que estou online, mas uma requisição falha por rede,
  - **Quando** a falha acontece,
  - **Então** vejo uma mensagem clara, sem erro silencioso.

### Regras de Negócio e Restrições

- [ ] Nenhuma ação online-only falha em silêncio.
- [ ] As mensagens são em PT-BR e dizem o que o usuário pode fazer.
- [ ] Funções que passarem a depender de rede no futuro (ex.: exportar `.docx` pelo servidor, RDJ-01) seguem o mesmo padrão.

### Dependências / Informações Técnicas

- Depende de RDJ-04.2.
- Relacionado: `src/components/Header.tsx`, `src/core/storage/googleDriveService.ts`, `src/core/collaboration/RealtimeCollabManager.ts`.
