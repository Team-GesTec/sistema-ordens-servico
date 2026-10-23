ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_nome_key" UNIQUE ("nome"),
ADD CONSTRAINT "clientes_razao_social_key" UNIQUE ("razao_social");