# language: pt

Funcionalidade: Alteração de status e parecer técnico (US#2.4)

    # "Técnico altera só as dele"
    Cenário: Técnico altera o status de uma O.S. atribuída a ele
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando altera o status da O.S. para "aguardando"
        Então a API aceita a alteração de status
        E consulta novamente a O.S.
        Então o status da O.S. é "aguardando"

    # "Gestor altera qualquer O.S."
    Cenário: Gestor altera o status de qualquer O.S.
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "validacao_testes"
        Então a API aceita a alteração de status

    # "Concluído ... com parecer é aceito" (atalho Em Andamento → Concluído)
    Cenário: Conclusão com parecer é aceita
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando conclui a O.S. com o parecer "Troca do sensor realizada e testada"
        Então a API aceita a alteração de status
        E consulta novamente a O.S.
        Então o status da O.S. é "concluido"

    # "Outros status aceitam com ou sem parecer" (Aguardando → Bloqueado)
    Cenário: Mudança para Bloqueado sem parecer é aceita
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "aguardando"
        E altera o status da O.S. para "bloqueado"
        Então a API aceita a alteração de status

    # "Concluído sem parecer é rejeitado"
    Cenário: Conclusão sem parecer é rejeitada
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "concluido"
        Então a API rejeita a alteração de status

    # "status fora da lista é rejeitado" / "Pendente não existe"
    Esquema do Cenário: Status fora da lista oficial é rejeitado
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "<status>"
        Então a API rejeita a alteração de status

        Exemplos:
            | status     |
            | pendente   |
            | review     |
            | finalizado |

    # "Alterar O.S. Concluída é rejeitado"
    Cenário: O.S. concluída não muda de status
        Dado que existe um gestor autenticado
        E que existe uma O.S. concluída
        Quando altera o status da O.S. para "em_andamento"
        Então a API rejeita a alteração de status

    # "Técnico ... recebe 403 nas demais"
    Cenário: Técnico não altera O.S. que não é dele
        Dado que existe um técnico autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "aguardando"
        Então a API nega a operação por falta de permissão

    # Tabela de permissões: "Bloquear O.S.: Técnico não"
    Cenário: Técnico não bloqueia nem a própria O.S.
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        Quando altera o status da O.S. para "bloqueado"
        Então a API nega a operação por falta de permissão

    # O.S. bloqueada não pode ser desbloqueada (decisão do time: para retomar, criar nova O.S.)
    Cenário: Técnico não desbloqueia nem a própria O.S.
        Dado que existe uma O.S. bloqueada atribuída ao técnico autenticado
        Quando altera o status da O.S. para "em_andamento"
        Então a API rejeita a alteração de status

    Cenário: Gestor também não desbloqueia uma O.S.
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "bloqueado"
        E altera o status da O.S. para "em_andamento"
        Então a API rejeita a alteração de status

    # "Sem token: 401"
    Cenário: Alteração sem estar autenticado
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando altera o status da O.S. para "aguardando" sem estar autenticado
        Então a API exige autenticação

    # "Cada alteração gera auditoria"
    Cenário: A alteração de status fica registrada na auditoria
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando conclui a O.S. com o parecer "Troca do sensor realizada e testada"
        Então a auditoria registra o status antigo, o novo e o parecer
        E a auditoria identifica quem realizou a alteração e quando

    # "Verificar que a criação da O.S. grava o status inicial Em Andamento"
    Cenário: A O.S. nasce com o status Em Andamento
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Então a O.S. foi criada com o status "em_andamento"