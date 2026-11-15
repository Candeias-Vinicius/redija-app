# User Stories — Backlog de Funcionalidades Aprovadas

> **Origem:** Backlog de Ideias Aprovadas da sessão de Product Discovery de 15/11/2026 (v0.3.0-beta).
> **Kanban:** [RedijaApp · Roadmap de Produto](https://github.com/orgs/project-rev/projects/2)

Cada arquivo `RDJ-XX-*.md` reúne um **épico** e suas **histórias**, no formato usado nas Issues do GitHub:

- **Contexto / User Story:** Como um / Eu quero / Para que.
- **Critérios de Aceite (Formato BDD):** cenários Dado que / Quando / Então, em checklist.
- **Regras de Negócio e Restrições:** checklist.
- **Dependências / Informações Técnicas.**

O comentário `<!-- issue: {...} -->` antes de cada título guarda os metadados (id, tipo, labels e ciclo) usados para cadastrar a issue.

## Decisões de refinamento

| Tema | Decisão |
| :--- | :--- |
| Escopo | Os 12 épicos foram detalhados e cadastrados. Ciclo 1 entra em `Pronto p/ Dev`; ciclos 2 e 3 entram em `Backlog`. |
| Estrutura no GitHub | Épico = issue pai (tipo Feature, label `epic`). História = sub-issue (tipo Task, label `user story`). Spike = Task com label `spike`. |
| Nota de conformidade (RDJ-05) | Começa em 100. Item estrutural obrigatório ausente −15, `warning` −5, `info` −1, mínimo 0. Verde ≥ 90, amarelo 70–89, vermelho < 70. |
| Modelos iniciais (RDJ-02) | USP, UNICAMP, UFMG, IFSP e uma instituição particular de grande porte (a definir por quem assumir a issue). |
| Dia ativo (RDJ-06/RDJ-11) | Pelo menos 50 palavras líquidas (adicionadas − removidas) no dia, no fuso horário local. |
| Compartilhamento e colaboração (RDJ-03) | O épico segue as 3 fases de [`arquitetura-compartilhamento-colaboracao.md`](../arquitetura-compartilhamento-colaboracao.md): base Yjs e Drive, tempo real com servidor no Railway e revisão (comentários, histórico e sugestões). O link de leitura sem login continua separado (RDJ-08). |

## Regra de ouro

Nenhuma funcionalidade pode exigir banco de dados próprio nem armazenar dados do usuário em servidor do projeto. Quando precisar de "nuvem", usar o Google Drive do usuário (BYOS). Quando precisar de serviço pago de terceiros, usar a chave do próprio usuário (BYOK).

Os serviços próprios rodam só no Railway já contratado (importação via Pandoc e, a partir do RDJ-03, colaboração em tempo real), sem banco e sem guardar conteúdo: o que passa por eles fica só em memória ou em pasta temporária.

## Ciclo 1 · Aquisição (P1)

| Issue | ID | Título | Tipo | Prioridade | Esforço | Arquivo |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| [#71](https://github.com/project-rev/redija-app/issues/71) | RDJ-01 | **Épico: Exportar o trabalho para Word (.docx)** | **Épico** | P1 | M | [RDJ-01-exportar-docx.md](RDJ-01-exportar-docx.md) |
| [#72](https://github.com/project-rev/redija-app/issues/72) | RDJ-01.1 | Baixar o trabalho em .docx com a estrutura e a formatação da norma | História | P1 | M | [RDJ-01-exportar-docx.md](RDJ-01-exportar-docx.md) |
| [#73](https://github.com/project-rev/redija-app/issues/73) | RDJ-01.2 | Preservar tabelas, figuras e legendas no .docx | História | P1 | M | [RDJ-01-exportar-docx.md](RDJ-01-exportar-docx.md) |
| [#74](https://github.com/project-rev/redija-app/issues/74) | RDJ-01.3 | Exportar equações editáveis para o Word | História | P1 | M | [RDJ-01-exportar-docx.md](RDJ-01-exportar-docx.md) |
| [#75](https://github.com/project-rev/redija-app/issues/75) | RDJ-01.4 | Exportar citações e referências no padrão da norma para o .docx | História | P1 | M | [RDJ-01-exportar-docx.md](RDJ-01-exportar-docx.md) |
| [#76](https://github.com/project-rev/redija-app/issues/76) | RDJ-02 | **Épico: Modelos por Instituição feitos pela comunidade** | **Épico** | P1 | M | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#77](https://github.com/project-rev/redija-app/issues/77) | RDJ-02.1 | Definir o schema de modelo institucional | História | P1 | M | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#78](https://github.com/project-rev/redija-app/issues/78) | RDJ-02.2 | Escolher minha instituição na tela "Novo Trabalho" | História | P1 | M | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#79](https://github.com/project-rev/redija-app/issues/79) | RDJ-02.3 | Fazer os linters respeitarem as regras do modelo institucional | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#80](https://github.com/project-rev/redija-app/issues/80) | RDJ-02.4 | Enviar o brasão da minha instituição para a capa | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#81](https://github.com/project-rev/redija-app/issues/81) | RDJ-02.5 | Publicar páginas públicas e indexáveis para cada modelo | História | P1 | M | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#82](https://github.com/project-rev/redija-app/issues/82) | RDJ-02.6 | Publicar o guia e o formulário para pedir ou enviar um modelo | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#83](https://github.com/project-rev/redija-app/issues/83) | RDJ-02.7 | Modelo institucional: USP | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#84](https://github.com/project-rev/redija-app/issues/84) | RDJ-02.8 | Modelo institucional: UNICAMP | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#85](https://github.com/project-rev/redija-app/issues/85) | RDJ-02.9 | Modelo institucional: UFMG | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#86](https://github.com/project-rev/redija-app/issues/86) | RDJ-02.10 | Modelo institucional: IFSP | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#87](https://github.com/project-rev/redija-app/issues/87) | RDJ-02.11 | Modelo institucional: instituição particular de grande porte | História | P1 | P | [RDJ-02-modelos-por-instituicao.md](RDJ-02-modelos-por-instituicao.md) |
| [#88](https://github.com/project-rev/redija-app/issues/88) | RDJ-03 | **Épico: Compartilhamento e colaboração (Drive, tempo real e revisão)** | **Épico** | P1 | G | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#154](https://github.com/project-rev/redija-app/issues/154) | RDJ-03.7 | Converter meus trabalhos para o formato colaborativo sem perder nada | História | P1 | G | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#155](https://github.com/project-rev/redija-app/issues/155) | RDJ-03.8 | Editar com o editor preparado para colaboração | História | P1 | G | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#93](https://github.com/project-rev/redija-app/issues/93) | RDJ-03.5 | Salvar no Drive juntando versões, sem perder edições | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#156](https://github.com/project-rev/redija-app/issues/156) | RDJ-03.9 | Abrir um trabalho que compartilharam comigo | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#157](https://github.com/project-rev/redija-app/issues/157) | RDJ-03.10 | Salvar alterações num trabalho de outra pessoa | História | P1 | P | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#158](https://github.com/project-rev/redija-app/issues/158) | RDJ-03.11 | Abrir em modo somente leitura quando só tenho permissão de leitura | História | P1 | P | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#159](https://github.com/project-rev/redija-app/issues/159) | RDJ-03.12 | Conectar à colaboração em tempo real com segurança, em qualquer rede | História | P1 | G | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#94](https://github.com/project-rev/redija-app/issues/94) | RDJ-03.6 | Editar ao mesmo tempo, vendo quem está no documento | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#160](https://github.com/project-rev/redija-app/issues/160) | RDJ-03.13 | Remover a colaboração P2P antiga | História | P1 | P | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#89](https://github.com/project-rev/redija-app/issues/89) | RDJ-03.1 | Comentar um trecho selecionado do texto | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#90](https://github.com/project-rev/redija-app/issues/90) | RDJ-03.2 | Responder, editar, excluir e resolver comentários | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#91](https://github.com/project-rev/redija-app/issues/91) | RDJ-03.3 | Ver e navegar pelos comentários no painel lateral | História | P1 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#92](https://github.com/project-rev/redija-app/issues/92) | RDJ-03.4 | Manter os comentários salvos, sincronizados e fora do PDF | História | P1 | P | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#161](https://github.com/project-rev/redija-app/issues/161) | RDJ-03.14 | Ver e restaurar versões anteriores do trabalho | História | P2 | M | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#162](https://github.com/project-rev/redija-app/issues/162) | RDJ-03.15 | Sugerir alterações no texto (modo sugestão) | História | P2 | G | [RDJ-03-compartilhamento-e-colaboracao.md](RDJ-03-compartilhamento-e-colaboracao.md) |
| [#95](https://github.com/project-rev/redija-app/issues/95) | RDJ-04 | **Épico: App instalável e offline (PWA)** | **Épico** | P1 | P | [RDJ-04-pwa-offline.md](RDJ-04-pwa-offline.md) |
| [#96](https://github.com/project-rev/redija-app/issues/96) | RDJ-04.1 | Instalar o Redija no computador e no celular | História | P1 | P | [RDJ-04-pwa-offline.md](RDJ-04-pwa-offline.md) |
| [#97](https://github.com/project-rev/redija-app/issues/97) | RDJ-04.2 | Abrir o app e compilar o PDF sem internet | História | P1 | M | [RDJ-04-pwa-offline.md](RDJ-04-pwa-offline.md) |
| [#98](https://github.com/project-rev/redija-app/issues/98) | RDJ-04.3 | Ser avisado quando houver uma nova versão do app | História | P1 | P | [RDJ-04-pwa-offline.md](RDJ-04-pwa-offline.md) |
| [#99](https://github.com/project-rev/redija-app/issues/99) | RDJ-04.4 | Saber quando estou offline e quais funções dependem de internet | História | P1 | P | [RDJ-04-pwa-offline.md](RDJ-04-pwa-offline.md) |

## Ciclo 2 · Retenção e viralidade (P2)

| Issue | ID | Título | Tipo | Prioridade | Esforço | Arquivo |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| [#100](https://github.com/project-rev/redija-app/issues/100) | RDJ-05 | **Épico: Checklist "Pronto para Entregar"** | **Épico** | P2 | M | [RDJ-05-checklist-pronto-para-entregar.md](RDJ-05-checklist-pronto-para-entregar.md) |
| [#101](https://github.com/project-rev/redija-app/issues/101) | RDJ-05.1 | Ver a nota de conformidade do trabalho | História | P2 | P | [RDJ-05-checklist-pronto-para-entregar.md](RDJ-05-checklist-pronto-para-entregar.md) |
| [#102](https://github.com/project-rev/redija-app/issues/102) | RDJ-05.2 | Conferir o checklist estrutural do meu tipo de trabalho e norma | História | P2 | M | [RDJ-05-checklist-pronto-para-entregar.md](RDJ-05-checklist-pronto-para-entregar.md) |
| [#103](https://github.com/project-rev/redija-app/issues/103) | RDJ-05.3 | Encontrar citações sem referência e referências não citadas | História | P2 | P | [RDJ-05-checklist-pronto-para-entregar.md](RDJ-05-checklist-pronto-para-entregar.md) |
| [#104](https://github.com/project-rev/redija-app/issues/104) | RDJ-05.4 | Revisar o trabalho na tela "Verificar antes de entregar" | História | P2 | M | [RDJ-05-checklist-pronto-para-entregar.md](RDJ-05-checklist-pronto-para-entregar.md) |
| [#105](https://github.com/project-rev/redija-app/issues/105) | RDJ-06 | **Épico: Painel de prazos e metas de escrita** | **Épico** | P2 | M | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#106](https://github.com/project-rev/redija-app/issues/106) | RDJ-06.1 | Definir prazo, meta e marcos do trabalho | História | P2 | P | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#107](https://github.com/project-rev/redija-app/issues/107) | RDJ-06.2 | Ver quanto preciso escrever hoje | História | P2 | P | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#108](https://github.com/project-rev/redija-app/issues/108) | RDJ-06.3 | Acompanhar o progresso por capítulo e o histórico diário | História | P2 | M | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#109](https://github.com/project-rev/redija-app/issues/109) | RDJ-06.4 | Exportar prazos e marcos para minha agenda | História | P2 | P | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#110](https://github.com/project-rev/redija-app/issues/110) | RDJ-06.5 | Receber lembrete da meta diária com o app aberto | História | P2 | P | [RDJ-06-prazos-e-metas.md](RDJ-06-prazos-e-metas.md) |
| [#111](https://github.com/project-rev/redija-app/issues/111) | RDJ-07 | **Épico: Minha biblioteca de referências** | **Épico** | P2 | G | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#112](https://github.com/project-rev/redija-app/issues/112) | RDJ-07.1 | Salvar referências na minha biblioteca e usá-las em qualquer projeto | História | P2 | M | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#113](https://github.com/project-rev/redija-app/issues/113) | RDJ-07.2 | Buscar uma referência pelo título ou pelo autor | História | P2 | M | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#114](https://github.com/project-rev/redija-app/issues/114) | RDJ-07.3 | Importar referências do Zotero e do Mendeley (.ris e CSL-JSON) | História | P2 | M | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#115](https://github.com/project-rev/redija-app/issues/115) | RDJ-07.4 | Sincronizar minha biblioteca pelo Google Drive | História | P2 | M | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#116](https://github.com/project-rev/redija-app/issues/116) | RDJ-07.5 | Organizar a biblioteca com pastas e tags | História | P2 | P | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#117](https://github.com/project-rev/redija-app/issues/117) | RDJ-07.6 | Atualizar num projeto uma referência alterada na biblioteca | História | P2 | P | [RDJ-07-biblioteca-de-referencias.md](RDJ-07-biblioteca-de-referencias.md) |
| [#118](https://github.com/project-rev/redija-app/issues/118) | RDJ-08 | **Épico: Link de leitura compartilhável** | **Épico** | P2 | M | [RDJ-08-link-de-leitura.md](RDJ-08-link-de-leitura.md) |
| [#119](https://github.com/project-rev/redija-app/issues/119) | RDJ-08.1 | Spike: validar a leitura anônima de arquivos pela Drive API | Spike | P2 | P | [RDJ-08-link-de-leitura.md](RDJ-08-link-de-leitura.md) |
| [#120](https://github.com/project-rev/redija-app/issues/120) | RDJ-08.2 | Publicar um link de leitura do meu trabalho | História | P2 | M | [RDJ-08-link-de-leitura.md](RDJ-08-link-de-leitura.md) |
| [#121](https://github.com/project-rev/redija-app/issues/121) | RDJ-08.3 | Ler um trabalho compartilhado sem precisar de login | História | P2 | M | [RDJ-08-link-de-leitura.md](RDJ-08-link-de-leitura.md) |
| [#122](https://github.com/project-rev/redija-app/issues/122) | RDJ-08.4 | Revogar o link ou atualizar a versão publicada | História | P2 | P | [RDJ-08-link-de-leitura.md](RDJ-08-link-de-leitura.md) |
| [#123](https://github.com/project-rev/redija-app/issues/123) | RDJ-09 | **Épico: Do TCC aos slides de defesa em 1 clique** | **Épico** | P2 | G | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#124](https://github.com/project-rev/redija-app/issues/124) | RDJ-09.1 | Spike: escolher o pacote Typst de slides | Spike | P2 | P | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#125](https://github.com/project-rev/redija-app/issues/125) | RDJ-09.2 | Gerar slides de defesa a partir do meu trabalho | História | P2 | M | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#126](https://github.com/project-rev/redija-app/issues/126) | RDJ-09.3 | Editar os slides gerados no editor de blocos | História | P2 | M | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#127](https://github.com/project-rev/redija-app/issues/127) | RDJ-09.4 | Inserir figuras e tabelas do trabalho nos slides | História | P2 | P | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#128](https://github.com/project-rev/redija-app/issues/128) | RDJ-09.5 | Escolher o tema visual e a proporção dos slides | História | P2 | P | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#129](https://github.com/project-rev/redija-app/issues/129) | RDJ-09.6 | Exportar a apresentação em PDF, inclusive offline | História | P2 | P | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |
| [#130](https://github.com/project-rev/redija-app/issues/130) | RDJ-09.7 | Gerar um pôster a partir do meu trabalho | História | P3 | M | [RDJ-09-slides-de-defesa.md](RDJ-09-slides-de-defesa.md) |

## Ciclo 3 · Inovação (P3)

| Issue | ID | Título | Tipo | Prioridade | Esforço | Arquivo |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| [#131](https://github.com/project-rev/redija-app/issues/131) | RDJ-10 | **Épico: Assistente de escrita acadêmica com IA (chave própria ou local)** | **Épico** | P3 | G | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#132](https://github.com/project-rev/redija-app/issues/132) | RDJ-10.1 | Spike: validar chamadas de IA direto do navegador | Spike | P3 | P | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#133](https://github.com/project-rev/redija-app/issues/133) | RDJ-10.2 | Configurar minha própria chave de IA | História | P3 | M | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#134](https://github.com/project-rev/redija-app/issues/134) | RDJ-10.3 | Reescrever um trecho em linguagem acadêmica | História | P3 | M | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#135](https://github.com/project-rev/redija-app/issues/135) | RDJ-10.4 | Gerar sugestões de resumo e palavras-chave | História | P3 | M | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#136](https://github.com/project-rev/redija-app/issues/136) | RDJ-10.5 | Traduzir o resumo para abstract | História | P3 | P | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#137](https://github.com/project-rev/redija-app/issues/137) | RDJ-10.6 | Usar IA local no navegador, sem chave (experimental) | História | P3 | M | [RDJ-10-assistente-ia-byok.md](RDJ-10-assistente-ia-byok.md) |
| [#138](https://github.com/project-rev/redija-app/issues/138) | RDJ-11 | **Épico: Jornada do TCC com conquistas e sequência de dias** | **Épico** | P3 | M | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#139](https://github.com/project-rev/redija-app/issues/139) | RDJ-11.1 | Desbloquear conquistas ao avançar no trabalho | História | P3 | M | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#140](https://github.com/project-rev/redija-app/issues/140) | RDJ-11.2 | Manter uma sequência de dias escrevendo | História | P3 | P | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#141](https://github.com/project-rev/redija-app/issues/141) | RDJ-11.3 | Compartilhar um cartão de conquista nas redes sociais | História | P3 | M | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#142](https://github.com/project-rev/redija-app/issues/142) | RDJ-11.4 | Ver a linha do tempo do meu trabalho em "Minha Jornada" | História | P3 | P | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#143](https://github.com/project-rev/redija-app/issues/143) | RDJ-11.5 | Desligar a gamificação | História | P3 | P | [RDJ-11-jornada-do-tcc.md](RDJ-11-jornada-do-tcc.md) |
| [#144](https://github.com/project-rev/redija-app/issues/144) | RDJ-12 | **Épico: Ditado por voz com formalização** | **Épico** | P3 | P | [RDJ-12-ditado-por-voz.md](RDJ-12-ditado-por-voz.md) |
| [#145](https://github.com/project-rev/redija-app/issues/145) | RDJ-12.1 | Ditar texto por voz no bloco atual | História | P3 | P | [RDJ-12-ditado-por-voz.md](RDJ-12-ditado-por-voz.md) |
| [#146](https://github.com/project-rev/redija-app/issues/146) | RDJ-12.2 | Formalizar o trecho ditado com IA | História | P3 | P | [RDJ-12-ditado-por-voz.md](RDJ-12-ditado-por-voz.md) |
