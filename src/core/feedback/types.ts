export type FeedbackKind = 'bug' | 'contato' | 'sugestao';

export interface FeedbackDiagnostics {
  projeto?: string;
  navegador?: string;
  temaEscuro?: boolean;
  resolucao?: string;
  horario?: string;
  origem?: string;
}

export interface FeedbackPayload {
  tipo?: FeedbackKind;
  protocolo?: string;
  categoria?: string;
  nome?: string;
  remetente?: string;
  email?: string;
  assunto?: string;
  descricao?: string;
  mensagem?: string;
  projetoAtivo?: string;
  quantidadePrints?: number;
  diagnostico?: FeedbackDiagnostics;
}

export interface SendEmailRequest {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  id?: string;
  error?: string;
}

export interface EmailProvider {
  send(email: SendEmailRequest): Promise<SendEmailResult>;
}
