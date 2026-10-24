import express from "express";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { criarRotasAuth } from "../../src/routes/routeAuth";
import { ControllerAuth } from "../../src/controllers/controllerAuth";
import { ServiceAuth } from "../../src/services/serviceAuth";
import type { RepositoryFuncionario } from "../../src/repositories/repositoryFuncionario";
import type { FuncionarioComSenha } from "../../src/models/modelFuncionario";

const funcionario = {
    id: 1,
    departamento_id: 1,
    usuario: "sgos",
    senha_hash: bcrypt.hashSync("sgos1234", 12),
    nome: "Administrador de teste",
    tipo: "gestor",
    ativo: true,
} as unknown as FuncionarioComSenha;

const repositorioFalso = {
    buscarCredenciaisPorUsuario: async (usuario: string) =>
        usuario === "sgos" ? funcionario : null,
} as unknown as RepositoryFuncionario;

const controllerAuth = new ControllerAuth(new ServiceAuth(repositorioFalso));

const app = express();
app.use(express.json());
app.use("/auth", criarRotasAuth(controllerAuth));

export const apiAuth = request(app);