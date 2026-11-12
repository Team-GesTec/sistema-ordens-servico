ALTER TABLE "funcionarios" ADD COLUMN "email" VARCHAR(255);

CREATE UNIQUE INDEX "funcionarios_email_key" ON "funcionarios"("email");
