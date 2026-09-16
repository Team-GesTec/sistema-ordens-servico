import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";

Given(
    "que o colaborador insere o usuário {string} e a senha {string}",
    function(this: CustomWorld, usuario: string, senha: string){
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
    async function(this: CustomWorld){
        this.response = await api
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