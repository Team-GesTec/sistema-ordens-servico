import { hojeNoBrasil } from "../../utils/horasUtils";

interface CamposHorasProps {
    idBase: string;
    duracao: string;
    dataTrabalho: string;
    onDuracao: (valor: string) => void;
    onDataTrabalho: (valor: string) => void;
    desabilitado?: boolean;
    /** Classe do wrapper de cada campo (padrão do layout de página). */
    classeCampo?: string;
    /** Mostra "(opcional)" nos rótulos. */
    opcional?: boolean;
}

function CamposHoras({
    idBase,
    duracao,
    dataTrabalho,
    onDuracao,
    onDataTrabalho,
    desabilitado = false,
    classeCampo = "os-detail-field",
    opcional = false,
}: CamposHorasProps) {
    return (
        <>
            <div className={classeCampo}>
                <label htmlFor={`${idBase}-duracao`}><span>Tempo gasto{opcional ? " (opcional)" : ""}</span></label>
                <input
                    id={`${idBase}-duracao`}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Ex.: 2h 30m"
                    value={duracao}
                    onChange={(evento) => onDuracao(evento.target.value)}
                    disabled={desabilitado}
                    aria-describedby={`${idBase}-duracao-ajuda`}
                />
                <small id={`${idBase}-duracao-ajuda`}>Formato 2w 4d 6h 45m (1d = 8h, 1w = 5d).</small>
            </div>
            <div className={classeCampo}>
                <label htmlFor={`${idBase}-data`}><span>Data do trabalho{opcional ? " (opcional)" : ""}</span></label>
                <input
                    id={`${idBase}-data`}
                    type="date"
                    max={hojeNoBrasil()}
                    value={dataTrabalho}
                    onChange={(evento) => onDataTrabalho(evento.target.value)}
                    disabled={desabilitado}
                />
            </div>
        </>
    );
}

export default CamposHoras;