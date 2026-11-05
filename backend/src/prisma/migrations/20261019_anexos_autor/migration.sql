-- 2.6-BE01 (US#2.6): autor do anexo, caminho único no Storage e índice de consulta por O.S.
--
-- `funcionario_id` guarda quem enviou o anexo (o "autor" exibido na listagem).
-- A tabela `anexos` ainda não era usada pela API. Se já existir alguma linha sem autor, o
-- SET NOT NULL abaixo falha de propósito: preencha `funcionario_id` dessas linhas antes de aplicar.

-- AlterTable
ALTER TABLE "public"."anexos" ADD COLUMN "funcionario_id" INTEGER;
ALTER TABLE "public"."anexos" ALTER COLUMN "funcionario_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."anexos" ADD CONSTRAINT "anexos_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex: cada objeto do Storage pertence a um único anexo
CREATE UNIQUE INDEX "anexos_caminho_key" ON "public"."anexos"("caminho");

-- CreateIndex: listagem dos anexos de uma O.S. (2.6-BE02)
CREATE INDEX "idx_anexos_os_data" ON "public"."anexos"("os_id", "data_upload");

-- Defesa extra no banco: nenhum anexo passa de 50 x 1024 x 1024 = 52.428.800 bytes
ALTER TABLE "public"."anexos" ADD CONSTRAINT "anexos_tamanho_maximo" CHECK ("tamanho_bytes" <= 52428800);
