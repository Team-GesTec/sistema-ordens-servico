# language: pt

Funcionalidade: Gestão e cálculo do SLA de Ordens de Serviço

    # ============================================================
    # US#3.2-BE01 — Cálculo do estado do SLA
    # ============================================================

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

    # Resultado consistente entre fila, detalhe e dashboard.
    Cenário: O detalhe da O.S. traz o estado do SLA
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando consulta novamente a O.S.
        Então a resposta traz um estado de SLA válido


    # ============================================================
    # 3.1-BE01 — Cálculo automático do SLA na abertura da O.S.
    # ============================================================

    # Cenários de cálculo: usam uma configuração de SLA e feriados de teste (sem banco),
    # com os valores iniciais do Documento Mestre (1=7, 2=5, 3=3, 4=2, 5=1 dias úteis).

    # Os cinco exemplos da tabela de criticidade produzem as datas esperadas.
    Esquema do Cenário: Prazo por criticidade em O.S. de manutenção
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o SLA de manutenção é calculado para a criticidade "<criticidade>" com abertura em "2026-10-05T10:00:00-03:00"
        Então a data limite do SLA é o fim do dia "<dia_limite>"

        Exemplos:
            | criticidade | dia_limite |
            | baixo       | 2026-10-14 |
            | medio       | 2026-10-12 |
            | alto        | 2026-10-08 |
            | muito_alto  | 2026-10-07 |
            | urgente     | 2026-10-06 |

    Cenário: O.S. aberta às 16:00 ganha 1 dia útil de tolerância
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o SLA de manutenção é calculado para a criticidade "urgente" com abertura em "2026-10-05T16:00:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-07"

    Cenário: O.S. aberta antes das 16:00 não ganha tolerância
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o SLA de manutenção é calculado para a criticidade "urgente" com abertura em "2026-10-05T15:59:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-06"

    Cenário: O prazo pula o fim de semana
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o SLA de manutenção é calculado para a criticidade "urgente" com abertura em "2026-10-09T10:00:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-12"

    Cenário: O prazo pula os feriados cadastrados
        Dado a configuração de SLA de teste com os valores iniciais
        E que o dia "2026-10-12" está cadastrado como feriado
        Quando o SLA de manutenção é calculado para a criticidade "urgente" com abertura em "2026-10-09T10:00:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-13"

    # Alterar a configuração deve modificar o cálculo de novas O.S.
    Cenário: Alterar a configuração muda o cálculo
        Dado a configuração de SLA de teste com os valores iniciais
        E que a configuração da criticidade "medio" passa a ser 6 dias úteis
        Quando o SLA de manutenção é calculado para a criticidade "medio" com abertura em "2026-10-05T10:00:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-13"

    Cenário: Criticidade sem configuração de SLA é rejeitada
        Dado a configuração de SLA de teste sem a criticidade "alto"
        Quando o SLA de manutenção é calculado para a criticidade "alto" com abertura em "2026-10-05T10:00:00-03:00"
        Então o cálculo do SLA é rejeitado com status 422

    @custom-sla
    Cenário: Gestor define prazo personalizado em dias úteis
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o gestor define um prazo personalizado de 5 dias úteis com abertura em "2026-10-05T17:00:00-03:00"
        Então a data limite do SLA personalizado é o fim do dia "2026-10-12"
        E o SLA é manual

    @custom-sla
    Cenário: Gestor define uma data limite personalizada
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o gestor define uma data limite personalizada "2026-10-20T18:00:00-03:00" com abertura em "2026-10-05T10:00:00-03:00"
        Então a data limite do SLA é exatamente "2026-10-20T18:00:00-03:00"
        E o SLA é manual

    @custom-sla
    Cenário: SLA personalizado rejeita dias úteis e data ao mesmo tempo
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o gestor define dias úteis e data limite personalizada ao mesmo tempo
        Então o cálculo do SLA é rejeitado com status 400

    @custom-sla
    Cenário: Técnico não pode definir prazo personalizado
        Dado a configuração de SLA de teste com os valores iniciais
        Quando um técnico tenta definir um prazo personalizado de 5 dias úteis
        Então o cálculo do SLA é negado com status 403

    # Instalação não aplica a tolerância das 16:00.
    Cenário: Instalação aberta às 17:00 mantém a data informada pelo gestor
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o gestor define o SLA de instalação aberta em "2026-10-05T17:00:00-03:00" com data limite "2026-11-20T18:00:00-03:00"
        Então a data limite do SLA é exatamente "2026-11-20T18:00:00-03:00"
        E o SLA não é manual


    # ============================================================
    # Cenários de API — SLA na criação da O.S.
    # ============================================================

    # data_limite_sla e sla_manual = false são gravados, auditados e devolvidos.
    Cenário: Gestor abre O.S. de manutenção e recebe o SLA calculado
        Dado que existe um gestor autenticado
        Quando o gestor abre uma O.S. de manutenção com criticidade "alto"
        Então a API devolve a O.S. com o SLA calculado e sla_manual falso
        E a auditoria registra a definição inicial do SLA

    Cenário: Técnico não pode informar a data limite de uma instalação
        Dado que existe um técnico autenticado
        Quando abre uma O.S. de instalação com data limite daqui a 30 dias
        Então a API nega a operação por falta de permissão

    Cenário: Data de instalação acima de 3 meses é rejeitada
        Dado que existe um gestor autenticado
        Quando abre uma O.S. de instalação com data limite daqui a 120 dias
        Então a API rejeita a O.S. com status 422

    Cenário: Data de instalação inválida é rejeitada
        Dado que existe um gestor autenticado
        Quando abre uma O.S. de instalação com data limite "data-invalida"
        Então a API rejeita a O.S. com status 400

    Cenário: Gestor informa a data limite de uma instalação dentro do prazo
        Dado que existe um gestor autenticado
        Quando abre uma O.S. de instalação com data limite daqui a 30 dias
        Então a API devolve a O.S. com a data limite informada e sla_manual falso
