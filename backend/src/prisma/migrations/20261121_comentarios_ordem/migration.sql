-- Migration exclusivamente aditiva: cria uma nova tabela de comentários.
-- Nenhuma tabela existente recebe coluna, índice ou alteração.
CREATE TABLE "public"."comentarios_ordem" (
    "id" SERIAL NOT NULL,
    "os_id" INTEGER NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_ordem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comentarios_ordem_os_id_fkey"
        FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "comentarios_ordem_funcionario_id_fkey"
        FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_comentarios_ordem_os_data"
    ON "public"."comentarios_ordem"("os_id", "criado_em");

CREATE INDEX "idx_comentarios_ordem_funcionario_data"
    ON "public"."comentarios_ordem"("funcionario_id", "criado_em");
