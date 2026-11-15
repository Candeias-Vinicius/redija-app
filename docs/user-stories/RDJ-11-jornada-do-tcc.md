# RDJ-11 — Jornada do TCC (gamificação)

<!-- issue: {"id":"RDJ-11","type":"Feature","labels":["epic","categoria: inovacao","prioridade: P3","esforco: M","area: editor","area: landing"],"ciclo":3} -->
## [RDJ-11] Épico: Jornada do TCC com conquistas e sequência de dias

> **Épico** · 💡 Inovação · Prioridade **P3** · Esforço **M** · Ciclo 3 (Inovação)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** ganhar conquistas ao avançar no trabalho e compartilhar marcos como "Terminei meu TCC!" nas redes sociais,
- **Para que** a escrita de um trabalho longo tenha pequenas vitórias no caminho.

### Problema

Escrever um trabalho longo é solitário e desmotivante, sem pequenas vitórias no caminho.

**Valor:** retenção (sequências e conquistas incentivam o retorno diário) e marketing espontâneo (cartões compartilháveis chegam ao público exato: colegas de turma).

### Histórias (sub-issues)

- RDJ-11.1 · Desbloquear conquistas ao avançar no trabalho
- RDJ-11.2 · Manter uma sequência de dias escrevendo
- RDJ-11.3 · Compartilhar um cartão de conquista nas redes sociais
- RDJ-11.4 · Ver a linha do tempo do meu trabalho em "Minha Jornada"
- RDJ-11.5 · Desligar a gamificação

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Nada é público por padrão: não há ranking nem perfil público.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.
- [ ] **Dia ativo (decidido no refinamento):** pelo menos 50 palavras líquidas no dia, no fuso horário local (mesma regra de RDJ-06).

### Métrica de sucesso

Cartões compartilhados por semana e diferença de retenção em 30 dias entre quem desbloqueia conquistas e quem não desbloqueia.

### Dependências / Informações Técnicas

- RDJ-06 (histórico diário de palavras). Fica melhor com RDJ-05 (nota) e RDJ-09 (slides).

---

<!-- issue: {"id":"RDJ-11.1","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor"],"ciclo":3} -->
## [RDJ-11.1] Desbloquear conquistas ao avançar no trabalho

### Contexto / User Story

- **Como um** estudante escrevendo um trabalho longo,
- **Eu quero** ser reconhecido quando atinjo marcos como "10 mil palavras" ou "50 referências",
- **Para que** eu me sinta progredindo e continue motivado.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Desbloqueio**
  - **Dado que** meu projeto tem 990 palavras,
  - **Quando** passo de 1.000 palavras,
  - **Então** aparece uma notificação discreta "Conquista desbloqueada: Mil palavras", sem tirar o foco do editor.
- [ ] **Cenário 2: Sem repetição**
  - **Dado que** já desbloqueei uma conquista,
  - **Quando** apago texto e volto a passar do marco,
  - **Então** a notificação não aparece de novo.
- [ ] **Cenário 3: Lista de conquistas**
  - **Dado que** abri a lista de conquistas,
  - **Quando** a lista carrega,
  - **Então** vejo as desbloqueadas, com data, e as bloqueadas, com o que falta para cada uma.
- [ ] **Cenário 4: Conquistas de funcionalidades futuras**
  - **Dado que** uma conquista depende de uma funcionalidade ainda não lançada (ex.: nota 100 no checklist, slides gerados),
  - **Quando** abro a lista,
  - **Então** essa conquista não aparece.

### Regras de Negócio e Restrições

- [ ] Pelo menos 12 conquistas são detectadas automaticamente. Catálogo sugerido:
  - Primeira referência; 10, 50 e 100 referências.
  - 1 mil, 10 mil e 30 mil palavras.
  - Primeira figura; sumário completo.
  - Sequência de 3, 7 e 30 dias (RDJ-11.2).
  - Zero avisos ABNT; nota 100 no checklist (RDJ-05); "Defesa pronta" (gerou slides, RDJ-09).
- [ ] Conquistas nunca são perdidas depois de desbloqueadas.
- [ ] Conquistas de contagem são por projeto. As de sequência são da conta.
- [ ] Os dados ficam no navegador e no Drive do usuário.

### Dependências / Informações Técnicas

- As conquistas de sequência dependem de RDJ-11.2.
- Conquistas opcionais dependem de RDJ-05 e RDJ-09.

---

<!-- issue: {"id":"RDJ-11.2","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor"],"ciclo":3} -->
## [RDJ-11.2] Manter uma sequência de dias escrevendo

### Contexto / User Story

- **Como um** estudante que quer criar o hábito de escrever,
- **Eu quero** ver quantos dias seguidos escrevi,
- **Para que** eu tenha um motivo para voltar todos os dias.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Dia ativo**
  - **Dado que** minha sequência está em 4 dias,
  - **Quando** escrevo pelo menos 50 palavras líquidas hoje, em qualquer projeto,
  - **Então** a sequência passa para 5.
- [ ] **Cenário 2: Dia perdido**
  - **Dado que** ontem não tive um dia ativo,
  - **Quando** abro o app hoje,
  - **Então** a sequência volta a 0 e o recorde é mantido.
- [ ] **Cenário 3: Visibilidade**
  - **Dado que** tenho uma sequência ativa,
  - **Quando** olho o painel de metas,
  - **Então** vejo a sequência atual e o meu recorde.
- [ ] **Cenário 4: Vários dispositivos**
  - **Dado que** escrevi em dois dispositivos,
  - **Quando** eles sincronizam pelo Drive,
  - **Então** a sequência é a mesma nos dois.

### Regras de Negócio e Restrições

- [ ] Dia ativo = pelo menos 50 palavras líquidas no dia, somando todos os projetos, no fuso horário local.
- [ ] A sequência e o recorde ficam no navegador e no Drive do usuário.

### Dependências / Informações Técnicas

- Depende de RDJ-06.3 (histórico diário de palavras).

---

<!-- issue: {"id":"RDJ-11.3","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor","area: landing"],"ciclo":3} -->
## [RDJ-11.3] Compartilhar um cartão de conquista nas redes sociais

### Contexto / User Story

- **Como um** estudante orgulhoso de um marco,
- **Eu quero** gerar um cartão bonito da conquista e postar no Instagram ou no LinkedIn,
- **Para que** eu comemore com colegas e amigos.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Gerar o cartão**
  - **Dado que** desbloqueei uma conquista,
  - **Quando** clico em "Compartilhar",
  - **Então** vejo a prévia do cartão com a conquista, o meu progresso e o selo "Feito com Redija", nos formatos 1:1 (1080×1080) e 9:16 (1080×1920).
- [ ] **Cenário 2: Compartilhamento nativo**
  - **Dado que** meu dispositivo suporta o compartilhamento nativo,
  - **Quando** confirmo o compartilhamento,
  - **Então** abre a janela de compartilhamento do sistema com a imagem.
- [ ] **Cenário 3: Sem compartilhamento nativo**
  - **Dado que** meu navegador não suporta o compartilhamento nativo,
  - **Quando** confirmo,
  - **Então** a imagem PNG é baixada.
- [ ] **Cenário 4: Privacidade do conteúdo**
  - **Dado que** estou gerando o cartão,
  - **Quando** vejo a prévia,
  - **Então** o título do trabalho só aparece se eu marcar "Mostrar o título do trabalho".

### Regras de Negócio e Restrições

- [ ] A imagem é gerada no navegador, sem upload para nenhum servidor.
- [ ] O cartão nunca inclui trechos do texto do trabalho.

### Dependências / Informações Técnicas

- Depende de RDJ-11.1.
- Sugestão do backlog: canvas → PNG e Web Share API.

---

<!-- issue: {"id":"RDJ-11.4","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor"],"ciclo":3} -->
## [RDJ-11.4] Ver a linha do tempo do meu trabalho em "Minha Jornada"

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** ver a linha do tempo do meu trabalho, do primeiro dia até a entrega,
- **Para que** eu enxergue o caminho que já percorri.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Linha do tempo**
  - **Dado que** tenho um projeto com histórico,
  - **Quando** abro "Minha Jornada",
  - **Então** vejo, em ordem cronológica, a criação do projeto, as conquistas, os marcos (RDJ-06) e as exportações de PDF.
- [ ] **Cenário 2: Projeto novo**
  - **Dado que** acabei de criar o projeto,
  - **Quando** abro "Minha Jornada",
  - **Então** vejo um estado inicial que explica como a jornada é preenchida.

### Regras de Negócio e Restrições

- [ ] A jornada é privada, sem versão pública.
- [ ] Cada evento da linha do tempo pode virar um cartão compartilhável (RDJ-11.3).

### Dependências / Informações Técnicas

- Depende de RDJ-11.1.
- Usa os marcos de RDJ-06.1, se existirem.

---

<!-- issue: {"id":"RDJ-11.5","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor"],"ciclo":3} -->
## [RDJ-11.5] Desligar a gamificação

### Contexto / User Story

- **Como um** estudante que prefere uma interface sem distrações,
- **Eu quero** desligar conquistas, sequências e notificações de gamificação,
- **Para que** eu me concentre só no texto.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Desligar**
  - **Dado que** a gamificação está ligada,
  - **Quando** desligo "Mostrar conquistas e sequência" nas configurações,
  - **Então** as notificações de conquista, o contador de sequência e "Minha Jornada" deixam de aparecer.
- [ ] **Cenário 2: Religar**
  - **Dado que** desliguei a gamificação,
  - **Quando** a religo,
  - **Então** vejo as conquistas desbloqueadas enquanto estava desligada, sem receber uma enxurrada de notificações.

### Regras de Negócio e Restrições

- [ ] A preferência fica salva na conta e sincroniza entre dispositivos.
- [ ] A gamificação vem ligada por padrão.

### Dependências / Informações Técnicas

- Depende de RDJ-11.1.
- Relacionado: `src/components/AccountSettingsModal.tsx`.
