# language: pt

Funcionalidade: Cálculo do estado de SLA (US#3.2-BE01)

    # Regras do time: manutenção em risco nas últimas 24h; instalação depois de 80% do prazo;
    # horas de calendário; concluída e bloqueada encerradas; sem data limite = sem_sla.
    Esquema do Cenário: Estado do SLA conforme o prazo
        Dado uma O.S. do tipo "<tipo>" com status "<status>", criada em "<criacao>" e com limite em "<limite>"
        Quando o estado do SLA é calculado em "<agora>"
        Então o estado do SLA é "<esperado>"

        Exemplos: Manutenção (risco nas últimas 24 horas)
            | tipo       | status       | criacao                   | limite                    | agora                     | esperado |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-22T10:00:00-03:00 | normal   |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-22T15:00:00-03:00 | em_risco |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-22T16:00:00-03:00 | em_risco |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-23T15:00:00-03:00 | em_risco |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-23T15:01:00-03:00 | vencido  |

        Exemplos: Instalação (risco depois de 80% do prazo)
            | tipo       | status       | criacao                   | limite                    | agora                     | esperado |
            | instalacao | em_andamento | 2026-10-20T08:00:00-03:00 | 2026-10-20T18:00:00-03:00 | 2026-10-20T15:59:00-03:00 | normal   |
            | instalacao | em_andamento | 2026-10-20T08:00:00-03:00 | 2026-10-20T18:00:00-03:00 | 2026-10-20T16:00:00-03:00 | em_risco |
            | instalacao | em_andamento | 2026-10-20T08:00:00-03:00 | 2026-10-20T18:00:00-03:00 | 2026-10-20T18:30:00-03:00 | vencido  |

        Exemplos: Regras gerais
            | tipo       | status       | criacao                   | limite                    | agora                     | esperado  |
            | manutencao | aguardando   | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-22T16:00:00-03:00 | em_risco  |
            | manutencao | em_andamento | 2026-10-19T08:00:00-03:00 | sem limite                | 2026-10-22T16:00:00-03:00 | sem_sla   |
            | manutencao | concluido    | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-24T10:00:00-03:00 | encerrada |
            | manutencao | bloqueado    | 2026-10-19T08:00:00-03:00 | 2026-10-23T15:00:00-03:00 | 2026-10-24T10:00:00-03:00 | encerrada |
            | manutencao | concluido    | 2026-10-19T08:00:00-03:00 | sem limite                | 2026-10-22T16:00:00-03:00 | encerrada |

    # "resultado consistente (fonte única) entre fila, detalhe e dashboard"
    Cenário: O detalhe da O.S. traz o estado do SLA
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando consulta novamente a O.S.
        Então a resposta traz um estado de SLA válido