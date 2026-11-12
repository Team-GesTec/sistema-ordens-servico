export type EstadoEmail = 'pendente' | 'enviando' | 'enviado' | 'falhou';

export interface EmailPendente {
    id: string;
    evento_id: string;
    destinatario_id: number;
    para: string;
    assunto: string;
    html: string;
    tentativas: number;
    estado: EstadoEmail;
    proxima_tentativa_em: string;
    ultimo_erro?: string;
    criado_em: string;
    enviado_em?: string;
}
