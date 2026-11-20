ALTER TABLE "ordens_servico"
ADD COLUMN "arquivada_em" TIMESTAMPTZ(6);

CREATE INDEX "idx_os_status_arquivamento" ON "ordens_servico"("status", "arquivada_em", "data_fim");
