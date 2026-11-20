# language: pt

Funcionalidade: Arquivamento automático de O.S. concluídas após 14 dias (US#2.11)

    Cenário: O.S. concluída há 14 dias ou mais é arquivada
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 15 dias
        Quando a rotina de arquivamento é executada
        Então a O.S. fica arquivada

    Cenário: O.S. concluída exatamente há 14 dias é arquivada
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 14 dias
        Quando a rotina de arquivamento é executada
        Então a O.S. fica arquivada

    Cenário: O.S. concluída há 13 dias continua ativa
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 13 dias
        Quando a rotina de arquivamento é executada
        Então a O.S. não fica arquivada

    Cenário: O.S. antiga não concluída não é arquivada
        Dado que existe um gestor autenticado
        E existe uma O.S. em andamento aberta há 30 dias
        Quando a rotina de arquivamento é executada
        Então a O.S. não fica arquivada

    Cenário: Rodar a rotina duas vezes não altera a data de arquivamento
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 20 dias
        Quando a rotina de arquivamento é executada
        E a rotina de arquivamento é executada novamente
        Então a data de arquivamento não muda

    Cenário: Listagem padrão esconde as arquivadas e o parâmetro incluir_arquivadas as traz
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 15 dias
        Quando a rotina de arquivamento é executada
        Então a O.S. não aparece em GET /ordens-servico
        E a O.S. aparece em GET /ordens-servico com incluir_arquivadas=true

    Cenário: Histórico traz somente as O.S. arquivadas
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 15 dias
        Quando a rotina de arquivamento é executada
        E o usuário consulta o histórico de O.S. arquivadas
        Então o histórico responde com status 200
        E a O.S. aparece no histórico de arquivadas
        E todas as O.S. do histórico estão arquivadas

    Cenário: Técnico consulta o histórico de arquivadas
        Dado que existe um técnico autenticado
        Quando o usuário consulta o histórico de O.S. arquivadas
        Então o histórico responde com status 200

    Cenário: Analista não consulta o histórico de arquivadas
        Quando um analista consulta o histórico de O.S. arquivadas
        Então a API nega a operação por falta de permissão

    Cenário: Arquivamento preserva parecer, data de conclusão e horas
        Dado que existe um gestor autenticado
        E existe uma O.S. concluída há 15 dias
        E os dados complementares da O.S. são guardados
        Quando a rotina de arquivamento é executada
        Então a O.S. fica arquivada
        E parecer, data de conclusão e horas continuam iguais
