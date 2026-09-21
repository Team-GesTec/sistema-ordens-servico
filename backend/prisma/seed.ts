/**
 * prisma/seed.ts
 *
 * Seed inicial: cria o PRIMEIRO gestor (e um departamento para ele), se ainda não existir.
 *
 * Por que é necessário: com a autenticação ligada, só um gestor pode cadastrar departamentos e
 * funcionários — então alguém precisa existir antes do primeiro login.
 *
 * Como usar (uma única vez, por uma pessoa do time, no banco compartilhado):
 *   1. Preencha no backend/.env: SEED_GESTOR_USUARIO, SEED_GESTOR_SENHA
 *      (opcionais: SEED_GESTOR_NOME, SEED_DEPARTAMENTO_NOME)
 *   2. Rode: npm run db:seed        (equivale a `npx prisma db seed`, configurado em prisma.config.ts)
 *
 * O script é idempotente: se o usuário já existir, não faz nada.
 */
import 'dotenv/config';
import { prisma } from './client';
import { gerarHashSenha, validarSenha } from '../utils/senha';

/**
 * Lê uma variável obrigatória para o seed.
 * @throws Error se não existir.
 */
function lerVariavel(nome: string): string {
    const valor = process.env[nome];
    if (!valor || valor.trim() === '') {
        throw new Error(`Defina ${nome} no backend/.env para rodar o seed.`);
    }
    return valor;
}

/**
 * Cria o departamento (se preciso) e o gestor inicial, e define o gestor como responsável
 * pelo departamento caso ele ainda não tenha responsável.
 */
async function main(): Promise<void> {
    const usuario = lerVariavel('SEED_GESTOR_USUARIO').trim().toLowerCase();
    const senha = validarSenha(lerVariavel('SEED_GESTOR_SENHA'), 'SEED_GESTOR_SENHA');
    const nome = process.env.SEED_GESTOR_NOME?.trim() || 'Administrador';
    const nomeDepartamento = process.env.SEED_DEPARTAMENTO_NOME?.trim() || 'Administração';

    const existente = await prisma.funcionarios.findUnique({ where: { usuario }, select: { id: true } });
    if (existente) {
        console.log(`[seed] O usuário "${usuario}" já existe (id ${existente.id}). Nada a fazer.`);
        return;
    }

    const departamento =
        (await prisma.departamentos.findFirst({ where: { nome: nomeDepartamento } })) ??
        (await prisma.departamentos.create({ data: { nome: nomeDepartamento } }));

    const gestor = await prisma.funcionarios.create({
        data: {
            usuario,
            nome,
            tipo: 'gestor',
            departamento_id: departamento.id,
            senha_hash: await gerarHashSenha(senha),
        },
        select: { id: true, usuario: true },
    });

    if (departamento.responsavel_id === null) {
        await prisma.departamentos.update({ where: { id: departamento.id }, data: { responsavel_id: gestor.id } });
    }

    console.log(
        `[seed] Gestor "${gestor.usuario}" (id ${gestor.id}) criado no departamento "${departamento.nome}" (id ${departamento.id}).`,
    );
}

main()
    .catch((erro: unknown) => {
        console.error('[seed] falhou:', erro instanceof Error ? erro.message : erro);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
