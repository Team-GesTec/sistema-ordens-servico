CREATE TABLE "public"."lancamentos_horas" (
    "id" SERIAL NOT NULL,
    "os_id" INTEGER NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "minutos" INTEGER NOT NULL,
    "data_trabalho" DATE NOT NULL,
    "status_os" "public"."status_enum" NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_horas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_lancamentos_horas_os"
  ON "public"."lancamentos_horas"("os_id" ASC);

ALTER TABLE "public"."lancamentos_horas"
  ADD CONSTRAINT "lancamentos_horas_os_id_fkey"
  FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "public"."lancamentos_horas"
  ADD CONSTRAINT "lancamentos_horas_funcionario_id_fkey"
  FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "public"."lancamentos_horas"
  ADD CONSTRAINT "lancamentos_horas_minutos_positivo" CHECK ("minutos" > 0);
