# language: pt

Funcionalidade: CRUD de Ordem de Serviço (AJ-01)

    # "Implementar GET de lista e detalhe"
    Cenário: Gestor lista as ordens de serviço
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o gestor lista as O.S.
        Então a API retorna a lista com a O.S. criada

    Cenário: Gestor consulta o detalhe de uma O.S.
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando consulta novamente a O.S.
        Então a API retorna a O.S. consultada

    Cenário: Consulta de O.S. inexistente
        Dado que existe um gestor autenticado
        Quando consulta uma O.S. inexistente
        Então a API informa que a O.S. não foi encontrada

    # "O Gestor edita os campos permitidos e a alteração permanece após recarregar"
    Cenário: Gestor edita o título e a alteração permanece
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o gestor edita o título da O.S. para "Troca do sensor"
        E consulta novamente a O.S.
        Então o título da O.S. é "Troca do sensor"

    # "alterações relevantes ficam auditadas"
    Cenário: A edição fica registrada na auditoria
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o gestor edita o título da O.S. para "Troca do sensor"
        Então a auditoria registra o título antigo e o novo
        E a auditoria identifica quem realizou a alteração e quando

    # "tentativas de alterar status/responsável/SLA por esta rota são rejeitadas"
    Esquema do Cenário: Edição de campo de outra US é rejeitada
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o gestor tenta editar o campo "<campo>" da O.S.
        Então a API rejeita a edição

        Exemplos:
            | campo           |
            | status          |
            | responsavel_id  |
            | data_limite_sla |

    # "Técnico não consegue editar ou inativar via API (403)"
    Cenário: Técnico não pode editar uma O.S.
        Dado que existe um técnico autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o técnico tenta editar o título da O.S.
        Então a API nega a operação por falta de permissão

    # "O.S. concluída não é reaberta"
    Cenário: O.S. concluída não pode ser editada
        Dado que existe um gestor autenticado
        E que existe uma O.S. concluída
        Quando o gestor edita o título da O.S. para "Novo título"
        Então a API rejeita a edição