import {Departamento, departamentos } from '../models/modelDepartamento'
import {Request, Response} from "express";

//Controller do Departamento

export class ControllerDepartamento{
    //Get todos os departamentos cadastrados
    public getAll(req:Request, resp:Response): Response{
        return resp.status(201).json(departamentos);
    };
    //Get por ID digitado pelo usuário
    public getById(req:Request, resp:Response): Response{
        const {id} = req.params;
        const departamento = departamentos.find(dep => dep.idDepartamento === Number(id));
        if(!departamento){
            return resp.status(404).json({mensagem:"Departamento não encontrado"});
        }
        return resp.status(200).json(departamento); 
    };
    //Criar novo departamento
    public CriarDepartamento(req:Request, resp:Response): Response{
        const {idResponsavelDepartamento , nomeDepartamento} = req.body;
        const novoDepartamento: Departamento = {
            idDepartamento: departamentos.length + 1,
            nomeDepartamento: nomeDepartamento,
            idResponsavelDepartamento: idResponsavelDepartamento
        }
        departamentos.push(novoDepartamento);
        return resp.status(201).json(novoDepartamento);
    };

    //Update Departamento por ID
    public updateDepartamento(req:Request, resp:Response): Response{
        const {id} = req.params;
        const {idResponsavelDepartamento , nomeDepartamento} = req.body;
        const departamentoId = departamentos.findIndex(dep => dep.idDepartamento === Number(id));
        if(departamentoId === -1){
            return resp.status(404).json({mensagem:"Departamento não encontrado"});
        }
        const departamentoAtualizado: Departamento = {
            idDepartamento: Number(id),
            nomeDepartamento: nomeDepartamento,
            idResponsavelDepartamento: idResponsavelDepartamento
        }
        departamentos[departamentoId] = departamentoAtualizado;
        return resp.status(200).json(departamentoAtualizado);
    };
}

    

export const controller = new ControllerDepartamento();
