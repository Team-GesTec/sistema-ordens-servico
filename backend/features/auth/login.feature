# language: pt

Funcionalidade: Autenticação de Usuários no Sistema

    Cenário: Autenticação com credenciais válidas (Caminho Feliz)
        Dado que o colaborador usa as credenciais do gestor configuradas no ambiente
        Quando solicita o acesso
        Então o sistema autentica o colaborador com sucesso

    Cenário: Tentativa de login com usuário não cadastrado ou senha incorreta (Borda)
        Dado que o colaborador insere o usuário "usuario" ou uma senha incorreta
        Quando solicita o acesso
        Então o sistema nega o acesso