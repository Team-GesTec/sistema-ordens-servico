-- 2.10-BE01 (US#2.10): histórico de atividades da O.S. e logs de auditoria.
-- Depende de 20261023_anexos_relato.
--
-- Amplia a tabela `auditoria` de forma retrocompatível: as colunas antigas continuam sendo a
-- fonte do campo alterado (`campo_alterado`), do valor anterior (`dado_antigo`) e do novo (`dado_novo`).
-- Novas colunas:
--   - `tipo_evento`: classifica o registro (filtro da tela "Logs de auditoria");
--   - `descricao`: texto pronto para exibição;
--   - `parecer`: parecer técnico informado na mudança de status (US#2.4);
--   - `apontamento_id`: referência ao lançamento de horas (US#2.7) que gerou o registro.
-- Os registros já existentes são classificados abaixo a partir de `acao` e `campo_alterado`.

-- CreateEnum
CREATE TYPE "public"."tipo_evento_auditoria" AS ENUM (
    'criacao',
    'edicao',
    'mudanca_status',
    'atribuicao_responsavel',
    'alteracao_sla',
    'anexo',
    'registro_horas',
    'ativacao'
);

-- AlterTable
ALTER TABLE "public"."auditoria"
    ADD COLUMN "tipo_evento" "public"."tipo_evento_auditoria" NOT NULL DEFAULT 'edicao',
    ADD COLUMN "descricao" TEXT,
    ADD COLUMN "parecer" TEXT,
    ADD COLUMN "apontamento_id" INTEGER;

-- Classifica os registros gravados antes desta migration
UPDATE "public"."auditoria"
SET "tipo_evento" = (CASE
    WHEN "campo_alterado" = 'anexo' THEN 'anexo'
    WHEN "acao" = 'insercao' THEN 'criacao'
    WHEN "campo_alterado" = 'status' THEN 'mudanca_status'
    WHEN "campo_alterado" = 'responsavel_id' THEN 'atribuicao_responsavel'
    WHEN "campo_alterado" IN ('data_limite_sla', 'sla_manual', 'justificativa_sla_manual') THEN 'alteracao_sla'
    WHEN "campo_alterado" = 'ativo' THEN 'ativacao'
    ELSE 'edicao'
END)::"public"."tipo_evento_auditoria";

-- Na US#2.4 o parecer da mudança de status era gravado em `justificativa`.
-- O bloqueio pela rota própria grava um texto fixo, que não é parecer.
UPDATE "public"."auditoria"
SET "parecer" = "justificativa"
WHERE "campo_alterado" = 'status'
  AND "justificativa" IS NOT NULL
  AND "justificativa" <> 'Bloqueio da ordem de serviço';

-- AddForeignKey
ALTER TABLE "public"."auditoria" ADD CONSTRAINT "auditoria_apontamento_id_fkey" FOREIGN KEY ("apontamento_id") REFERENCES "public"."apontamento_horas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex: logs globais ordenados do mais recente ao mais antigo, com desempate por id
CREATE INDEX "idx_auditoria_data_id" ON "public"."auditoria"("data_modificacao" DESC, "id" DESC);

-- CreateIndex: filtro por tipo de evento
CREATE INDEX "idx_auditoria_tipo_evento" ON "public"."auditoria"("tipo_evento");

-- Defesa extra no banco: a auditoria é imutável (só aceita INSERT).
-- Se uma migration futura precisar corrigir dados, desabilite o trigger dentro dela
-- (ALTER TABLE ... DISABLE TRIGGER ...) e reabilite ao final.
CREATE OR REPLACE FUNCTION "public"."auditoria_impedir_alteracao"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Registros de auditoria são imutáveis: % não é permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "auditoria_imutavel"
    BEFORE UPDATE OR DELETE ON "public"."auditoria"
    FOR EACH ROW EXECUTE FUNCTION "public"."auditoria_impedir_alteracao"();
