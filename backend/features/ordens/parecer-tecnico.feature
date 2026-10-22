# language: pt
Funcionalidade: Parecer técnico independente do status da O.S.
  Como Técnico responsável por uma ordem ativa
  Quero salvar o parecer técnico separadamente da transição de status
  Para registrar a análise sem alterar o andamento da execução

  Contexto:
    Dado que existe um técnico autenticado

  Cenário: Salvar o parecer sem alterar o status ou outros campos da O.S.
    Dado que existe uma O.S. ativa atribuída ao técnico atual
    Quando o técnico salva o parecer independente "Análise técnica registrada para homologação"
    Então o parecer fica persistido e o status e os campos operacionais permanecem iguais
    E uma única auditoria de parecer registra o valor anterior e o novo

  Cenário: Recusar parecer por usuário que não é o responsável
    Dado que existe uma O.S. ativa ainda sem responsável do técnico atual
    Quando o técnico tenta salvar um parecer independente "Tentativa não autorizada"
    Então a API recusa a alteração de parecer

  Cenário: Recusar campos adicionais na operação de parecer
    Dado que existe uma O.S. ativa atribuída ao técnico atual
    Quando o técnico tenta salvar o parecer junto com uma alteração de status
    Então a API recusa a alteração de parecer

  Cenário: Recusar parecer acima de mil caracteres
    Dado que existe uma O.S. ativa atribuída ao técnico atual
    Quando o técnico tenta salvar um parecer com 1001 caracteres
    Então a API recusa a alteração de parecer

  Cenário: Recusar parecer em O.S. inativa
    Dado que existe uma O.S. atribuída ao técnico atual mas inativa
    Quando o técnico tenta salvar parecer em uma O.S. inativa
    Então a API recusa a alteração de parecer

  Cenário: Recusar parecer em O.S. bloqueada
    Dado que existe uma O.S. atribuída ao técnico atual mas bloqueada
    Quando o técnico tenta salvar parecer em uma O.S. bloqueada
    Então a API recusa a alteração de parecer

  Cenário: Recusar parecer em O.S. concluída
    Dado que existe uma O.S. concluída atribuída ao técnico atual
    Quando o técnico tenta salvar parecer em uma O.S. concluída
    Então a API recusa a alteração de parecer

  Cenário: Limpar o parecer por meio de texto vazio sem mudar status
    Dado que existe uma O.S. ativa atribuída ao técnico atual
    Quando o técnico salva um parecer independente vazio
    Então o parecer vazio fica persistido como nulo sem alterar o status

  Cenário: Gestor não recebe permissão nova para editar parecer pelo endpoint do Técnico
    Dado que existe um gestor autenticado
    Quando um gestor tenta usar o endpoint de parecer exclusivo do técnico
    Então a API recusa a alteração de parecer

  Cenário: Bloquear edição, atribuição, bloqueio e transição de O.S. inativa
    Dado que existe uma O.S. ativa atribuída ao técnico atual
    E que existe um gestor autenticado
    E que a O.S. criada foi inativada para verificar bloqueios de mutação
    Quando um gestor tenta editar, atribuir, bloquear e mudar o status da O.S. inativa
    Então todas as mutações da O.S. inativa são recusadas e a origem permanece inalterada
