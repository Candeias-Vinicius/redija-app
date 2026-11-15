# RDJ-05 — Checklist "Pronto para Entregar"

<!-- issue: {"id":"RDJ-05","type":"Feature","labels":["epic","categoria: diferencial","prioridade: P2","esforco: M","area: transpiler","area: sidebar"],"ciclo":2} -->
## [RDJ-05] Épico: Checklist "Pronto para Entregar"

> **Épico** · 🚀 Diferencial · Prioridade **P2** · Esforço **P/M** · Ciclo 2 (Retenção e viralidade)

### Contexto / User Story

- **Como um** estudante prestes a entregar o trabalho,
- **Eu quero** ver uma nota e uma lista do que falta,
- **Para que** eu tenha certeza de que meu trabalho atende à norma antes de entregar.

### Problema

O maior medo de quem entrega um TCC é a reprovação formal: esquecer a folha de aprovação, resumo fora do limite, figura sem fonte, citação sem referência. Os linters já detectam muito disso, mas como lista de avisos, sem uma visão de "estou pronto?".

**Valor:** segurança na reta final, com baixo custo, porque reaproveita o motor de linters.

### Histórias (sub-issues)

- RDJ-05.1 · Ver a nota de conformidade do trabalho
- RDJ-05.2 · Conferir o checklist estrutural do meu tipo de trabalho e norma
- RDJ-05.3 · Encontrar citações sem referência e referências não citadas
- RDJ-05.4 · Revisar o trabalho na tela "Verificar antes de entregar"

### Critérios de Aceite do Épico

- [ ] Todas as sub-issues concluídas e validadas localmente.
- [ ] Os 9 modelos iniciais, sem alterações, não geram nenhum item pendente falso.

### Regras de Negócio e Restrições

- [ ] Não exige banco de dados próprio.
- [ ] Não armazena dados do usuário em servidor do projeto.
- [ ] Custo de infraestrutura zero.
- [ ] **Fórmula da nota (decidida no refinamento):** começa em 100; cada item estrutural obrigatório ausente desconta 15, cada aviso (`warning`) desconta 5 e cada informação (`info`) desconta 1; a nota mínima é 0. Faixas: verde ≥ 90, amarelo 70–89, vermelho < 70.

### Métrica de sucesso

Uso do botão "Verificar antes de entregar" e nota média dos projetos exportados.

### Dependências / Informações Técnicas

- N/A. Fica melhor com RDJ-02 (itens específicos de cada instituição).

---

<!-- issue: {"id":"RDJ-05.1","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: transpiler","area: sidebar"],"ciclo":2} -->
## [RDJ-05.1] Ver a nota de conformidade do trabalho

### Contexto / User Story

- **Como um** estudante revisando o trabalho,
- **Eu quero** ver uma nota de 0 a 100 que resume a conformidade com a norma,
- **Para que** eu saiba de relance o quanto falta para entregar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Trabalho sem pendências**
  - **Dado que** o projeto não tem nenhuma pendência,
  - **Quando** abro a seção de verificação da sidebar,
  - **Então** vejo a nota 100 em verde, com o rótulo "Pronto".
- [ ] **Cenário 2: Cálculo com pendências**
  - **Dado que** o projeto tem 1 item estrutural ausente, 2 avisos e 3 informações,
  - **Quando** a nota é calculada,
  - **Então** a nota é 72 (100 − 15 − 10 − 3), em amarelo, com o rótulo "Atenção".
- [ ] **Cenário 3: Nota mínima**
  - **Dado que** os descontos somam mais de 100,
  - **Quando** a nota é calculada,
  - **Então** a nota exibida é 0, em vermelho, com o rótulo "Crítico".
- [ ] **Cenário 4: Atualização em tempo real**
  - **Dado que** corrigi uma pendência,
  - **Quando** os linters rodam de novo,
  - **Então** a nota é recalculada no mesmo ciclo de atualização dos avisos.
- [ ] **Cenário 5: Verificação pausada**
  - **Dado que** pausei o verificador ABNT,
  - **Quando** olho a seção de verificação,
  - **Então** a nota não é exibida e aparece "Verificação pausada".

### Regras de Negócio e Restrições

- [ ] Fórmula: 100 − 15 × (itens estruturais ausentes) − 5 × (`warning`) − 1 × (`info`), com mínimo 0.
- [ ] Faixas: verde ≥ 90 ("Pronto"), amarelo 70–89 ("Atenção"), vermelho < 70 ("Crítico").
- [ ] Avisos com o mesmo `id` contam uma única vez.
- [ ] A cor nunca é o único indicador: sempre há rótulo e ícone (acessibilidade).
- [ ] A fórmula fica em uma função pura, coberta por testes unitários.

### Dependências / Informações Técnicas

- Até RDJ-05.2 ficar pronta, a nota usa só `warning` e `info`.
- Severidades atuais: `'warning' | 'info'` (`AbntWarning` em `src/core/transpiler/abntLinter.ts`).
- Relacionado: `src/core/transpiler/linters/index.ts`, `src/components/sidebar/SidebarLinterSection.tsx`.

---

<!-- issue: {"id":"RDJ-05.2","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: transpiler"],"ciclo":2} -->
## [RDJ-05.2] Conferir o checklist estrutural do meu tipo de trabalho e norma

### Contexto / User Story

- **Como um** estudante que vai entregar um TCC, dissertação ou artigo,
- **Eu quero** uma lista dos elementos obrigatórios do meu tipo de trabalho, com o que está ok e o que falta,
- **Para que** eu não seja reprovado por um erro formal.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Trabalho acadêmico ABNT (NBR 14724)**
  - **Dado que** meu projeto é um TCC na norma ABNT,
  - **Quando** abro o checklist,
  - **Então** vejo os itens capa, folha de rosto, folha de aprovação, resumo, abstract, sumário e referências, cada um marcado como ok ou pendente.
- [ ] **Cenário 2: Resumo fora do limite (NBR 6028)**
  - **Dado que** o resumo de um trabalho acadêmico tem 120 palavras,
  - **Quando** o checklist é calculado,
  - **Então** o item aparece pendente com "O resumo deve ter entre 150 e 500 palavras (atual: 120)".
- [ ] **Cenário 3: Limite de resumo para artigo**
  - **Dado que** meu projeto é um artigo,
  - **Quando** o checklist é calculado,
  - **Então** o limite verificado é de 100 a 250 palavras.
- [ ] **Cenário 4: Palavras-chave**
  - **Dado que** informei 2 ou 6 palavras-chave,
  - **Quando** o checklist é calculado,
  - **Então** o item aparece pendente com "Informe de 3 a 5 palavras-chave".
- [ ] **Cenário 5: Figuras e tabelas sem legenda ou fonte**
  - **Dado que** há figuras ou tabelas sem legenda ou sem fonte,
  - **Quando** o checklist é calculado,
  - **Então** cada uma é listada como pendente, identificada pela posição no documento.
- [ ] **Cenário 6: Outras normas**
  - **Dado que** meu projeto usa IEEE, SBC ou pôster,
  - **Quando** abro o checklist,
  - **Então** vejo só os itens obrigatórios daquela norma e daquele tipo de trabalho.
- [ ] **Cenário 7: Ficha catalográfica**
  - **Dado que** o modelo do projeto exige ficha catalográfica,
  - **Quando** abro o checklist,
  - **Então** vejo um lembrete com link para o gerador da biblioteca da instituição, que não desconta da nota.

### Regras de Negócio e Restrições

- [ ] Cada item estrutural obrigatório ausente desconta 15 pontos da nota (RDJ-05.1).
- [ ] Lembretes (como a ficha catalográfica) não descontam pontos.
- [ ] Nenhum item novo gera falso positivo nos 9 modelos iniciais (teste automatizado).
- [ ] Cada regra nova tem teste unitário.
- [ ] As regras aceitam extensão por modelo institucional (RDJ-02), sem alterar o código das regras base.

### Dependências / Informações Técnicas

- Depende de RDJ-05.1.
- Integração opcional com RDJ-02.1 para itens específicos de cada instituição.
- Relacionado: `src/core/templates/templateCapabilities.ts`, `src/components/sidebar/SidebarAbstractSection.tsx`.

---

<!-- issue: {"id":"RDJ-05.3","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: P","area: transpiler","area: references"],"ciclo":2} -->
## [RDJ-05.3] Encontrar citações sem referência e referências não citadas

### Contexto / User Story

- **Como um** estudante com muitas referências,
- **Eu quero** saber quais citações não têm referência e quais referências nunca foram citadas,
- **Para que** minha lista de referências bata exatamente com o texto.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Citação órfã**
  - **Dado que** o texto cita uma referência que não existe no projeto,
  - **Quando** o checklist é calculado,
  - **Então** aparece o aviso "Citação sem referência: <identificação>", com link para o trecho.
- [ ] **Cenário 2: Referência não citada**
  - **Dado que** uma referência cadastrada nunca é citada no texto,
  - **Quando** o checklist é calculado,
  - **Então** aparece a informação "Referência não citada: <título>", com link para a referência.
- [ ] **Cenário 3: Tudo consistente**
  - **Dado que** todas as citações têm referência e todas as referências são citadas,
  - **Quando** o checklist é calculado,
  - **Então** o item "Citações e referências" aparece como ok.

### Regras de Negócio e Restrições

- [ ] Citação sem referência conta como `warning` (−5 na nota).
- [ ] Referência não citada conta como `info` (−1 na nota).
- [ ] Se o `sanityLinter` já detectar parte disso, a regra é reaproveitada, sem duplicar avisos.

### Dependências / Informações Técnicas

- Depende de RDJ-05.1.
- Relacionado: `src/core/transpiler/linters/sanityLinter.ts`, `src/components/sidebar/SidebarReferencesSection.tsx`.

---

<!-- issue: {"id":"RDJ-05.4","type":"Task","labels":["user story","categoria: diferencial","prioridade: P2","esforco: M","area: sidebar","area: editor"],"ciclo":2} -->
## [RDJ-05.4] Revisar o trabalho na tela "Verificar antes de entregar"

### Contexto / User Story

- **Como um** estudante na reta final,
- **Eu quero** uma tela única com a nota e todas as pendências, que me leve direto a cada correção,
- **Para que** eu resolva tudo com rapidez antes de exportar.

### Critérios de Aceite (Formato BDD)

- [ ] **Cenário 1: Abrir a verificação**
  - **Dado que** estou editando um projeto,
  - **Quando** clico em "Verificar antes de entregar",
  - **Então** abre uma tela cheia com a nota e as pendências agrupadas em Estrutura, Conteúdo, Citações e referências, e Formatação, com contadores por grupo.
- [ ] **Cenário 2: Ir até a pendência**
  - **Dado que** a tela de verificação está aberta,
  - **Quando** clico em uma pendência,
  - **Então** a tela fecha e o editor rola até o bloco ou o campo relacionado, destacando-o.
- [ ] **Cenário 3: Trabalho pronto**
  - **Dado que** não há nenhuma pendência,
  - **Quando** abro a verificação,
  - **Então** vejo uma mensagem de parabéns e o atalho "Baixar PDF".
- [ ] **Cenário 4: Fechar**
  - **Dado que** a tela de verificação está aberta,
  - **Quando** pressiono `Esc` ou clico em fechar,
  - **Então** volto ao editor na mesma posição.

### Regras de Negócio e Restrições

- [ ] A verificação é orientativa: nunca bloqueia a exportação.
- [ ] A tela é navegável só pelo teclado.
- [ ] O botão fica no Header ou no menu de exportação, próximo de "Baixar PDF".

### Dependências / Informações Técnicas

- Depende de RDJ-05.1, RDJ-05.2 e RDJ-05.3.
