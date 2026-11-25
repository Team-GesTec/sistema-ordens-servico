# GesTec / SGOS — Sprint 3



**Projeto:** Sistema de Gestão de Ordens de Serviço (SGOS), cliente ALTAVE · **Equipe:** GesTec, 2º DSM, Fatec SJC (API 2026-2) · **Sprint:** 3 de 3 · **Escopo:** 7 User Stories, 25 pontos


## 1. Resumo da sprint


| Item | Informação |
| --- | --- |
| Objetivo | Fechar o produto: o sistema registra e exibe o histórico de cada O.S., avisa os envolvidos sobre mudanças, permite apontar as horas gastas, exportar relatórios em PDF e disponibiliza a documentação necessária para a entrega final |
| Histórias planejadas | 7 (US#2.7, US#2.8, US#4.4, US#2.9, US#2.10, US#2.11, US#3.3) |
| Pontos | 25 (3 + 3 + 5 + 3 + 3 + 3 + 5) |
| Épicos envolvidos | EP02 Gestão do Ciclo de Vida da O.S. · EP03 Controle de SLA, Priorização e Alertas · EP04 Auditoria de Ações e Documentação |
| Data da 3ª entrega | 24/11/2026 |
| Resultado | A 3ª entrega ocorreu e o cliente apresentou grande satisfação e algumas considerações sobre melhorias de usabilidade e visualização do sistema |


## 2. Backlog da Sprint 3


| Rank | Épico | Prioridade | User Story | Estimativa | Sprint |
| :---: | :--- | :---: | :--- | :---: | ---: |
| 14 **MVP** | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.7** Como responsável técnico, quero registrar horas gastas nas ordens de serviço, para que meu líder e gestor tenham controle de quanto tempo foi gasto ao realizar uma ordem de serviço | 3 | 3 |
| 15 **MVP** | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.8** Como analista de suporte ou líder de departamento, quero exportar relatório de uma ordem de serviço em PDF com os detalhes preenchidos em sua criação, para encaminhar ao gestor. | 3 | 3 |
| 16 | EP04 - Auditoria de Ações e Documentação | Alta | **US#4.4** Como desenvolvedor ou avaliador, quero acessar a documentação interativa da API via Swagger e manuais do usuário, para validar as integrações, contratos das rotas e utilização do sistema. | 5 | 3 |
| 17 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.9** Como gestor, quero exportar relatório de um cliente em PDF com os detalhes de quais O.S. foram feitas a ele, para encaminhar ao gestor.| 3 | 3 |
| 18 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.10** Como gestor, quero acessar as atividades realizadas nas ordens de serviço, para analisar o que foi feito, acompanhar a execução do atendimento e verificar os registros e resultados do trabalho realizado. | 3 | 3 |
| 19 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.11** Como gestor e técnico, quero que as ordens de serviço sejam movidas automaticamente para um histórico após 14 dias de sua conclusão, para que a tela de "Concluídas" não fique acumulada e a visualização do dia a dia seja otimizada. | 3 | 3 |
| 20 | EP03 - Controle de SLA, Priorização e Alertas | Média | **US#3.3** Como envolvido na O.S., quero receber notificações no sistema (in-app) e por e-mail sobre alterações de status, SLA e nova atribuição, para acompanhar a evolução do atendimento em tempo real. | 5 | 3 |

## 3. Situação das histórias


| História | Planejada | Confirmação do time |
| --- | --- | --- |
| US#2.7 Registro de horas | Sim | Sim |
| US#2.8 Exportar relatório O.S. | Sim | Sim |
| US#4.4 Swagger e manual | Sim | Sim |
| US#2.9 Exportar relatório de cliente | Sim | Sim |
| US#2.10 Histórico de atividades da O.S. | Sim | Sim |
| US#2.11 Histórico automático de ordens de serviço | Sim | Sim |
| US#3.3 Notificação in-app e e-mail | Sim | Sim |


## 4. Retorno do cliente sobre a 3ª entrega


| Item de feedback | Impacto | Destino |
| --- | --- | --- |
| Alterar a visualização dos filtros salvos | Melhorar a organização e a apresentação dos filtros salvos, facilitando sua identificação, consulta e utilização pelos usuários | Backlog pós-entrega (melhoria de interface) |
| Ajustar a visualização das notificações | Inverter a disposição dos botões de "Lidas" e "Não lidas" e ampliar o modal de notificações, considerando a possibilidade de transformá-lo em uma barra lateral (sidebar), facilitando a visualização e o gerenciamento das notificações | Backlog pós-entrega (melhoria de usabilidade) |
| Melhorar a visualização dos dados no dashboard | Aumentar o tamanho dos nomes apresentados no dashboard e exibir os valores numéricos diretamente, sem a necessidade de passar o cursor do mouse sobre os elementos | Backlog pós-entrega (melhoria de visualização) |
| Ajustar a interação do Kanban | Permitir que o usuário arraste os cards a partir de qualquer ponto de sua área, tornando toda a superfície do card interativa para movimentação entre as etapas | Backlog pós-entrega (melhoria de interação) |


## 5. Considerações finais

A terceira sprint representa a etapa final do desenvolvimento do Sistema de Gestão de Ordens de Serviço (SGOS), contemplando funcionalidades relacionadas ao registro de horas, exportação de relatórios, consulta ao histórico de atividades, arquivamento automático de ordens de serviço, notificações e documentação da API.

Após a entrega final, o cliente demonstrou grande satisfação com o resultado apresentado, destacando positivamente a interface, a usabilidade e a organização das funcionalidades do sistema. Também houve boa receptividade à proposta de visualizações salvas, considerada uma solução interessante para facilitar o acesso às informações e otimizar a rotina dos usuários. Outro ponto de destaque foi a publicação on-line da aplicação, utilizando Railway e Supabase, permitindo disponibilizar o sistema em ambiente acessível para utilização e validação.

As considerações apresentadas pelo cliente envolveram pequenos ajustes de interface e interação, como melhorias na visualização dos filtros salvos, na organização das notificações, na apresentação dos dados do dashboard e na movimentação dos cards do Kanban. Esses apontamentos foram registrados como oportunidades de aprimoramento, sem comprometer a avaliação positiva da entrega.

Dessa forma, a Sprint 3 conclui o ciclo de desenvolvimento previsto para o projeto, consolidando uma solução funcional, acessível e alinhada às necessidades da ALTAVE. O retorno positivo do cliente reforça o resultado alcançado pela equipe GesTec e a importância da evolução contínua do sistema.