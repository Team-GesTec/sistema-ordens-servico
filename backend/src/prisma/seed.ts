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
 *
 * ALTERAÇÕES (17/10/2026):
 *  - 3.1-BE01: grava os valores iniciais da configuração de SLA (`sla_config`) para O.S. de
 *    manutenção, conforme o Documento Mestre. Só insere as criticidades que ainda não existem:
 *    um valor já alterado no banco nunca é sobrescrito pelo seed.
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
 * Dias úteis base iniciais do SLA de manutenção por criticidade (Documento Mestre — 3.1-BE01).
 * Depois do seed, o valor que vale é o da tabela `sla_config`; este é só o ponto de partida.
 */
const SLA_MANUTENCAO_INICIAL = [
    { criticidade: 'baixo', prazo_dias_uteis: 7 }, //      nível 1
    { criticidade: 'medio', prazo_dias_uteis: 5 }, //      nível 2
    { criticidade: 'alto', prazo_dias_uteis: 3 }, //       nível 3
    { criticidade: 'muito_alto', prazo_dias_uteis: 2 }, // nível 4
    { criticidade: 'urgente', prazo_dias_uteis: 1 }, //    nível 5
] as const;

/** Insere a configuração de SLA de manutenção que ainda não existir (não altera as existentes). */
async function criarConfigSla(): Promise<void> {
    const resultado = await prisma.sla_config.createMany({
        data: SLA_MANUTENCAO_INICIAL.map((config) => ({ tipo: 'manutencao' as const, ...config })),
        skipDuplicates: true,
    });
    console.log(`[seed] Configuração de SLA: ${resultado.count} criticidade(s) de manutenção inserida(s).`);
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

    const gestorExistente = await prisma.funcionarios.findUnique({
        where: { usuario },
        select: { id: true },
    });
    if (gestorExistente) {
        console.log(`[seed] O gestor "${usuario}" já existe (id ${gestorExistente.id}).`);
    } else {
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

    // Criação de técnico e seu departamento
    const usuarioTecnico = lerVariavel('SEED_TECNICO_USUARIO').trim().toLowerCase();
    const senhaTecnico = validarSenha(lerVariavel('SEED_TECNICO_SENHA'), 'SEED_TECNICO_SENHA');
    const nomeTecnico = process.env.SEED_TECNICO_NOME?.trim() || 'Técnico';
    const nomeDepartamentoTecnico = process.env.SEED_DEPARTAMENTO_TECNICO_NOME?.trim() || 'Tecnologia';

    const tecnicoExistente = await prisma.funcionarios.findUnique({
        where: { usuario: usuarioTecnico },
        select: { id: true },
    });
    if (tecnicoExistente) {
        console.log(`[seed] O técnico "${usuarioTecnico}" já existe (id ${tecnicoExistente.id}).`);
    } else {
        const departamentoTecnico =
            (await prisma.departamentos.findFirst({ where: { nome: nomeDepartamentoTecnico } })) ??
            (await prisma.departamentos.create({ data: { nome: nomeDepartamentoTecnico } }));

        const tecnico = await prisma.funcionarios.create({
            data: {
                usuario: usuarioTecnico,
                nome: nomeTecnico,
                tipo: 'tecnico',
                departamento_id: departamentoTecnico.id,
                senha_hash: await gerarHashSenha(senhaTecnico),
            },
        });

        console.log(
            `[seed] Técnico "${tecnico.usuario}" (id ${tecnico.id}) criado no departamento "${departamentoTecnico.nome}" (id ${departamentoTecnico.id}).`,
        );
    }

    // 3.1-BE01: configuração inicial do SLA
    await criarConfigSla();
}

main()
    .catch((erro: unknown) => {
        console.error('[seed] falhou:', erro instanceof Error ? erro.message : erro);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
