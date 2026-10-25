import { After } from "@cucumber/cucumber";
import { Readable } from "node:stream";
import request from "supertest";
import { ControllerAnexo } from "../../src/controllers/controllerAnexo";
import { criarApp } from "../../src/app";
import { ServiceAnexo } from "../../src/services/serviceAnexo";
import type {
    ArmazenamentoAnexos,
    ArquivoArmazenado,
} from "../../src/repositories/repositoryStorageAnexo";

class ArmazenamentoAnexosEmMemoria implements ArmazenamentoAnexos {
    private readonly arquivos = new Map<string, { conteudo: Buffer; tipo: string }>();

    async enviar(caminho: string, conteudo: Buffer, tipo: string): Promise<void> {
        this.arquivos.set(caminho, { conteudo, tipo });
    }

    async remover(caminho: string): Promise<void> {
        this.arquivos.delete(caminho);
    }

    async baixar(caminho: string): Promise<ArquivoArmazenado> {
        const arquivo = this.arquivos.get(caminho);
        if (!arquivo) {
            throw new Error(`Arquivo não encontrado no armazenamento de teste: ${caminho}`);
        }
        return {
            conteudo: Readable.from(arquivo.conteudo),
            tamanho: arquivo.conteudo.length,
        };
    }

    limpar(): void {
        this.arquivos.clear();
    }
}

const armazenamento = new ArmazenamentoAnexosEmMemoria();
const serviceAnexo = new ServiceAnexo(undefined, undefined, armazenamento);
const controllerAnexo = new ControllerAnexo(serviceAnexo);

After(() => armazenamento.limpar());

export const api = request(criarApp(controllerAnexo));