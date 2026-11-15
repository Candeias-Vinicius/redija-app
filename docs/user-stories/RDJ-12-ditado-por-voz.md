# RDJ-12 — Ditado por Voz com Formalização

<!-- issue: {"id":"RDJ-12","type":"Feature","labels":["epic","categoria: inovacao","prioridade: P3","esforco: P","area: editor","accessibility"],"ciclo":3} -->
## [RDJ-12] Épico: Ditado por voz com formalização

> **Épico** · 💡 Inovação · Prioridade **P3** · Esforço **P** · Ciclo 3 (Inovação)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** ditar meu raciocínio e ver o texto entrar no bloco atual, e opcionalmente transformá-lo em linguagem acadêmica,
- **Para que** eu escreva mesmo quando travo diante do teclado.

### Problema

Muitos estudantes explicam bem as ideias falando, mas travam ao escrever. Usuários com deficiência motora, dislexia ou LER também precisam de alternativas ao teclado.

**Valor:** acessibilidade real, combate ao bloqueio criativo e um recurso muito demonstrável em vídeo.

### Histórias (sub-issues)

- RDJ-12.1 · Ditar texto por voz no bloco atual
- RDJ-12.2 · Formalizar o trecho ditado com IA

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero (Web Speech API do navegador).

### Métrica de sucesso

Usuários únicos que usam o ditado por semana.

### Dependências / Informações Técnicas

- Nenhuma para o ditado. RDJ-10 para a formalização.

---

<!-- issue: {"id":"RDJ-12.1","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor","accessibility","good first issue"],"ciclo":3} -->
## [RDJ-12.1] Ditar texto por voz no bloco atual

### Contexto / User Story

- **Como um** estudante que pensa melhor falando, ou que tem dificuldade de usar o teclado,
- **Eu quero** ditar o texto e vê-lo entrar no bloco em que estou,
- **Para que** eu escreva sem depender do teclado.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Iniciar o ditado**
  - **Dado que** uso um navegador com suporte a reconhecimento de voz e estou com o cursor num bloco de texto,
  - **Quando** clico no microfone da barra do editor ou uso o comando `/ditar` e permito o acesso ao microfone,
  - **Então** um indicador "Gravando" fica visível e o que eu falo em português entra no bloco, na posição do cursor.
- [ ] **Cenário 2: Comandos de pontuação**
  - **Dado que** o ditado está ativo,
  - **Quando** falo "vírgula", "ponto final", "ponto de interrogação" ou "nova linha",
  - **Então** o sinal correspondente é inserido, em vez da palavra.
- [ ] **Cenário 3: Parar o ditado**
  - **Dado que** o ditado está ativo,
  - **Quando** clico no microfone de novo ou pressiono `Esc`,
  - **Então** a gravação para e o indicador some.
- [ ] **Cenário 4: Navegador sem suporte**
  - **Dado que** meu navegador não suporta reconhecimento de voz,
  - **Quando** abro o editor,
  - **Então** o botão de microfone não aparece, e o comando `/ditar` explica quais navegadores suportam o recurso.
- [ ] **Cenário 5: Microfone bloqueado**
  - **Dado que** neguei o acesso ao microfone,
  - **Quando** tento ditar,
  - **Então** vejo como liberar o microfone nas configurações do navegador.
- [ ] **Cenário 6: Aviso de privacidade**
  - **Dado que** é a primeira vez que uso o ditado,
  - **Quando** clico no microfone,
  - **Então** vejo o aviso de que, no Chrome, o áudio é processado pelos servidores do Google.

### Regras de Negócio e Restrições

- [ ] O idioma do reconhecimento é pt-BR.
- [ ] O texto ainda não confirmado aparece em cinza e é fixado quando a frase termina.
- [ ] O indicador "Gravando" usa texto e ícone, não só cor.
- [ ] O botão de microfone é acessível por teclado e tem rótulo para leitores de tela.

### Dependências / Informações Técnicas

- Web Speech API (`SpeechRecognition`), gratuita. Hoje o suporte está principalmente no Chrome e no Edge.
- Relacionado: `src/components/editor/SlashCommandMenu.tsx`.

---

<!-- issue: {"id":"RDJ-12.2","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor","accessibility"],"ciclo":3} -->
## [RDJ-12.2] Formalizar o trecho ditado com IA

### Contexto / User Story

- **Como um** estudante que acabou de ditar uma ideia em linguagem falada,
- **Eu quero** transformar o trecho ditado em linguagem acadêmica com um clique,
- **Para que** eu aproveite o ditado sem precisar reescrever tudo.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Formalizar**
  - **Dado que** ditei um trecho e tenho a IA configurada,
  - **Quando** clico em "Formalizar" ao fim do ditado,
  - **Então** vejo a versão acadêmica lado a lado com o trecho ditado, com "Aceitar" e "Recusar".
- [ ] **Cenário 2: Sem IA configurada**
  - **Dado que** não configurei a IA,
  - **Quando** clico em "Formalizar",
  - **Então** sou levado ao passo a passo de configuração da chave.
- [ ] **Cenário 3: Recusar**
  - **Dado que** a sugestão está na tela,
  - **Quando** clico em "Recusar",
  - **Então** o trecho ditado fica como estava.

### Regras de Negócio e Restrições

- [ ] Só o trecho ditado na última sessão de ditado é enviado à IA, não o documento inteiro.
- [ ] Segue as mesmas regras de comparação, aceite e privacidade de RDJ-10.3.

### Dependências / Informações Técnicas

- Depende de RDJ-12.1, RDJ-10.2 e RDJ-10.3.
