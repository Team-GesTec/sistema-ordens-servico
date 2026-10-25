import "dotenv/config";
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { apiAuth } from "../support/apiAuth";
import { CustomWorld } from "../support/world";

Given(
    "que o colaborador usa as credenciais do gestor configuradas no ambiente",
    function(this: CustomWorld) {
        const usuario = process.env.SEED_GESTOR_USUARIO?.trim().toLowerCase();
        const senha = process.env.SEED_GESTOR_SENHA;
        assert.ok(usuario, "Configure SEED_GESTOR_USUARIO no backend/.env");
        assert.ok(senha, "Configure SEED_GESTOR_SENHA no backend/.env");
        this.data.usuario = usuario;
        this.data.senha = senha;
    }
);

Given(
    "que o colaborador insere o usuário {string} ou uma senha incorreta",
    function(this: CustomWorld, usuario: string){
        this.data.usuario = usuario;
        this.data.senha = "senha_incorreta";
    }
);

When(
    "solicita o acesso",
    async function(this: CustomWorld) {
        this.response = await apiAuth
            .post("/auth/login")
            .send({
                usuario: this.data.usuario,
                senha: this.data.senha
            });
    }
);

Then(
    "o sistema autentica o colaborador com sucesso",
    function(this: CustomWorld){
        assert.equal(this.response?.status, 200)
    }
);

Then(
    "o sistema nega o acesso",
    function(this: CustomWorld){
        assert.equal(this.response?.status, 401)
    }
);