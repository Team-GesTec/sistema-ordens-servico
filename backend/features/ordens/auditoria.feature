# language: pt

Funcionalidade: Consultar atividades realizadas nas O.S. (US#2.10)

    # "No detalhe de uma O.S., o Gestor vê exclusivamente as atividades daquela O.S."
    Cenário: Gestor vê somente as atividades da O.S. consultada
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta as atividades da primeira O.S.
        Então a consulta de atividades é aceita
        E todas as atividades pertencem à primeira O.S.
        E nenhuma atividade da segunda O.S. aparece

    # "Sempre do mais recente ao mais antigo, com desempate pelo id"
    Cenário: Atividades ordenadas da mais recente para a mais antiga
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta as atividades da primeira O.S.
        Então as atividades estão em ordem decrescente de data e, no empate, de id
        E a atividade mais antiga é a criação da O.S.

    # "Cada registro exibe descrição, responsável e data/hora; alterações mostram campo, anterior e novo"
    Cenário: Cada atividade traz descrição, responsável, data/hora e os valores alterados
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta as atividades da primeira O.S.
        Então cada atividade traz descrição, responsável e data no formato "dd/mm/aaaa hh:mm"
        E a edição do título mostra o campo, o valor anterior e o novo

    # "Mudança de status exibe o parecer técnico"
    Cenário: Mudança de status mostra o parecer técnico
        Dado que o gestor tem duas O.S. com atividades registradas
        E o gestor conclui a primeira O.S. com o parecer "Equipamento instalado e validado"
        Quando o gestor consulta as atividades da primeira O.S.
        Então a atividade mais recente é a mudança de status com o parecer "Equipamento instalado e validado"

    Cenário: Paginação do histórico da O.S.
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta a página 2 das atividades da primeira O.S. com 1 por página
        Então a consulta de atividades é aceita
        E a página traz 1 atividade com a paginação da página 2

    # "O.S. existente sem atividades retorna lista vazia"
    Cenário: O.S. sem atividades devolve lista vazia
        Dado que existe uma O.S. sem nenhuma atividade registrada
        Quando o gestor consulta as atividades dessa O.S.
        Então a consulta de atividades é aceita
        E a lista de atividades vem vazia com a paginação zerada

    # "O.S. inexistente retorna 404"
    Cenário: O.S. inexistente
        Dado que o gestor está autenticado para consultar a auditoria
        Quando o gestor consulta as atividades da O.S. 2147483647
        Então a consulta de auditoria responde com o status 404

    # "Tela global: busca textual, filtro por tipo e cartões calculados sobre o filtro"
    Cenário: Logs globais filtrados pela busca, com indicadores do filtro
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta os logs buscando pelo marcador do cenário
        Então a consulta de auditoria responde com o status 200
        E todos os logs pertencem às O.S. do cenário
        E os indicadores refletem o filtro aplicado

    Cenário: Logs globais filtrados por tipo de evento
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta os logs do tipo "mudanca_status" buscando pelo marcador do cenário
        Então a consulta de auditoria responde com o status 200
        E todos os logs são do tipo "mudanca_status"
        E os indicadores refletem o filtro aplicado

    Cenário: Paginação dos logs globais
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta a página 2 dos logs do marcador do cenário com 2 por página
        Então a consulta de auditoria responde com o status 200
        E a página dos logs respeita o limite de 2 e não repete a página 1

    # Filtro por período (dias no fuso de Brasília, ambos inclusive)
    Cenário: Logs globais filtrados pelo período de hoje
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta os logs do marcador do cenário no período de hoje
        Então a consulta de auditoria responde com o status 200
        E todos os logs pertencem às O.S. do cenário
        E os indicadores refletem o filtro aplicado

    Cenário: Período sem eventos do cenário
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o gestor consulta os logs do marcador do cenário entre "2020-01-01" e "2020-01-31"
        Então a consulta de auditoria responde com o status 200
        E a lista de logs vem vazia com os indicadores zerados

    Esquema do Cenário: Período inválido é rejeitado
        Dado que o gestor está autenticado para consultar a auditoria
        Quando o gestor consulta os logs entre "<inicio>" e "<fim>"
        Então a consulta de auditoria responde com o status 400

        Exemplos:
            | inicio     | fim        |
            | 2026-11-06 | 2026-11-01 |
            | 2026-02-30 | 2026-03-01 |
            | 06/11/2026 | 2026-11-30 |

    Cenário: Tipo de evento inválido é rejeitado
        Dado que o gestor está autenticado para consultar a auditoria
        Quando o gestor consulta os logs do tipo "inexistente"
        Então a consulta de auditoria responde com o status 400

    # "Apenas Gestor acessa (403 para os demais perfis)"
    Esquema do Cenário: Técnico não consulta a auditoria
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando o técnico consulta "<rota>"
        Então a consulta de auditoria responde com o status 403

        Exemplos:
            | rota                      |
            | os logs globais           |
            | as atividades de uma O.S. |

    Cenário: Consulta sem estar autenticado
        Quando alguém sem token consulta os logs de auditoria
        Então a consulta de auditoria responde com o status 401

    # "A auditoria é imutável"
    Esquema do Cenário: Não existem rotas para alterar ou excluir a auditoria
        Dado que o gestor está autenticado para consultar a auditoria
        Quando o gestor envia "<metodo>" para a auditoria
        Então a consulta de auditoria responde com o status 404

        Exemplos:
            | metodo |
            | PUT    |
            | PATCH  |
            | DELETE |

    Cenário: O banco recusa alterar um registro de auditoria
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando um registro de auditoria da primeira O.S. é alterado direto no banco
        Então o banco recusa a alteração da auditoria

    # "Se a gravação da auditoria falhar, toda a operação na O.S. é desfeita"
    Cenário: Falha na auditoria desfaz a edição da O.S.
        Dado que o gestor tem duas O.S. com atividades registradas
        Quando a gravação da auditoria falha durante a edição do título da primeira O.S.
        Então a consulta de auditoria responde com o status 500
        E o título da primeira O.S. continua o mesmo no banco
        E nenhuma atividade nova é registrada para a primeira O.S.

    Cenário: Falha na auditoria desfaz a criação da O.S.
        Dado que o gestor está autenticado para consultar a auditoria
        Quando a gravação da auditoria falha durante a criação de uma O.S.
        Então a consulta de auditoria responde com o status 500
        E a O.S. não fica gravada no banco
