# RDJ-06 — Painel de Prazos e Metas

<!-- issue: {"id":"RDJ-06","type":"Feature","labels":["epic","categoria: diferencial","prioridade: P2","esforco: M","area: editor"],"ciclo":2} -->
## [RDJ-06] Épico: Painel de prazos e metas de escrita

> **Épico** · 🚀 Diferencial · Prioridade **P2** · Esforço **M** · Ciclo 2 (Retenção e viralidade)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** informar a data de entrega e a meta de tamanho do trabalho,
- **Para que** eu saiba quanto escrever por dia e acompanhe meu progresso.

### Problema

A procrastinação é a dor emocional nº 1 do TCC e da dissertação. O estudante não sabe quanto precisa escrever por dia e só percebe o atraso perto da entrega.

**Valor:** cria hábito diário (o usuário volta para bater a meta) e transforma o Redija em companheiro do processo, não só em formatador.

### Histórias (sub-issues)

- RDJ-06.1 · Definir prazo, meta e marcos do trabalho
- RDJ-06.2 · Ver quanto preciso escrever hoje
- RDJ-06.3 · Acompanhar o progresso por capítulo e o histórico diário
- RDJ-06.4 · Exportar prazos e marcos para minha agenda
- RDJ-06.5 · Receber lembrete da meta diária com o app aberto

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Nenhum dado de prazo, meta ou histórico sai do navegador ou do Drive do usuário.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.
- [ ] **Dia ativo (decidido no refinamento):** um dia conta como ativo quando o usuário escreve pelo menos **50 palavras líquidas** (palavras adicionadas menos removidas), considerando o fuso horário local. A mesma regra vale para a sequência de dias de RDJ-11.

### Fora de escopo

- Notificações push com o app fechado (exigiriam servidor de push).

### Métrica de sucesso

Porcentagem de projetos com prazo definido e dias ativos por semana desses usuários.

### Dependências / Informações Técnicas

- RDJ-04 (opcional, para notificações na PWA). Este épico é base para RDJ-11.

---

<!-- issue: {"id":"RDJ-06.1","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: editor"],"ciclo":2} -->
## [RDJ-06.1] Definir prazo, meta e marcos do trabalho

### Contexto / User Story

- **Como um** estudante que acabou de começar o TCC,
- **Eu quero** registrar a data de entrega, a meta de tamanho e os marcos de cada capítulo,
- **Para que** o Redija me ajude a planejar a escrita até a entrega.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Definir prazo e meta**
  - **Dado que** estou nas configurações do projeto,
  - **Quando** informo a data de entrega ou de defesa e a meta total em palavras ou em páginas, e salvo,
  - **Então** os dados ficam salvos no projeto e o painel de metas passa a usá-los.
- [ ] **Cenário 2: Data no passado**
  - **Dado que** estou definindo o prazo,
  - **Quando** informo uma data anterior a hoje,
  - **Então** vejo a mensagem "A data de entrega deve ser hoje ou depois" e nada é salvo.
- [ ] **Cenário 3: Marcos por capítulo**
  - **Dado que** o projeto tem títulos de nível 1,
  - **Quando** adiciono um marco escolhendo um capítulo e uma data (ex.: "Referencial até 10/03"),
  - **Então** o marco aparece na lista de marcos e no painel.
- [ ] **Cenário 4: Marco depois da entrega**
  - **Dado que** estou adicionando um marco,
  - **Quando** escolho uma data posterior à entrega,
  - **Então** vejo um aviso, mas posso salvar.
- [ ] **Cenário 5: Projeto sem prazo**
  - **Dado que** não defini prazo,
  - **Quando** abro o painel de metas,
  - **Então** vejo um convite para definir prazo e meta.

### Regras de Negócio e Restrições

- [ ] A meta pode ser em palavras (padrão) ou em páginas.
- [ ] Meta em páginas usa a contagem de páginas textuais do último PDF compilado.
- [ ] Prazo, meta e marcos ficam no JSON do projeto e sincronizam pelo Drive.
- [ ] Todos os campos são opcionais e editáveis a qualquer momento.

### Dependências / Informações Técnicas

- N/A (base do épico).
- Relacionado: `src/types/document.ts`, `src/core/storage/schemaNormalizer.ts`.

---

<!-- issue: {"id":"RDJ-06.2","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: editor"],"ciclo":2} -->
## [RDJ-06.2] Ver quanto preciso escrever hoje

### Contexto / User Story

- **Como um** estudante com prazo definido,
- **Eu quero** ver a meta de palavras de hoje e quanto falta para alcançá-la,
- **Para que** eu transforme o trabalho grande em pequenas tarefas diárias.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Cálculo da meta diária**
  - **Dado que** a meta total é 20.000 palavras, o projeto tem 8.000 e faltam 30 dias (contando hoje),
  - **Quando** abro o projeto,
  - **Então** a meta de hoje é 400 palavras.
- [ ] **Cenário 2: Progresso do dia**
  - **Dado que** a meta de hoje é 400 e já escrevi 250 palavras líquidas,
  - **Quando** olho o painel,
  - **Então** vejo "Faltam 150 palavras para a meta de hoje".
- [ ] **Cenário 3: Meta do dia atingida**
  - **Dado que** escrevi a meta do dia,
  - **Quando** a contagem passa da meta,
  - **Então** o indicador muda para "Meta de hoje concluída".
- [ ] **Cenário 4: Recálculo após dias parados**
  - **Dado que** fiquei 3 dias sem escrever,
  - **Quando** abro o projeto,
  - **Então** a meta de hoje é recalculada com o que falta e os dias restantes.
- [ ] **Cenário 5: Prazo encerrado**
  - **Dado que** a data de entrega já passou,
  - **Quando** abro o painel,
  - **Então** vejo "Prazo encerrado" e a opção de atualizar a data.
- [ ] **Cenário 6: Meta total atingida**
  - **Dado que** o projeto já tem a quantidade de palavras da meta total,
  - **Quando** abro o painel,
  - **Então** vejo "Meta total atingida" em vez da meta diária.

### Regras de Negócio e Restrições

- [ ] Meta diária = arredondar para cima ((meta total − total atual) ÷ dias restantes, contando hoje).
- [ ] A meta do dia é fixada na primeira abertura do dia. Ela só é recalculada no dia seguinte ou quando o usuário muda o prazo ou a meta, para não "fugir" enquanto ele escreve.
- [ ] Os dias são corridos (v1).
- [ ] A contagem de palavras é a mesma já usada pelo linter.

### Dependências / Informações Técnicas

- Depende de RDJ-06.1.

---

<!-- issue: {"id":"RDJ-06.3","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: editor","area: storage"],"ciclo":2} -->
## [RDJ-06.3] Acompanhar o progresso por capítulo e o histórico diário

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** ver o progresso de cada capítulo e um histórico de quanto escrevi por dia,
- **Para que** eu perceba atrasos cedo e me motive com a constância.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Progresso total e por capítulo**
  - **Dado que** o projeto tem meta e títulos de nível 1,
  - **Quando** abro o painel de metas,
  - **Então** vejo uma barra de progresso total e, para cada capítulo, o número de palavras.
- [ ] **Cenário 2: Marco atrasado**
  - **Dado que** a data de um marco passou e o capítulo não foi concluído,
  - **Quando** abro o painel,
  - **Então** o marco aparece destacado como atrasado.
- [ ] **Cenário 3: Histórico diário**
  - **Dado que** escrevi em vários dias,
  - **Quando** abro o histórico,
  - **Então** vejo um gráfico de barras com as palavras líquidas de cada um dos últimos 30 dias, com os dias ativos destacados.
- [ ] **Cenário 4: Persistência e sincronização**
  - **Dado que** tenho histórico registrado,
  - **Quando** recarrego a página ou abro o projeto em outro dispositivo após sincronizar,
  - **Então** o histórico é o mesmo.
- [ ] **Cenário 5: Projeto importado**
  - **Dado que** criei um projeto importando um documento de 10.000 palavras,
  - **Quando** o histórico começa,
  - **Então** a importação não conta como palavras escritas no dia.

### Regras de Negócio e Restrições

- [ ] Palavras líquidas do dia = total de palavras no último salvamento do dia − total no fim do último dia registrado.
- [ ] Dia ativo = pelo menos 50 palavras líquidas no dia, no fuso horário local.
- [ ] Ao mesclar dados de dois dispositivos, vale o registro mais recente de cada dia.
- [ ] O histórico fica no JSON do projeto e sincroniza pelo Drive. Nenhum dado sai do navegador ou do Drive do usuário.

### Dependências / Informações Técnicas

- Depende de RDJ-06.1.
- Merge em `src/core/storage/projectMerger.ts`.

---

<!-- issue: {"id":"RDJ-06.4","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: editor"],"ciclo":2} -->
## [RDJ-06.4] Exportar prazos e marcos para minha agenda

### Contexto / User Story

- **Como um** estudante que organiza a vida pela agenda do celular,
- **Eu quero** levar a data de entrega e os marcos para o Google Agenda ou o Outlook,
- **Para que** eu receba lembretes mesmo com o Redija fechado.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Baixar arquivo .ics**
  - **Dado que** defini prazo e marcos,
  - **Quando** clico em "Adicionar à agenda" e escolho "Baixar arquivo (.ics)",
  - **Então** baixo um arquivo com um evento para a entrega e um para cada marco.
- [ ] **Cenário 2: Compatibilidade**
  - **Dado que** baixei o `.ics`,
  - **Quando** o importo no Google Agenda e no Outlook,
  - **Então** os eventos aparecem nas datas certas, como eventos de dia inteiro, com lembrete um dia antes.
- [ ] **Cenário 3: Link direto para o Google Agenda**
  - **Dado que** defini o prazo,
  - **Quando** clico em "Adicionar ao Google Agenda",
  - **Então** abre uma nova aba com o evento da entrega pré-preenchido.
- [ ] **Cenário 4: Reexportar após mudança**
  - **Dado que** já exportei e depois mudei uma data,
  - **Quando** exporto e importo de novo,
  - **Então** os eventos existentes são atualizados, sem duplicar, nas agendas que respeitam o identificador do evento.
- [ ] **Cenário 5: Sem prazo**
  - **Dado que** não defini prazo,
  - **Quando** abro o painel,
  - **Então** a opção "Adicionar à agenda" fica desabilitada, com uma explicação.

### Regras de Negócio e Restrições

- [ ] O arquivo segue o padrão iCalendar (RFC 5545).
- [ ] Cada evento tem um identificador (UID) estável por projeto e marco.
- [ ] O arquivo é gerado no navegador, sem nenhum servidor.

### Dependências / Informações Técnicas

- Depende de RDJ-06.1.

---

<!-- issue: {"id":"RDJ-06.5","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: editor"],"ciclo":2} -->
## [RDJ-06.5] Receber lembrete da meta diária com o app aberto

### Contexto / User Story

- **Como um** estudante que deixa o Redija aberto ou instalado,
- **Eu quero** um lembrete no fim do dia se ainda não bati a meta,
- **Para que** eu não deixe o dia passar sem escrever.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Ativar lembretes**
  - **Dado que** estou no painel de metas,
  - **Quando** ativo "Lembrete diário" e o navegador pede permissão,
  - **Então** posso escolher o horário do lembrete (padrão: 20h).
- [ ] **Cenário 2: Lembrete enviado**
  - **Dado que** os lembretes estão ativos, o app está aberto e a meta de hoje não foi atingida,
  - **Quando** chega o horário escolhido,
  - **Então** recebo uma notificação "Faltam X palavras para a meta de hoje".
- [ ] **Cenário 3: Meta atingida**
  - **Dado que** já atingi a meta de hoje,
  - **Quando** chega o horário do lembrete,
  - **Então** nenhuma notificação é enviada.
- [ ] **Cenário 4: Permissão negada**
  - **Dado que** neguei a permissão de notificações,
  - **Quando** abro a configuração de lembretes,
  - **Então** vejo como reativar a permissão no navegador e nenhuma notificação é enviada.

### Regras de Negócio e Restrições

- [ ] A permissão só é pedida depois de uma ação explícita do usuário, nunca ao carregar a página.
- [ ] No máximo 1 lembrete por dia.
- [ ] Os lembretes podem ser desligados a qualquer momento.
- [ ] Fora de escopo: notificação com o app fechado.

### Dependências / Informações Técnicas

- Depende de RDJ-06.2.
- Opcional: RDJ-04.1 (PWA instalada aumenta a chance de o app estar aberto).
- Notification API do navegador.
