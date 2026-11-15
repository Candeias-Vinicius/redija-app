# RDJ-10 — Assistente de Escrita Acadêmica com IA (BYOK / local)

<!-- issue: {"id":"RDJ-10","type":"Feature","labels":["epic","categoria: inovacao","prioridade: P3","esforco: G","area: editor"],"ciclo":3} -->
## [RDJ-10] Épico: Assistente de escrita acadêmica com IA (chave própria ou local)

> **Épico** · 💡 Inovação · Prioridade **P3** · Esforço **G** · Ciclo 3 (Inovação)

### Contexto / User Story

- **Como um** estudante,
- **Eu quero** selecionar um parágrafo e pedir "deixar mais acadêmico", e gerar sugestões de resumo e de palavras-chave a partir do meu texto,
- **Para que** eu escreva em linguagem científica sem copiar e colar no ChatGPT.

### Problema

Estudantes travam ao transformar ideias em linguagem científica (registro formal, coesão, voz impessoal) e ao produzir resumo, abstract e palavras-chave. Hoje eles copiam o texto para um chat de IA e voltam para o editor.

**Valor:** IA dentro do editor atrai usuários. Com a chave do próprio usuário (BYOK) ou um modelo local, o custo para o projeto é zero e a privacidade fica preservada.

### Histórias (sub-issues)

- RDJ-10.1 · Spike: validar chamadas de IA direto do navegador
- RDJ-10.2 · Configurar minha própria chave de IA
- RDJ-10.3 · Reescrever um trecho em linguagem acadêmica
- RDJ-10.4 · Gerar sugestões de resumo e palavras-chave
- RDJ-10.5 · Traduzir o resumo para abstract
- RDJ-10.6 · Usar IA local no navegador, sem chave (experimental)

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Nenhuma requisição de IA passa por servidor do projeto.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo zero para o projeto: o usuário usa a própria chave (BYOK) ou um modelo local.
- [ ] **Posicionamento ético:** o assistente é revisor, não escritor. Toda sugestão aparece lado a lado com o original, o usuário aceita ou recusa, e um aviso lembra as regras de integridade acadêmica da instituição. Não existe "gerar capítulo inteiro".

### Métrica de sucesso

Porcentagem de usuários com IA configurada e taxa de aceitação das sugestões.

### Dependências / Informações Técnicas

- N/A. Habilita melhorias em RDJ-09 (resumo das seções) e RDJ-12 (formalização do ditado).

---

<!-- issue: {"id":"RDJ-10.1","type":"Task","labels":["spike","categoria: inovacao","prioridade: P3","esforco: P","area: editor"],"ciclo":3} -->
## [RDJ-10.1] Spike: validar chamadas de IA direto do navegador

### Contexto / User Story

- **Como um** time de desenvolvimento,
- **Eu quero** confirmar quais provedores de IA aceitam chamadas direto do navegador e em que condições,
- **Para que** o assistente funcione sem servidor do projeto e dentro dos termos de uso de cada provedor.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Provedores com chave própria**
  - **Dado que** os candidatos são Google Gemini e OpenAI (e outros que o time julgar relevantes),
  - **Quando** o spike termina,
  - **Então** há um ADR em `docs/` com, para cada um: suporte a CORS, termos de uso para chamadas do navegador, plano gratuito disponível e limites.
- [ ] **Cenário 2: Modo local**
  - **Dado que** o modo local usaria WebLLM/WebGPU,
  - **Quando** o spike termina,
  - **Então** o ADR indica os modelos pequenos viáveis em PT-BR, o tamanho do download e os navegadores compatíveis.
- [ ] **Cenário 3: Privacidade**
  - **Dado que** o texto do usuário vai para o provedor escolhido,
  - **Quando** o spike termina,
  - **Então** há um rascunho do texto de privacidade que será exibido ao usuário.
- [ ] **Cenário 4: Prova de conceito**
  - **Dado que** um provedor foi recomendado,
  - **Quando** a prova de conceito roda,
  - **Então** uma chamada de reescrita sai do navegador para o provedor e retorna a sugestão.

### Regras de Negócio e Restrições

- [ ] Timebox de 3 dias.
- [ ] A entrega é o ADR com a recomendação, não a funcionalidade pronta.

### Dependências / Informações Técnicas

- N/A.

---

<!-- issue: {"id":"RDJ-10.2","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor"],"ciclo":3} -->
## [RDJ-10.2] Configurar minha própria chave de IA

### Contexto / User Story

- **Como um** estudante que quer usar o assistente,
- **Eu quero** configurar minha própria chave de IA, com um passo a passo para obter uma gratuita,
- **Para que** eu use o assistente sem custo para o projeto e com meus dados sob meu controle.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Configurar e testar**
  - **Dado que** estou em Configurações da conta → "Assistente de IA",
  - **Quando** escolho o Google Gemini, colo minha chave e clico em "Testar conexão",
  - **Então** vejo "Conexão funcionando" e a chave fica salva só neste navegador.
- [ ] **Cenário 2: Chave inválida**
  - **Dado que** colei uma chave inválida,
  - **Quando** clico em "Testar conexão",
  - **Então** vejo "Chave inválida. Confira se copiou a chave inteira" e nada é salvo.
- [ ] **Cenário 3: Sem chave configurada**
  - **Dado que** não configurei nenhuma chave,
  - **Quando** tento usar uma ação de IA,
  - **Então** vejo um onboarding com o passo a passo para obter a chave gratuita do Gemini.
- [ ] **Cenário 4: Remover a chave**
  - **Dado que** tenho uma chave salva,
  - **Quando** clico em "Remover chave",
  - **Então** a chave é apagada do navegador e as ações de IA voltam ao estado "não configurado".
- [ ] **Cenário 5: Cota esgotada**
  - **Dado que** minha cota no provedor acabou,
  - **Quando** uso uma ação de IA,
  - **Então** vejo uma mensagem dizendo que a cota acabou e o que posso fazer.

### Regras de Negócio e Restrições

- [ ] A chave fica só no armazenamento local do navegador (IndexedDB). Nunca vai para o JSON do projeto, para o Drive, para o arquivo `.redija` nem para servidor do projeto.
- [ ] A chave aparece mascarada na interface.
- [ ] Antes de ativar, o usuário vê o aviso de privacidade: o texto enviado vai para o provedor escolhido.

### Dependências / Informações Técnicas

- Depende de RDJ-10.1.
- Relacionado: `src/components/AccountSettingsModal.tsx`.

---

<!-- issue: {"id":"RDJ-10.3","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor"],"ciclo":3} -->
## [RDJ-10.3] Reescrever um trecho em linguagem acadêmica

### Contexto / User Story

- **Como um** estudante que escreveu um parágrafo informal,
- **Eu quero** pedir uma sugestão em linguagem acadêmica e comparar com o original antes de aceitar,
- **Para que** eu melhore o texto sem perder o controle do que escrevi.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Pedir sugestão**
  - **Dado que** tenho a IA configurada e selecionei um trecho,
  - **Quando** escolho "Deixar mais acadêmico", "Melhorar coesão" ou "Resumir" no menu de seleção ou no comando `/ia`,
  - **Então** vejo a sugestão lado a lado com o original, com as diferenças destacadas.
- [ ] **Cenário 2: Aceitar**
  - **Dado que** a sugestão está na tela,
  - **Quando** clico em "Aceitar",
  - **Então** o trecho é substituído e `Ctrl+Z` desfaz a substituição.
- [ ] **Cenário 3: Recusar**
  - **Dado que** a sugestão está na tela,
  - **Quando** clico em "Recusar",
  - **Então** o texto original fica intacto.
- [ ] **Cenário 4: Citações e equações preservadas**
  - **Dado que** o trecho tem citações ou equações,
  - **Quando** a sugestão é gerada sem alguma delas,
  - **Então** a sugestão aparece com o alerta "Esta sugestão removeu citações ou equações".
- [ ] **Cenário 5: Erro ou demora**
  - **Dado que** o provedor falhou ou demorou mais de 30 segundos,
  - **Quando** o erro acontece,
  - **Então** vejo uma mensagem clara e o texto original fica intacto.
- [ ] **Cenário 6: Aviso de integridade**
  - **Dado que** é a primeira vez que uso o assistente,
  - **Quando** peço uma sugestão,
  - **Então** vejo um aviso sobre as regras de integridade acadêmica da minha instituição.

### Regras de Negócio e Restrições

- [ ] O texto nunca é alterado sem o usuário clicar em "Aceitar".
- [ ] A seleção tem no máximo 3.000 caracteres por pedido.
- [ ] Não há ação para gerar capítulos ou seções inteiras.

### Dependências / Informações Técnicas

- Depende de RDJ-10.2.
- Relacionado: `src/components/editor/SlashCommandMenu.tsx`.

---

<!-- issue: {"id":"RDJ-10.4","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor","area: sidebar"],"ciclo":3} -->
## [RDJ-10.4] Gerar sugestões de resumo e palavras-chave

### Contexto / User Story

- **Como um** estudante que terminou o texto,
- **Eu quero** gerar uma sugestão de resumo dentro do limite da norma e sugestões de palavras-chave,
- **Para que** eu tenha um ponto de partida para os elementos pré-textuais.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Sugerir resumo**
  - **Dado que** tenho a IA configurada e o texto tem pelo menos 500 palavras,
  - **Quando** clico em "Sugerir resumo" na seção Resumo,
  - **Então** recebo uma sugestão dentro do limite da norma (150 a 500 palavras em trabalhos acadêmicos; 100 a 250 em artigos).
- [ ] **Cenário 2: Resumo já preenchido**
  - **Dado que** o resumo já tem texto,
  - **Quando** peço uma sugestão,
  - **Então** vejo as diferenças entre o resumo atual e a sugestão, com "Aceitar" e "Recusar".
- [ ] **Cenário 3: Sugestão fora do limite**
  - **Dado que** a sugestão ficou fora do limite de palavras,
  - **Quando** ela aparece,
  - **Então** a contagem é destacada e aceitar exige uma confirmação extra.
- [ ] **Cenário 4: Palavras-chave**
  - **Dado que** tenho a IA configurada,
  - **Quando** clico em "Sugerir palavras-chave",
  - **Então** recebo de 3 a 5 sugestões e escolho quais adicionar.
- [ ] **Cenário 5: Texto curto**
  - **Dado que** o texto tem menos de 500 palavras,
  - **Quando** tento sugerir o resumo,
  - **Então** vejo um aviso de que o texto ainda é curto para um bom resumo.

### Regras de Negócio e Restrições

- [ ] O limite de palavras vem da norma do projeto.
- [ ] Usa o mesmo componente de comparação e aceite de RDJ-10.3.

### Dependências / Informações Técnicas

- Depende de RDJ-10.2 e RDJ-10.3.
- Relacionado: `src/components/sidebar/SidebarAbstractSection.tsx`.

---

<!-- issue: {"id":"RDJ-10.5","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: P","area: editor","area: sidebar"],"ciclo":3} -->
## [RDJ-10.5] Traduzir o resumo para abstract

### Contexto / User Story

- **Como um** estudante que precisa entregar o abstract,
- **Eu quero** gerar a tradução do resumo para o inglês acadêmico,
- **Para que** eu tenha uma boa base para revisar, em vez de traduzir do zero.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Gerar abstract**
  - **Dado que** o resumo está preenchido e a IA está configurada,
  - **Quando** clico em "Gerar abstract",
  - **Então** a tradução aparece no campo abstract, com "Aceitar" e "Recusar".
- [ ] **Cenário 2: Keywords**
  - **Dado que** tenho palavras-chave,
  - **Quando** gero o abstract,
  - **Então** as keywords traduzidas também são sugeridas.
- [ ] **Cenário 3: Resumo vazio**
  - **Dado que** o resumo está vazio,
  - **Quando** olho a seção abstract,
  - **Então** o botão "Gerar abstract" fica desabilitado, com uma explicação.

### Regras de Negócio e Restrições

- [ ] Se o abstract já tiver texto, a sugestão aparece como comparação, sem sobrescrever nada.

### Dependências / Informações Técnicas

- Depende de RDJ-10.2 e RDJ-10.4.

---

<!-- issue: {"id":"RDJ-10.6","type":"Task","labels":["user story","categoria: inovacao","prioridade: P3","esforco: M","area: editor"],"ciclo":3} -->
## [RDJ-10.6] Usar IA local no navegador, sem chave (experimental)

### Contexto / User Story

- **Como um** estudante que não quer criar chave nem enviar meu texto a terceiros,
- **Eu quero** usar um modelo de IA que roda no meu próprio navegador,
- **Para que** eu tenha sugestões com total privacidade, até offline.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Navegador compatível**
  - **Dado que** meu navegador suporta WebGPU,
  - **Quando** escolho "Modo local (experimental)",
  - **Então** vejo o tamanho do download e, ao confirmar, uma barra de progresso.
- [ ] **Cenário 2: Uso offline**
  - **Dado que** o modelo foi baixado,
  - **Quando** uso as ações de reescrita sem internet,
  - **Então** as sugestões são geradas localmente.
- [ ] **Cenário 3: Navegador incompatível**
  - **Dado que** meu navegador não suporta WebGPU,
  - **Quando** abro as configurações de IA,
  - **Então** a opção aparece desabilitada, com uma explicação.
- [ ] **Cenário 4: Remover o modelo**
  - **Dado que** baixei o modelo,
  - **Quando** clico em "Remover modelo local",
  - **Então** o espaço em disco é liberado.

### Regras de Negócio e Restrições

- [ ] O modo é rotulado como experimental.
- [ ] O download só começa depois de o usuário confirmar o tamanho.
- [ ] As ações usam o mesmo fluxo de comparação e aceite de RDJ-10.3.

### Dependências / Informações Técnicas

- Depende de RDJ-10.1 e RDJ-10.3.
- Sugestão do backlog: WebLLM/WebGPU.
