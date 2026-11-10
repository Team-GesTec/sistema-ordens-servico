# language: pt

Funcionalidade: Registro de horas gastas na O.S. (US#2.7)

    Cenário: Responsável registra horas
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando registra a duração "2h 30m" na data "2026-11-01"
        Então o registro de horas responde 201
        E existe lançamento de 150 minutos com status "em_andamento" e auditoria

    Esquema do Cenário: Duração inválida é rejeitada
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando registra a duração "<duracao>" na data "2026-11-01"
        Então o registro de horas responde 422

        Exemplos:
            | duracao |
            | 0h      |
            | -1h     |
            | 2 horas |

    Cenário: Data futura é rejeitada
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando registra a duração "1h" na data "2099-01-01"
        Então o registro de horas responde 422

    Cenário: Técnico que não é o responsável recebe 403
        Dado que existe um técnico autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando registra a duração "1h" na data "2026-11-01"
        Então o registro de horas responde 403

    Cenário: Gestor só consulta
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando registra a duração "1h" na data "2026-11-01"
        Então o registro de horas responde 403

    Cenário: O.S. inexistente retorna 404
        Dado que existe um técnico autenticado
        Quando registra horas em uma O.S. inexistente
        Então o registro de horas responde 404

    Cenário: Sem token retorna 401
        Quando registra horas sem estar autenticado
        Então o registro de horas responde 401

    Cenário: Técnico precisa informar horas ao mudar o status
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando muda o status para "aguardando" sem informar horas
        Então o registro de horas responde 422

    Cenário: Troca de status grava as horas do status encerrado
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando muda o status para "aguardando" informando "1h"
        Então o registro de horas responde 200
        E existe lançamento de 60 minutos com status "em_andamento" e auditoria

    Cenário: Lista traz o total e começa pelo trabalho mais recente
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando registra a duração "1h" na data "2026-11-01"
        E registra a duração "30m" na data "2026-11-03"
        E consulta as horas da O.S.
        Então o registro de horas responde 200
        E a lista de horas tem total de 90 minutos e começa em "2026-11-03"

    Cenário: O.S. sem lançamentos devolve lista vazia
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando consulta as horas da O.S.
        Então o registro de horas responde 200
        E a lista de horas está vazia

    Cenário: Consulta de O.S. inexistente retorna 404
        Dado que existe um gestor autenticado
        Quando consulta as horas de uma O.S. inexistente
        Então o registro de horas responde 404

    Cenário: Consulta sem token retorna 401
        Quando consulta as horas sem estar autenticado
        Então o registro de horas responde 401
