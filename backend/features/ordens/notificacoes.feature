# language: pt

Funcionalidade: Notificações de SLA (MVP)

    Contexto:
        Dado que os gestores cadastrados têm os ids 1 e 5

    Cenário: O responsável recebe o aviso de risco
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T16:00:00-03:00"
        Então a última rodada cria 1 avisos novos
        E o funcionário 2 recebe um aviso de "em_risco" sobre a O.S. 12

    Cenário: Sem responsável, o aviso vai para os gestores
        Dado que existe a O.S. ativa 15 sem responsável e limite em "2026-10-23T10:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T16:00:00-03:00"
        Então a última rodada cria 2 avisos novos
        E o funcionário 1 recebe um aviso de "em_risco" sobre a O.S. 15
        E o funcionário 5 recebe um aviso de "em_risco" sobre a O.S. 15

    Cenário: A rodada seguinte não repete o aviso
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T16:00:00-03:00"
        E a rotina de notificações roda em "2026-10-22T16:05:00-03:00"
        Então a última rodada cria 0 avisos novos

    Cenário: Quando o SLA vence, chega um aviso novo
        Dado que existe a O.S. ativa 12 com responsável 2 e limite em "2026-10-23T15:00:00-03:00"
        Quando a rotina de notificações roda em "2026-10-22T16:00:00-03:00"
        E a rotina de notificações roda em "2026-10-23T15:05:00-03:00"
        Então a última rodada cria 1 avisos novos
        E o funcionário 2 recebe um aviso de "vencido" sobre a O.S. 12

    Cenário: O.S. dentro do prazo não gera aviso
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