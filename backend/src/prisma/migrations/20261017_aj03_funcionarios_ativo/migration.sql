-- AJ-03: adiciona estado lógico aos funcionários sem alterar os registros existentes.
-- DEFAULT TRUE mantém todos os funcionários legados ativos após a aplicação.
ALTER TABLE "public"."funcionarios"
ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT TRUE;
