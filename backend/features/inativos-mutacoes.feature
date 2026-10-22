# language: pt
Funcionalidade: Proteger registros inativos contra edição comum
  Como serviço SGOS
  Quero impedir mutações de Clientes, Funcionários e Projetos inativos
  Para que a consulta histórica não permita editar ou reativar a origem

  Cenário: Cliente inativo não pode ser editado
    Dado que existe um gestor autenticado
    Quando o gestor cria e inativa um cliente de teste
    E tenta alterar o cliente inativo pela API
    Então a API recusa a edição e preserva o histórico do cliente

  Cenário: Funcionário inativo não pode ser editado
    Dado que existe um gestor autenticado
    Quando o gestor cria e inativa um funcionário de teste sem O.S. atribuída
    E tenta alterar o funcionário inativo pela API
    Então a API recusa a edição e preserva o histórico do funcionário

  Cenário: Projeto inativo não pode ser editado
    Dado que existe um gestor autenticado
    Quando o gestor cria e inativa um projeto de teste
    E tenta alterar o projeto inativo pela API
    Então a API recusa a edição e preserva o histórico do projeto
