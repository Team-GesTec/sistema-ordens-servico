-- Adiciona o perfil operacional Analista/Líder.
-- Não remapeia contas existentes: a transição de dados exige inventário e mapeamento explícito.
ALTER TYPE "tipo_perfil" ADD VALUE IF NOT EXISTS 'analista';
