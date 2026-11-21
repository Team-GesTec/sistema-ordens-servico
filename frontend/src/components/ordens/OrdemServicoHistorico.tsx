import { useCallback, useEffect, useState } from "react";
import { ordemServicoService } from "../../services/ordemServico";
import { ApiError } from "../../services/api";
import { getStoredUser } from "../../services/auth";
import type { HistoricoOrdemServico, Paginacao } from "../../types/api";
import { campoLegivel, mostraValores, valorLegivel } from "../../utils/auditoriaUtils";

interface OrdemServicoHistoricoProps {
    osId: number;
}

/** Atividades carregadas por vez ("Carregar mais" busca a próxima página). */
const LIMITE_POR_PAGINA = 20;

/** Atividades da O.S. (US#2.10): somente gestor, mais recentes primeiro. */
export default function OrdemServicoHistorico({ osId }: OrdemServicoHistoricoProps) {
    const ehGestor = getStoredUser()?.tipo === "gestor";
    const [registros, setRegistros] = useState<HistoricoOrdemServico[]>([]);
    const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
    const [carregando, setCarregando] = useState(ehGestor);
    const [erro, setErro] = useState<string | null>(null);
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        if (!ehGestor) return;
        let vigente = true;
        setCarregando(true);
        setErro(null);
        ordemServicoService.listarHistorico(osId, 1, LIMITE_POR_PAGINA)
            .then((resultado) => {
                if (!vigente) return;
                setRegistros(resultado.dados);
                setPaginacao(resultado.paginacao);
            })
            .catch((error: unknown) => {
                if (!vigente) return;
                setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o histórico da O.S.");
            })
            .finally(() => { if (vigente) setCarregando(false); });
        return () => { vigente = false; };
    }, [osId, ehGestor, tentativa]);

    const carregarMais = useCallback(async () => {
        if (!paginacao) return;
        setCarregando(true);
        setErro(null);
        try {
            const resultado = await ordemServicoService.listarHistorico(osId, paginacao.pagina + 1, LIMITE_POR_PAGINA);
            setRegistros((atuais) => [...atuais, ...resultado.dados]);
            setPaginacao(resultado.paginacao);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível carregar mais atividades.");
        } finally {
            setCarregando(false);
        }
    }, [osId, paginacao]);

    const temMais = paginacao !== null && paginacao.pagina < paginacao.total_paginas;

    return (
        <section className="ordem-detalhes-descricao ordem-historico" aria-labelledby="ordem-historico-titulo">
            <div className="ordem-historico-heading">
                <h3 id="ordem-historico-titulo">Histórico de atividades</h3>
                {ehGestor && paginacao && <span>{paginacao.total} evento(s)</span>}
            </div>
            {!ehGestor ? (
                <p>O histórico de atividades da O.S. está disponível somente para gestores.</p>
            ) : erro && registros.length === 0 ? (
                <div role="alert" className="ordens-feedback ordens-feedback--error">
                    <p>{erro}</p>
                    <button type="button" className="btn btn-secondary" onClick={() => setTentativa((atual) => atual + 1)} disabled={carregando}>
                        Tentar novamente
                    </button>
                </div>
            ) : carregando && registros.length === 0 ? (
                <p role="status">Carregando histórico...</p>
            ) : registros.length === 0 ? (
                <p>Nenhuma atividade registrada para esta O.S. até o momento.</p>
            ) : (
                <>
                    <ol className="ordem-historico-lista">
                        {registros.map((registro) => (
                            <li key={registro.id} className="ordem-historico-item">
                                <div className="ordem-historico-meta">
                                    <strong>{registro.descricao}</strong>
                                    <time dateTime={registro.data_modificacao}>{registro.data_hora}</time>
                                </div>
                                <p>{registro.funcionarios?.nome || `Funcionário #${registro.funcionario_id}`}</p>
                                {mostraValores(registro) && (
                                    <p className="ordem-historico-valores">
                                        <span>{campoLegivel(registro.campo_alterado)}</span>
                                        <span>Anterior: {valorLegivel(registro, registro.dado_antigo)}</span>
                                        <span>Novo: {valorLegivel(registro, registro.dado_novo)}</span>
                                    </p>
                                )}
                                {registro.parecer && <p className="ordem-historico-justificativa">Parecer técnico: {registro.parecer}</p>}
                                {!registro.parecer && registro.justificativa && <p className="ordem-historico-justificativa">Justificativa: {registro.justificativa}</p>}
                                {registro.apontamento_id !== null && <p className="ordem-historico-justificativa">Lançamento de horas #{registro.apontamento_id}</p>}
                            </li>
                        ))}
                    </ol>
                    {erro && (
                        <div role="alert" className="ordens-feedback ordens-feedback--error">
                            <p>{erro}</p>
                            <button type="button" className="btn btn-secondary" onClick={() => void carregarMais()} disabled={carregando}>
                                Tentar novamente
                            </button>
                        </div>
                    )}
                    {temMais && !erro && (
                        <button type="button" className="btn btn-secondary" onClick={() => void carregarMais()} disabled={carregando}>
                            {carregando ? "Carregando..." : "Carregar mais atividades"}
                        </button>
                    )}
                </>
            )}
        </section>
    );
}
