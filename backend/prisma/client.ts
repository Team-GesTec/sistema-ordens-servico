/**
 * prisma/client.ts
 *
 * Instância única do Prisma Client, conectada ao Postgres (Supabase) pelo driver adapter `pg`.
 * Todo acesso ao banco deve importar `prisma` daqui — nunca criar outro `new PrismaClient()`.
 *
 * ALTERAÇÃO (16/09/2026): valida `DATABASE_URL` na inicialização. Antes, sem a variável, o erro
 * só aparecia na primeira consulta, com uma mensagem difícil de entender.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
    throw new Error(
        'Variável de ambiente obrigatória ausente: DATABASE_URL. ' +
            'Confira o arquivo backend/.env (o modelo está em backend/.env.example).',
    );
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
