# language: pt

Funcionalidade: Notificações persistentes de Ordens de Serviço

    Contexto:
        Dado que os funcionários do departamento têm os ids 1 e 5

    Cenário: O responsável e o departamento recebem o aviso de SLA crítico
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T15:00:00-03:00"
        Então a última rodada cria 3 avisos novos
        E o funcionário 2 recebe um aviso de "sla_critica" sobre a O.S. 12
        E o funcionário 1 recebe um aviso de "sla_critica" sobre a O.S. 12

    Cenário: A rodada seguinte não repete o aviso crítico
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T15:00:00-03:00"
        E a rotina de notificações roda em "2026-10-22T15:05:00-03:00"
        Então a última rodada cria 0 avisos novos

    Cenário: A expiração substitui o aviso crítico mesmo que ele não tenha sido lido
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T15:00:00-03:00"
        E a rotina de notificações roda em "2026-10-23T15:00:00-03:00"
        Então a última rodada cria 3 avisos novos
        E o funcionário 2 recebe um aviso de "sla_expirada" sobre a O.S. 12
        E não existe aviso crítico para a O.S. 12

    Cenário: O.S. com mais de um dia de prazo não gera aviso crítico
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T10:00:00-03:00"
        Então a última rodada cria 0 avisos novos

    Cenário: O.S. concluída não gera aviso
        Dado que existe a O.S. concluída 20 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-24T10:00:00-03:00"
        Então a última rodada cria 0 avisos novos

    Cenário: O.S. inativa não gera aviso
        Dado que existe a O.S. inativa 21 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-24T10:00:00-03:00"
        Então a última rodada cria 0 avisos novos

    Cenário: A consulta de notificações exige login
        Quando as notificações são consultadas sem estar autenticado
        Então a consulta de notificações é recusada por falta de login
