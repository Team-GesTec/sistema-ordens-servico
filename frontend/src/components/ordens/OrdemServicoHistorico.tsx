import { useEffect, useState } from "react";
import { ordemServicoService } from "../../services/ordemServico";
import { ApiError } from "../../services/api";
import type { HistoricoOrdemServico } from "../../types/api";

interface OrdemServicoHistoricoProps {
    osId: number;
}

function dataHora(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function rotuloAcao(acao: HistoricoOrdemServico["acao"]): string {
    if (acao === "insercao") return "Criação";
    if (acao === "exclusao") return "Exclusão registrada";
    return "Atualização";
}

export default function OrdemServicoHistorico({ osId }: OrdemServicoHistoricoProps) {
    const [registros, setRegistros] = useState<HistoricoOrdemServico[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        let vigente = true;
        setCarregando(true);
        setErro(null);
        ordemServicoService.listarHistorico(osId)
            .then((resultado) => { if (vigente) setRegistros(resultado); })
            .catch((error: unknown) => {
                if (!vigente) return;
                setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o histórico da O.S.");
            })
            .finally(() => { if (vigente) setCarregando(false); });
        return () => { vigente = false; };
    }, [osId]);

    return (
        <section className="ordem-detalhes-descricao ordem-historico" aria-labelledby="ordem-historico-titulo">
            <div className="ordem-historico-heading">
                <h3 id="ordem-historico-titulo">Histórico de alterações</h3>
                {!carregando && !erro && <span>{registros.length} evento(s)</span>}
            </div>
            {carregando ? <p role="status">Carregando histórico...</p> : erro ? <p role="alert" className="ordens-feedback ordens-feedback--error">{erro}</p> : registros.length === 0 ? <p>Nenhuma alteração registrada para esta O.S.</p> : (
                <ol className="ordem-historico-lista">
                    {registros.map((registro) => (
                        <li key={registro.id} className="ordem-historico-item">
                            <div className="ordem-historico-meta">
                                <strong>{registro.funcionarios?.nome || `Funcionário #${registro.funcionario_id}`}</strong>
                                <time dateTime={registro.data_modificacao}>{dataHora(registro.data_modificacao)}</time>
                            </div>
                            <p>{rotuloAcao(registro.acao)}{registro.campo_alterado ? ` · ${registro.campo_alterado}` : ""}</p>
                            {(registro.dado_antigo !== null || registro.dado_novo !== null) && (
                                <p className="ordem-historico-valores">
                                    <span>Anterior: {registro.dado_antigo ?? "—"}</span>
                                    <span>Novo: {registro.dado_novo ?? "—"}</span>
                                </p>
                            )}
                            {registro.justificativa && <p className="ordem-historico-justificativa">Justificativa: {registro.justificativa}</p>}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
