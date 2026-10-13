-- CreateEnum
CREATE TYPE "public"."status_projeto" AS ENUM ('em_planejamento', 'em_andamento', 'pausado', 'concluido');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."status_enum_new" AS ENUM ('em_andamento', 'aguardando', 'validacao_testes', 'bloqueado', 'concluido');
ALTER TABLE "public"."ordens_servico" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."projetos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."projetos" DROP COLUMN "status";
ALTER TABLE "public"."ordens_servico" ALTER COLUMN "status" TYPE "public"."status_enum_new" USING ("status"::text::"public"."status_enum_new");
ALTER TYPE "public"."status_enum" RENAME TO "status_enum_old";
ALTER TYPE "public"."status_enum_new" RENAME TO "status_enum";
DROP TYPE "public"."status_enum_old";
ALTER TABLE "public"."ordens_servico" ALTER COLUMN "status" SET DEFAULT 'em_andamento';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."tipo_perfil_new" AS ENUM ('gestor', 'tecnico');
ALTER TABLE "public"."funcionarios" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "public"."funcionarios" ALTER COLUMN "tipo" TYPE "public"."tipo_perfil_new" USING ("tipo"::text::"public"."tipo_perfil_new");
ALTER TYPE "public"."tipo_perfil" RENAME TO "tipo_perfil_old";
ALTER TYPE "public"."tipo_perfil_new" RENAME TO "tipo_perfil";
DROP TYPE "public"."tipo_perfil_old";
ALTER TABLE "public"."funcionarios" ALTER COLUMN "tipo" SET DEFAULT 'tecnico';
COMMIT;

-- AlterTable
ALTER TABLE "public"."anexos" DROP COLUMN "tipo",
ADD COLUMN     "tipo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."auditoria" ADD COLUMN     "justificativa" TEXT,
ADD COLUMN     "tipo_entidade" TEXT NOT NULL DEFAULT 'ordem_servico';

-- AlterTable
ALTER TABLE "public"."clientes" DROP COLUMN "categoria",
ALTER COLUMN "razao_social" SET NOT NULL,
ALTER COLUMN "ramo_atuacao" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."ordens_servico" DROP COLUMN "prazo_horas",
ADD COLUMN     "ativo_id" INTEGER,
ADD COLUMN     "data_fim" TIMESTAMPTZ(6),
ADD COLUMN     "data_inicio" TIMESTAMPTZ(6),
ADD COLUMN     "data_limite_sla" TIMESTAMPTZ(6),
ADD COLUMN     "justificativa_sla_manual" TEXT,
ADD COLUMN     "prazo_dias_uteis" INTEGER,
ADD COLUMN     "sla_config_id" INTEGER,
ADD COLUMN     "sla_manual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titulo" TEXT NOT NULL,
ALTER COLUMN "cliente_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'em_andamento';

-- AlterTable
ALTER TABLE "public"."projetos" DROP COLUMN "data_prazo",
ADD COLUMN     "data_fim" TIMESTAMPTZ(6),
ADD COLUMN     "data_inicio" TIMESTAMPTZ(6),
ADD COLUMN     "status" "public"."status_projeto" NOT NULL DEFAULT 'em_planejamento';

-- CreateTable
CREATE TABLE "public"."apontamento_horas" (
    "id" SERIAL NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "os_id" INTEGER NOT NULL,
    "data_trabalho" DATE NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,
    "descricao" TEXT,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apontamento_horas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feriados" (
    "id" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "nacional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sla_config" (
    "id" SERIAL NOT NULL,
    "tipo" "public"."tipo_ordem_servico" NOT NULL,
    "criticidade" "public"."nivel_criticidade" NOT NULL,
    "prazo_dias_uteis" INTEGER,

    CONSTRAINT "sla_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_apontamentos_funcionario_data" ON "public"."apontamento_horas"("funcionario_id" ASC, "data_trabalho" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "feriados_data_key" ON "public"."feriados"("data" ASC);

-- CreateIndex
CREATE INDEX "idx_feriados_data" ON "public"."feriados"("data" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "config_unica" ON "public"."sla_config"("tipo" ASC, "criticidade" ASC);

-- CreateIndex
CREATE INDEX "idx_auditoria_os_data" ON "public"."auditoria"("os_id" ASC, "data_modificacao" ASC);

-- CreateIndex
CREATE INDEX "idx_os_criticidade_limite" ON "public"."ordens_servico"("criticidade" ASC, "data_limite_sla" ASC);

-- CreateIndex
CREATE INDEX "idx_os_departamento_status" ON "public"."ordens_servico"("departamento_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_os_projeto" ON "public"."ordens_servico"("projeto_id" ASC);

-- CreateIndex
CREATE INDEX "idx_os_responsavel_status" ON "public"."ordens_servico"("responsavel_id" ASC, "status" ASC);

-- AddForeignKey
ALTER TABLE "public"."apontamento_horas" ADD CONSTRAINT "apontamento_horas_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."apontamento_horas" ADD CONSTRAINT "apontamento_horas_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ordens_servico" ADD CONSTRAINT "ordens_servico_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "public"."locais_operacionais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ordens_servico" ADD CONSTRAINT "ordens_servico_sla_config_id_fkey" FOREIGN KEY ("sla_config_id") REFERENCES "public"."sla_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddCheck
ALTER TABLE "public"."apontamento_horas"
ADD CONSTRAINT "duracao_apontamento_positiva"
CHECK ("duracao_minutos" > 0);

-- AddCheck
ALTER TABLE "public"."ordens_servico"
ADD CONSTRAINT "justificativa_sla_manual_obrigatoria"
CHECK (
    "sla_manual" = false
    OR (
        "justificativa_sla_manual" IS NOT NULL
        AND LENGTH(TRIM("justificativa_sla_manual")) > 0
    )
);

-- AddCheck
ALTER TABLE "public"."ordens_servico"
ADD CONSTRAINT "prazo_dias_uteis_valido"
CHECK (
    "prazo_dias_uteis" IS NULL
    OR "prazo_dias_uteis" > 0
);

-- AddCheck
ALTER TABLE "public"."sla_config"
ADD CONSTRAINT "prazo_valido"
CHECK (
    "prazo_dias_uteis" IS NULL
    OR "prazo_dias_uteis" > 0
);
