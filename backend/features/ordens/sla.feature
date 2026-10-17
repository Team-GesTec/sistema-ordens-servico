# language: pt

Funcionalidade: Cálculo automático do SLA na abertura da O.S. (3.1-BE01)

    # Cenários de cálculo: usam uma configuração de SLA e feriados de teste (sem banco),
    # com os valores iniciais do Documento Mestre (1=7, 2=5, 3=3, 4=2, 5=1 dias úteis).

    # "Os cinco exemplos da tabela de criticidade produzem as datas esperadas"
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

    # "Mudar o valor na estrutura de configuração altera o cálculo de novas O.S. sem alterar o código-fonte"
    Cenário: Alterar a configuração muda o cálculo
        Dado a configuração de SLA de teste com os valores iniciais
        E que a configuração da criticidade "medio" passa a ser 6 dias úteis
        Quando o SLA de manutenção é calculado para a criticidade "medio" com abertura em "2026-10-05T10:00:00-03:00"
        Então a data limite do SLA é o fim do dia "2026-10-13"

    Cenário: Criticidade sem configuração de SLA é rejeitada
        Dado a configuração de SLA de teste sem a criticidade "alto"
        Quando o SLA de manutenção é calculado para a criticidade "alto" com abertura em "2026-10-05T10:00:00-03:00"
        Então o cálculo do SLA é rejeitado com status 422

    # "O.S. de Instalação não aplica tolerância das 16:00 (mesmo aberta às 17:00)"
    Cenário: Instalação aberta às 17:00 mantém a data informada pelo gestor
        Dado a configuração de SLA de teste com os valores iniciais
        Quando o gestor define o SLA de instalação aberta em "2026-10-05T17:00:00-03:00" com data limite "2026-11-20T18:00:00-03:00"
        Então a data limite do SLA é exatamente "2026-11-20T18:00:00-03:00"
        E o SLA não é manual

    # Cenários de API (usam o banco de desenvolvimento e a configuração gravada pelo seed)

    # "data_limite_sla e sla_manual = false são gravados no banco, auditados e devolvidos pela API"
    Cenário: Gestor abre O.S. de manutenção e recebe o SLA calculado
        Dado que existe um gestor autenticado
        Quando o gestor abre uma O.S. de manutenção com criticidade "alto"
        Então a API devolve a O.S. com o SLA calculado e sla_manual falso
        E a auditoria registra a definição inicial do SLA

    # "Técnico tentando informar data de Instalação diretamente na API recebe erro 403"
    Cenário: Técnico não pode informar a data limite de uma instalação
        Dado que existe um técnico autenticado
        Quando abre uma O.S. de instalação com data limite daqui a 30 dias
        Então a API nega a operação por falta de permissão

    # "Data de Instalação acima de 3 meses ou data inválida é rejeitada (422/400)"
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
