# language: pt

Funcionalidade: Cadastro de O.S. antiga/existente — migração manual (AJ-06)

    # "Gestor consegue cadastrar O.S. com data de abertura passada via API"
    Cenário: Gestor cadastra uma O.S. com data de abertura no passado
        Dado que existe um gestor autenticado
        Quando o gestor cadastra uma O.S. antiga aberta há 30 dias com status "em_andamento"
        Então a API cadastra a O.S. antiga
        E a O.S. antiga mantém a data de abertura informada

    # "A origem da migração manual fica registrada na tabela de auditoria"
    Cenário: A origem da migração manual fica registrada na auditoria
        Dado que existe um gestor autenticado
        Quando o gestor cadastra uma O.S. antiga aberta há 30 dias com status "aguardando"
        Então a API cadastra a O.S. antiga
        E a auditoria registra a O.S. como migração manual

    # "Cadastro de O.S. antiga com status Concluído sem parecer técnico é rejeitado pela API"
    Cenário: O.S. antiga concluída sem parecer técnico é rejeitada
        Dado que existe um gestor autenticado
        Quando o gestor cadastra uma O.S. antiga concluída sem parecer técnico
        Então a API rejeita o cadastro da O.S. antiga

    Cenário: O.S. antiga concluída com parecer técnico e data de conclusão é aceita
        Dado que existe um gestor autenticado
        Quando o gestor cadastra uma O.S. antiga concluída com parecer técnico
        Então a API cadastra a O.S. antiga
        E a O.S. antiga fica concluída com o parecer informado

    # "Técnico recebe 403 ao tentar cadastrar O.S. com data no passado"
    Cenário: Técnico não pode cadastrar O.S. com data de abertura no passado
        Dado que existe um técnico autenticado
        Quando o técnico tenta cadastrar uma O.S. antiga aberta há 30 dias
        Então a API nega a operação por falta de permissão

    # "A O.S. migrada aparece corretamente nos endpoints que alimentam fila, dashboard e indicador de SLA"
    Cenário: A O.S. migrada aparece na listagem de O.S.
        Dado que existe um gestor autenticado
        Quando o gestor cadastra uma O.S. antiga aberta há 30 dias com status "validacao_testes"
        E o gestor lista as O.S.
        Então a O.S. antiga aparece na listagem
