-- Trigger de auditoria das Ordens de Serviço — US#4.3
--
-- Registra na tabela "auditoria":
--   - a criação de cada O.S. (acao = 'insercao');
--   - cada alteração nos campos listados em v_campos
--     (acao = 'atualizacao', uma linha por campo alterado).
-- O.S. não são apagadas no sistema (são arquivadas via status),
-- por isso DELETE não é tratado.
--
-- obs: DEPENDE DO BACK-END
-- A coluna auditoria.funcionario_id é obrigatória. Depois que o trigger
-- estiver no banco, toda criação ou alteração de O.S. precisa informar
-- o usuário logado ANTES, na mesma transação:
--     SELECT set_config('app.funcionario_id', '<id do usuário>', true);
-- Sem isso, o INSERT/UPDATE da O.S. falha. Aplicar a migration só
-- quando essa parte do back estiver pronta.


CREATE OR REPLACE FUNCTION registrar_auditoria_os()
RETURNS TRIGGER AS $$
DECLARE
    v_funcionario_id INTEGER;
    v_campos TEXT[] := ARRAY[
        'status', 'criticidade', 'responsavel_id', 'departamento_id', 'tipo',
        'prazo_horas', 'projeto_id', 'cliente_id', 'anterior_id', 'descricao', 'parecer_tecnico'
    ];
    v_campo TEXT;
    v_antigo TEXT;
    v_novo TEXT;
BEGIN
    v_funcionario_id := NULLIF(current_setting('app.funcionario_id', true), '')::INTEGER;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO auditoria (os_id, funcionario_id, acao)
        VALUES (NEW.id, v_funcionario_id, 'insercao');
        RETURN NEW;
    END IF;

    FOREACH v_campo IN ARRAY v_campos LOOP
        v_antigo := to_jsonb(OLD) ->> v_campo;
        v_novo := to_jsonb(NEW) ->> v_campo;

        IF v_antigo IS DISTINCT FROM v_novo THEN
            INSERT INTO auditoria (os_id, funcionario_id, acao, campo_alterado, dado_antigo, dado_novo)
            VALUES (NEW.id, v_funcionario_id, 'atualizacao', v_campo, v_antigo, v_novo);
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Parte 2: o trigger (quando fazer)
CREATE TRIGGER trg_auditoria_os
AFTER INSERT OR UPDATE ON ordens_servico
FOR EACH ROW
EXECUTE FUNCTION registrar_auditoria_os();


-- =====================================================================
-- TESTE (pra testar no SQL Editor do Supabase DEPOIS de aplicar a migration)
-- Não altera nada: o ROLLBACK no final desfaz tudo.
-- Precisa existir pelo menos 1 departamento, 1 cliente e 1 funcionário.
-- Resultado esperado: 3 linhas novas na auditoria
--   (1 'insercao' + 'atualizacao' de status + 'atualizacao' de criticidade).
-- =====================================================================
--
-- BEGIN;
--
-- SELECT set_config('app.funcionario_id', (SELECT id FROM funcionarios LIMIT 1)::TEXT, true);
--
-- INSERT INTO ordens_servico (departamento_id, cliente_id, solicitante_id, descricao)
-- SELECT d.id, c.id, f.id, 'teste do trigger'
-- FROM departamentos d, clientes c, funcionarios f
-- LIMIT 1;
--
-- UPDATE ordens_servico
-- SET status = 'em_andamento', criticidade = 'alto'
-- WHERE descricao = 'teste do trigger';
--
-- SELECT * FROM auditoria ORDER BY id DESC LIMIT 5;
--
-- ROLLBACK;