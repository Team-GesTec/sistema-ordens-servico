-- US#2.6 — integração com o frontend (SCRUM-118): relato opcional enviado junto com o anexo.
-- Depende de 20261019_anexos_autor. Limite de 2.000 caracteres, o mesmo do campo na tela.

-- AlterTable
ALTER TABLE "public"."anexos" ADD COLUMN "relato" TEXT;

-- Defesa extra no banco para o tamanho do relato
ALTER TABLE "public"."anexos" ADD CONSTRAINT "anexos_relato_tamanho" CHECK ("relato" IS NULL OR char_length("relato") <= 2000);
