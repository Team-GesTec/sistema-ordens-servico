-- AJ-02: adiciona nome e estado de atividade aos projetos e cria auditoria própria.
-- A coluna é inicialmente nullable para permitir backfill seguro dos registros legados.
ALTER TABLE "public"."projetos" ADD COLUMN "nome" TEXT;

UPDATE "public"."projetos"
SET "nome" = 'Projeto #' || "id"::text
WHERE "nome" IS NULL;

ALTER TABLE "public"."projetos" ALTER COLUMN "nome" SET NOT NULL;
ALTER TABLE "public"."projetos" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "public"."auditoria_projetos" (
    "id" SERIAL NOT NULL,
    "projeto_id" INTEGER NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "data_modificacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" "public"."tipo_auditoria" NOT NULL,
    "campo_alterado" TEXT,
    "dado_antigo" TEXT,
    "dado_novo" TEXT,
    "justificativa" TEXT,
    CONSTRAINT "auditoria_projetos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_auditoria_projetos_data"
ON "public"."auditoria_projetos"("projeto_id", "data_modificacao");

ALTER TABLE "public"."auditoria_projetos"
ADD CONSTRAINT "auditoria_projetos_projeto_id_fkey"
FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "public"."auditoria_projetos"
ADD CONSTRAINT "auditoria_projetos_funcionario_id_fkey"
FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;
