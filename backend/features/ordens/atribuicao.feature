# language: pt

Funcionalidade: Atribuição de Responsável à Ordem de Serviço

    Cenário: Gestor atribui e substitui o responsável de uma O.S.
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        E que existem dois colaboradores ativos
        Quando o gestor atribui o primeiro colaborador à O.S.
        E substitui o responsável pelo segundo colaborador
        Então a API confirma as duas atribuições
        E o segundo colaborador permanece como responsável

    Cenário: Técnico assume O.S. sem responsável do próprio departamento
        Dado que existe um técnico autenticado
        E que existe uma O.S. não concluída sem responsável
        E que o técnico pertence ao departamento da O.S.
        Quando o técnico atribui a si mesmo como responsável
        Então a API confirma a atribuição
        E o técnico permanece como responsável

    Cenário: Atribuição para colaborador inexistente
        Dado que existe um gestor autenticado
        E que existe uma O.S. não concluída sem responsável
        Quando o gestor tenta atribuir um colaborador inexistente
        Então a API rejeita a atribuição com erro de validação

    Cenário: Atribuição em O.S. inexistente
        Dado que existe um gestor autenticado
        Quando o gestor tenta atribuir um responsável a uma O.S. inexistente
        Então a API informa que a O.S. não foi encontrada

    Cenário: Atribuição em O.S. concluída
        Dado que existe um gestor autenticado
        E que existe uma O.S. concluída
        Quando o gestor tenta atribuir um responsável à O.S.
        Então a API rejeita a atribuição

    Cenário: Técnico tenta assumir O.S. de outro departamento
        Dado que existe um técnico autenticado
        E que existe uma O.S. sem responsável em outro departamento
        Quando o técnico tenta atribuir a si mesmo como responsável
        Então a API nega a operação por falta de permissão

    Cenário: Técnico tenta atribuir O.S. a outro colaborador
        Dado que existe um técnico autenticado
        E que existe uma O.S. sem responsável no departamento do técnico
        E que existe outro colaborador ativo
        Quando o técnico tenta atribuir o outro colaborador à O.S.
        Então a API nega a operação por falta de permissão

    Cenário: Técnico tenta substituir responsável existente
        Dado que existe um técnico autenticado
        E que existe uma O.S. com responsável atribuído
        E que existe outro colaborador ativo
        Quando o técnico tenta substituir o responsável
        Então a API nega a operação por falta de permissão

    Cenário: Técnico tenta atuar em O.S. de outro departamento
        Dado que existe um técnico autenticado
        E que existe uma O.S. de outro departamento
        Quando o técnico tenta atribuir um responsável à O.S.
        Então a API nega a operação por falta de permissão

    Cenário: Dois técnicos tentam assumir a mesma O.S.
        Dado que existem dois técnicos autorizados a assumir
        E que existe uma O.S. sem responsável
        Quando os dois técnicos tentam assumir a O.S. simultaneamente
        Então apenas uma atribuição é confirmada
        E a O.S. possui somente um responsável

    Cenário: Responsável e auditoria permanecem após nova consulta
        Dado que existe um gestor autenticado
        E que existe uma O.S. sem responsável
        Quando o gestor atribui um colaborador à O.S.
        E consulta novamente a O.S.
        Então o responsável atribuído permanece registrado
        E a auditoria registra o responsável anterior e o novo
        E a auditoria identifica quem realizou a alteração e quando

    Cenário: Falha na API durante a atribuição
        Dado que existe um gestor autenticado
        E que existe uma O.S. com responsável atribuído
        Quando a API fica indisponível durante uma tentativa de substituição
        Então a operação é apresentada como falha
        E o responsável anterior permanece registrado