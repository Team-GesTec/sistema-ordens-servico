-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "nivel_criticidade" AS ENUM ('baixo', 'medio', 'alto', 'muito_alto', 'urgente');

-- CreateEnum
CREATE TYPE "tipo_arquivo" AS ENUM ('png', 'jpeg', 'pdf', 'webp');

-- CreateEnum
CREATE TYPE "tipo_auditoria" AS ENUM ('insercao', 'atualizacao', 'exclusao');

-- CreateEnum
CREATE TYPE "tipo_local_operacional" AS ENUM ('offshore', 'terrestre', 'site');

-- CreateEnum
CREATE TYPE "tipo_ordem_servico" AS ENUM ('instalacao', 'manutencao');

-- CreateEnum
CREATE TYPE "tipo_perfil" AS ENUM ('gestor', 'analista', 'tecnico');

-- CreateEnum
CREATE TYPE "status_enum" AS ENUM ('pendente', 'em_andamento', 'aguardando_embarque', 'validacao_testes', 'bloqueado', 'review', 'concluido');

-- CreateTable
CREATE TABLE "anexos" (
    "id" SERIAL NOT NULL,
    "os_id" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "tipo" "tipo_arquivo" NOT NULL,
    "tamanho_bytes" BIGINT NOT NULL,
    "caminho" TEXT NOT NULL,
    "data_upload" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "os_id" INTEGER NOT NULL,
    "funcionario_id" INTEGER NOT NULL,
    "data_modificacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" "tipo_auditoria" NOT NULL,
    "campo_alterado" TEXT,
    "dado_antigo" TEXT,
    "dado_novo" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "razao_social" TEXT,
    "ramo_atuacao" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departamentos" (
    "id" SERIAL NOT NULL,
    "responsavel_id" INTEGER,
    "nome" TEXT NOT NULL,

    CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "funcionario_id" INTEGER NOT NULL,
    "os_id" INTEGER NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("funcionario_id","os_id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" SERIAL NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "tipo_perfil" NOT NULL DEFAULT 'tecnico',

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_operacionais" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "tipo_local_operacional" NOT NULL,

    CONSTRAINT "locais_operacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" SERIAL NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "solicitante_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER,
    "projeto_id" INTEGER,
    "anterior_id" INTEGER,
    "parecer_tecnico" TEXT,
    "tipo" "tipo_ordem_servico" NOT NULL DEFAULT 'instalacao',
    "criticidade" "nivel_criticidade" NOT NULL DEFAULT 'medio',
    "prazo_horas" INTEGER NOT NULL DEFAULT 120,
    "descricao" TEXT NOT NULL,
    "status" "status_enum" NOT NULL DEFAULT 'pendente',
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "data_prazo" TIMESTAMPTZ(6),
    "status" "status_enum" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos_departamentos" (
    "projeto_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,

    CONSTRAINT "projetos_departamentos_pkey" PRIMARY KEY ("projeto_id","departamento_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_usuario_key" ON "funcionarios"("usuario");

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "departamentos" ADD CONSTRAINT "responsavel_fk" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "locais_operacionais" ADD CONSTRAINT "locais_operacionais_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_anterior_id_fkey" FOREIGN KEY ("anterior_id") REFERENCES "ordens_servico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "funcionarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projetos_departamentos" ADD CONSTRAINT "projetos_departamentos_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projetos_departamentos" ADD CONSTRAINT "projetos_departamentos_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Código feito manualmente, prisma não suporta checks
ALTER TABLE "anexos"
ADD CONSTRAINT "tamanho_valido"
CHECK ("tamanho_bytes" >= 0);