# language: pt

# US#2.6 — Anexos da O.S. com limite de 50MB (2.6-BE01 inclusão; 2.6-BE02 consulta e download).
# Cenários com @supabase-storage precisam do Supabase Storage configurado no backend/.env
# (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e bucket privado). Para rodar sem o Storage:
#   npx cucumber-js --tags "not @supabase-storage"
# Cenários com @arquivo-grande enviam ~50MB (mais lentos).

Funcionalidade: Anexos da Ordem de Serviço

    Contexto:
        Dado que o gestor e o técnico estão autenticados para os testes de anexo

    @supabase-storage
    Cenário: Gestor anexa um arquivo dentro do limite
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "laudo técnico.pdf" do tipo "application/pdf" com 1024 bytes
        Então o anexo é gravado com nome, tamanho, autor e data
        E a auditoria registra a inclusão do anexo

    @supabase-storage
    Cenário: Técnico anexa em uma O.S. atribuída a ele
        Dado que existe uma O.S. ativa atribuída ao técnico
        Quando o técnico envia o anexo "foto do painel.png" do tipo "image/png" com 2048 bytes
        Então o anexo é gravado com nome, tamanho, autor e data

    @supabase-storage @arquivo-grande
    Cenário: Arquivo com exatamente 50 x 1024 x 1024 bytes é aceito
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "limite.pdf" do tipo "application/pdf" com 52428800 bytes
        Então o anexo é gravado com nome, tamanho, autor e data

    @arquivo-grande
    Cenário: Arquivo acima de 50MB é rejeitado e nada é gravado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "grande.pdf" do tipo "application/pdf" com 52428801 bytes
        Então a API rejeita o anexo com status 413
        E nenhum anexo fica gravado na O.S.

    Cenário: Tipo de arquivo fora da configuração é rejeitado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "script.sh" do tipo "application/x-sh" com 64 bytes
        Então a API rejeita o anexo com status 422
        E nenhum anexo fica gravado na O.S.

    Cenário: Conteúdo que não corresponde ao tipo informado é rejeitado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o arquivo "disfarcado.pdf" como "application/pdf" com conteúdo de outro formato
        Então a API rejeita o anexo com status 422
        E nenhum anexo fica gravado na O.S.

    Cenário: Envio sem token é rejeitado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando alguém sem token envia um anexo para a O.S.
        Então a API rejeita o anexo com status 401

    Cenário: Técnico não anexa em O.S. fora do seu alcance
        Dado que existe uma O.S. ativa sem responsável em outro departamento
        Quando o técnico envia o anexo "foto do painel.png" do tipo "image/png" com 2048 bytes
        Então a API rejeita o anexo com status 403
        E nenhum anexo fica gravado na O.S.

    Cenário: Anexo em O.S. inexistente
        Quando o gestor envia um anexo para uma O.S. inexistente
        Então a API rejeita o anexo com status 404

    Cenário: Falha no banco depois do envio remove o arquivo do armazenamento
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o banco falha ao gravar os metadados de um anexo já enviado ao armazenamento
        Então o arquivo enviado é removido do armazenamento
        E nenhum anexo fica gravado na O.S.

    @supabase-storage
    Cenário: Listagem devolve exatamente os anexos gravados da O.S.
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        E que a O.S. já possui os anexos "laudo.pdf" e "foto.png"
        Quando o técnico lista os anexos da O.S.
        Então a lista contém exatamente os anexos gravados com nome, tamanho, autor e data
        E a consulta não gera registro de auditoria

    @supabase-storage
    Cenário: Download entrega o arquivo íntegro a quem pode ver a O.S.
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        E que a O.S. já possui os anexos "relatório técnico.pdf" e "foto.png"
        Quando o técnico baixa o anexo "relatório técnico.pdf"
        Então o arquivo baixado é idêntico ao enviado
        E a resposta do download traz nome, tipo e tamanho nos cabeçalhos
        E a consulta não gera registro de auditoria

    Cenário: Técnico sem visibilidade não lista os anexos da O.S.
        Dado que existe uma O.S. ativa sem responsável em outro departamento
        Quando o técnico lista os anexos da O.S.
        Então a API rejeita o anexo com status 403

    Cenário: Técnico sem visibilidade não baixa anexos da O.S.
        Dado que existe uma O.S. ativa sem responsável em outro departamento
        E que a O.S. possui um anexo registrado
        Quando o técnico tenta baixar o anexo registrado
        Então a API rejeita o anexo com status 403

    Cenário: Não existe rota de exclusão de anexo
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        E que a O.S. possui um anexo registrado
        Quando o gestor tenta excluir o anexo registrado
        Então a API rejeita o anexo com status 404
        E o anexo registrado continua gravado

    @supabase-storage
    Cenário: Relato enviado junto com o anexo fica registrado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "laudo.pdf" com o relato "Troca do rádio concluída"
        Então o anexo é gravado com o relato "Troca do rádio concluída"
        E a auditoria registra o relato "Troca do rádio concluída"

    Cenário: Relato acima de 2000 caracteres é rejeitado
        Dado que existe uma O.S. ativa sem responsável no departamento do técnico
        Quando o gestor envia o anexo "laudo.pdf" com um relato de 2001 caracteres
        Então a API rejeita o anexo com status 400
        E nenhum anexo fica gravado na O.S.

    Cenário: A tela consulta as regras dos anexos
        Quando o técnico consulta a configuração dos anexos
        Então a configuração informa o limite de 52428800 bytes e os tipos aceitos
