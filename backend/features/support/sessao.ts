/**
 * Funções de apoio compartilhadas pelos steps de anexos (US#2.6) e do dashboard do técnico (US#1.3):
 * login do gestor e do técnico do seed, criação de O.S. de teste e busca de outro departamento.
 * Não registra steps: só exporta funções.
 */
import assert from "assert/strict";
import { env } from "process";
import { api } from "./api";

/** Funcionário como o login devolve. */
export interface FuncionarioSessao {
    id: number;
    nome: string;
    tipo: "gestor" | "tecnico";
    departamento_id: number;
}

/** Token + funcionário logado. */
export interface Sessao {
    token: string;
    funcionario: FuncionarioSessao;
}

/** Cabeçalho Authorization da sessão. */
export const autorizacao = (sessao: Sessao) => `Bearer ${sessao.token}`;

/** Faz login e devolve token + funcionário. */
export async function entrar(usuario: string | undefined, senha: string | undefined): Promise<Sessao> {
    assert.ok(usuario, "Usuário de teste não configurado no .env");
    assert.ok(senha, "Senha de teste não configurada no .env");

    const resposta = await api.post("/auth/login").send({ usuario, senha });
    assert.equal(resposta.status, 200, `Falha na autenticação: ${JSON.stringify(resposta.body)}`);
    return resposta.body as Sessao;
}

/** Login do gestor e do técnico configurados no seed (SEED_GESTOR_* e SEED_TECNICO_*). */
export async function entrarGestorETecnico(): Promise<{ gestor: Sessao; tecnico: Sessao }> {
    const gestor = await entrar(env.SEED_GESTOR_USUARIO, env.SEED_GESTOR_SENHA);
    const tecnico = await entrar(env.SEED_TECNICO_USUARIO, env.SEED_TECNICO_SENHA);
    assert.equal(gestor.funcionario.tipo, "gestor", "O usuário SEED_GESTOR_USUARIO precisa ter perfil gestor");
    assert.equal(tecnico.funcionario.tipo, "tecnico", "O usuário SEED_TECNICO_USUARIO precisa ter perfil técnico");
    return { gestor, tecnico };
}

/**
 * O gestor abre uma O.S. de instalação (sem SLA, não depende da configuração de SLA).
 * @returns A O.S. criada.
 */
export async function criarOrdemDeTeste(
    gestor: Sessao,
    opcoes: { departamentoId: number; responsavelId?: number; titulo?: string },
): Promise<{ id: number; departamento_id: number; responsavel_id: number | null; status: string }> {
    const resposta = await api
        .post("/ordens-servico")
        .set("Authorization", autorizacao(gestor))
        .send({
            tipo: "instalacao",
            titulo: opcoes.titulo ?? "OS de teste automatizado",
            descricao: "O.S. criada pelos testes automatizados",
            departamento_id: opcoes.departamentoId,
            ...(opcoes.responsavelId !== undefined ? { responsavel_id: opcoes.responsavelId } : {}),
        });
    assert.equal(resposta.status, 201, `Falha ao criar O.S.: ${JSON.stringify(resposta.body)}`);
    return resposta.body;
}

/** Devolve um departamento diferente do informado (cria um, se não houver). */
export async function obterOutroDepartamento(gestor: Sessao, departamentoId: number): Promise<number> {
    const lista = await api.get("/departamento").set("Authorization", autorizacao(gestor));
    assert.equal(lista.status, 200);
    const outro = (lista.body as { id: number }[]).find((departamento) => departamento.id !== departamentoId);
    if (outro) {
        return outro.id;
    }

    const criado = await api
        .post("/departamento")
        .set("Authorization", autorizacao(gestor))
        .send({ nome: "Departamento de teste automatizado" });
    assert.equal(criado.status, 201, `Falha ao criar departamento: ${JSON.stringify(criado.body)}`);
    return criado.body.id;
}
