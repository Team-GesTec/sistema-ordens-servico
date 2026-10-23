# GesTec / SGOS — Sprint 1

**Projeto:** Sistema de Gestão de Ordens de Serviço (SGOS), cliente ALTAVE · **Equipe:** GesTec, 2º DSM, Fatec SJC (API 2026-2) · **Sprint:** 1 de 3 · **Escopo:** 6 User Stories, 25 pontos

## 1. Resumo da sprint

| Item | Informação |
| --- | --- |
| Objetivo | Entregar a base do sistema: acesso por perfil, cadastros (departamentos, colaboradores, clientes, ativos e projetos) e a abertura de O.S. |
| Histórias planejadas | 6 (US#4.1, US#1.2, US#2.1, US#4.2, US#1.1, US#2.2) |
| Pontos planejados | 25 (8 + 3 + 3 + 3 + 3 + 5) |
| Épicos envolvidos | EP01 Gestão e Rastreabilidade de Projetos · EP02 Gestão do Ciclo de Vida da O.S. · EP04 Auditoria de Ações e Documentação |
| Kick-off com o cliente | 24/08/2026 (Altave: Devanir Ramos Junior, com Celso Reis como backup) |
| Data da 1ª entrega | 29/09/2026 |
| Resultado | A 1ª entrega ocorreu e o cliente deu retorno (seção 6) |

## 2. Backlog da Sprint 1

| Rank | Épico | Prioridade | User Story | Sprint |
| :---: | :--- | :---: | :--- | :---: |
| 1 **MVP**| EP04 - Auditoria de Ações e Documentação | Alta | **US#4.1** Como colaborador do sistema, quero autenticar com e-mail e senha, para acessar o SGOS e garantir o controle de acesso conforme meu perfil (Gestor, Analista, Técnico). | 1 |
| 2 **MVP**| EP01 - Gestão e Rastreabilidade de Projetos | Alta | **US#1.2** Como gestor de projetos, quero abrir um projeto de implantação associado a um cliente e selecionar os departamentos envolvidos, para servir como agrupador central das O.S. | 1 |
| 3 **MVP**| EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.1** Como analista de suporte, quero abrir uma O.S. associada a um cliente/projeto escolhendo o tipo (Instalação/Manutenção) e a criticidade, incluindo a opção de vincular o código de uma O.S. anterior reincidente, para direcionar o chamado ao setor correto. | 1 |
| 4 | EP04 - Auditoria de Ações e Documentação | Média | **US#4.2** Como gestor de projetos, quero cadastrar departamentos (Hardware, Compras, SST) e técnicos/colaboradores, para estruturar a equipe e permitir a atribuição de tarefas. | 1 |
| 5 | EP01 - Gestão e Rastreabilidade de Projetos | Média | **US#1.1** Como gestor de projetos, quero cadastrar um cliente informando razão social, ramo de atuação, descrição e ativos/locais operacionais (offshore, terrestre e site), para mapear a base de atendimento. | 1 |
| 6 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.2** Como gestor de projetos, quero desmembrar um projeto manualmente em O.S. direcionadas para os departamentos, para garantir a execução integrada da demanda. | 1 |

## 3. Situação das histórias

| História | Planejada | Indício de entrega | Confirmação do time |
| --- | --- | --- | --- |
| US#4.1 Autenticação | Sim | Sim (faltam logout, perfil logado e esqueci a senha) | Ajuste sendo realizados na sprint 2 |
| US#1.2 Abrir projeto | Sim | Sim | Sim |
| US#2.1 Abrir O.S. | Sim | Sim | Sim] |
| US#4.2 Departamentos e colaboradores | Sim | Sim | Sim |
| US#1.1 Cliente | Sim | Sim | Sim |
| US#2.2 Desmembrar projeto | Sim | Sim | Como pedido pelo cliente, desmembramento é manual |

## 4. Retorno do cliente sobre a 1ª entrega

| Item de feedback | Impacto | Destino |
| --- | --- | --- |
| Tirar categoria de clientes | Retirar campo e tela do cadastro | Sprint 2 (ajuste) |
| Letra mais escura no tema claro | Revisar contraste conforme o mockup | Sprint 2 (ajuste) |
| Opção de cadastrar no passado | Aceitar datas retroativas | Sprint 2 (ajuste) |
| Trocar "data prazo" por data geral (início e fim) | Novos campos de data | Sprint 2 (ajuste) |
| Retorno de cadastro mais amigável | Botão Criar abre modal, mensagem de sucesso, tela inicial é o dashboard | Sprint 2 (ajuste) |
| Dropdowns sobrepostos | Corrigir sobreposição | Sprint 2 (ajuste) |
| Deletar ou alterar cliente | Edição e inativação de cliente | A definir |