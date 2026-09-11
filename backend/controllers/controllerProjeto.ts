import {Projeto, projetos} from '../models/modelProjeto';
import {Request, Response} from "express";


export class ControllerProjeto{
    //GET ALL
    public getAll(req:Request, resp:Response): Response{
        return resp.status(200).json(projetos);
    };
    // GET BY ID
    public getById(req:Request, resp:Response): Response{
        const {id} = req.params;
        const projeto = projetos.find(proj => proj.idProjeto === Number(id));
        if (!projeto) {
            return resp.status(404).json({ mensagem: "Projeto não encontrado" });
        }
        return resp.status(200).json(projeto);
    };
    //CRIAR PROJETO
    public criarProjeto(req:Request, resp:Response): Response{
        const {idClienteProjeto, nomeProjeto, dataPrazoProjeto, statusProjeto} = req.body;
        const novoProjeto: Projeto = {
            idProjeto: projetos.length + 1,
            idClienteProjeto: idClienteProjeto,
            nomeProjeto: nomeProjeto,
            dataPrazoProjeto: dataPrazoProjeto,
            statusProjeto: statusProjeto
        }
        projetos.push(novoProjeto);
        return resp.status(201).json(novoProjeto);
    }
    //UPDATE PROJETO
    public updateProjeto(req:Request, resp:Response): Response{
        const {id} = req.params;
        const {idClienteProjeto, nomeProjeto, dataPrazoProjeto, statusProjeto} = req.body;
        const projetoId = projetos.findIndex(proj => proj.idProjeto === Number(id));
        if (projetoId === -1) {
            return resp.status(404).json({ mensagem: "Projeto não encontrado" });
        }
        const projetoAtualizado: Projeto = {
            idProjeto: Number(id),
            idClienteProjeto: idClienteProjeto,
            nomeProjeto: nomeProjeto,
            dataPrazoProjeto: dataPrazoProjeto,
            statusProjeto: statusProjeto
        }
        projetos[projetoId] = projetoAtualizado;
        return resp.status(200).json(projetoAtualizado);
    };
    //DELETE PROJETO
    public deleteProjeto(req:Request, resp:Response): Response{
        const {id} = req.params;
        const projetoId = projetos.findIndex(proj => proj.idProjeto === Number(id));
        if (projetoId === -1) {
            return resp.status(404).json({ mensagem: "Projeto não encontrado" });
        }
        projetos.splice(projetoId, 1);
        return resp.status(200).json({ mensagem: "Projeto deletado com sucesso" });
    };
};
export const controller = new ControllerProjeto();