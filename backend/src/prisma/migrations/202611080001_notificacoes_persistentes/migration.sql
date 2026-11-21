CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "os_id" INTEGER NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notificacoes_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "notificacoes_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "idx_notificacoes_usuario_lida_data" ON "notificacoes"("funcionario_id", "lida", "data_criacao" DESC);
CREATE INDEX "idx_notificacoes_os_tipo" ON "notificacoes"("os_id", "tipo");
