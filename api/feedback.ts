import { Resend } from 'resend';

export interface FeedbackPayload {
  tipo?: 'bug' | 'contato' | 'sugestao';
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
  diagnostico?: {
    projeto?: string;
    navegador?: string;
    temaEscuro?: boolean;
    resolucao?: string;
    horario?: string;
    origem?: string;
  };
}

interface NodeLikeRequest {
  method?: string;
  body?: unknown;
  json?: () => Promise<unknown>;
}

interface NodeLikeResponse {
  status: (code: number) => NodeLikeResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: NodeLikeRequest, res?: NodeLikeResponse) {
  const isWebStandard = typeof req.json === 'function' && !res;

  const sendResponse = (status: number, data: Record<string, unknown>) => {
    if (isWebStandard) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res) {
      return res.status(status).json(data);
    }
    return undefined;
  };

  const method = req.method;
  if (method !== 'POST') {
    return sendResponse(405, { success: false, error: 'Método não permitido (utilize POST).' });
  }

  let body: FeedbackPayload;
  try {
    if (isWebStandard && req.json) {
      body = (await req.json()) as FeedbackPayload;
    } else if (typeof req.body === 'string') {
      body = JSON.parse(req.body) as FeedbackPayload;
    } else {
      body = (req.body || {}) as FeedbackPayload;
    }
  } catch {
    return sendResponse(400, { success: false, error: 'JSON inválido no corpo da requisição.' });
  }

  const {
    tipo = 'bug',
    protocolo,
    categoria,
    nome,
    remetente,
    email,
    assunto,
    descricao,
    mensagem,
    projetoAtivo,
    quantidadePrints,
    diagnostico,
  } = body || {};

  const effectiveSubject = (assunto || 'Sem assunto').trim();
  const effectiveMessage = (descricao || mensagem || '').trim();
  const effectiveSender = (remetente || email || 'anonimo@usuario.redija.com.br').trim();
  const effectiveName = (nome || '').trim();

  if (!effectiveMessage) {
    return sendResponse(400, { success: false, error: 'A mensagem ou descrição é obrigatória.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Feedback API] RESEND_API_KEY não configurada no ambiente.');
    return sendResponse(503, {
      success: false,
      error:
        'RESEND_API_KEY não configurada no ambiente da Vercel. Por favor, adicione sua chave de API do Resend nas configurações do projeto na Vercel.',
    });
  }

  const resend = new Resend(apiKey);
  const targetEmail = process.env.RESEND_TO_EMAIL || 'contato.redija@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'RedijaApp <onboarding@resend.dev>';

  const subjectLine = `[RedijaApp] ${protocolo ? `${protocolo}: ` : ''}${tipo === 'bug' ? '🐛 Bug: ' : '✉️ Contato: '}${effectiveSubject}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #059669; color: #ffffff; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
    .badge { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 12px; }
    .content { padding: 24px; }
    .field { margin-bottom: 16px; }
    .field-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .field-value { font-size: 15px; color: #0f172a; line-height: 1.5; }
    .message-box { background: #f1f5f9; border-left: 4px solid #059669; padding: 16px; border-radius: 4px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
    .diag-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .diag-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    .diag-table td:first-child { color: #64748b; font-weight: 600; width: 35%; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${tipo === 'bug' ? 'Relato de Problema / Bug' : 'Mensagem de Contato'}</h1>
      <p>RedijaApp - Notificação da Plataforma</p>
    </div>
    <div class="content">
      ${protocolo ? `<div class="badge">Protocolo: ${escapeHtml(protocolo)}</div>` : ''}
      ${categoria ? `<div class="badge" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;margin-left:6px;">${escapeHtml(categoria)}</div>` : ''}

      <div class="field">
        <div class="field-label">Assunto</div>
        <div class="field-value" style="font-weight:600; font-size: 16px;">${escapeHtml(effectiveSubject)}</div>
      </div>

      <div class="field">
        <div class="field-label">Remetente</div>
        <div class="field-value">${effectiveName ? `${escapeHtml(effectiveName)} &lt;` : ''}<a href="mailto:${escapeHtml(effectiveSender)}">${escapeHtml(effectiveSender)}</a>${effectiveName ? '&gt;' : ''}</div>
      </div>

      ${projetoAtivo ? `
      <div class="field">
        <div class="field-label">Projeto Ativo</div>
        <div class="field-value">${escapeHtml(projetoAtivo)}</div>
      </div>` : ''}

      ${quantidadePrints ? `
      <div class="field">
        <div class="field-label">Prints Anexados</div>
        <div class="field-value">${quantidadePrints} imagem(ns) selecionada(s)</div>
      </div>` : ''}

      <div class="field">
        <div class="field-label">Mensagem / Descrição</div>
        <div class="message-box">${escapeHtml(effectiveMessage)}</div>
      </div>

      ${diagnostico ? `
      <div class="field" style="margin-top: 24px;">
        <div class="field-label">Diagnóstico do Navegador & Ambiente</div>
        <table class="diag-table">
          ${diagnostico.horario ? `<tr><td>Horário</td><td>${escapeHtml(diagnostico.horario)}</td></tr>` : ''}
          ${diagnostico.navegador ? `<tr><td>Navegador</td><td>${escapeHtml(diagnostico.navegador)}</td></tr>` : ''}
          ${diagnostico.resolucao ? `<tr><td>Resolução</td><td>${escapeHtml(diagnostico.resolucao)}</td></tr>` : ''}
          ${diagnostico.temaEscuro !== undefined ? `<tr><td>Tema Escuro</td><td>${diagnostico.temaEscuro ? 'Sim' : 'Não'}</td></tr>` : ''}
          ${diagnostico.origem ? `<tr><td>Origem</td><td>${escapeHtml(diagnostico.origem)}</td></tr>` : ''}
        </table>
      </div>` : ''}
    </div>
    <div class="footer">
      Mensagem enviada com segurança através da API do RedijaApp integrada ao Resend.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
[RedijaApp] ${tipo === 'bug' ? 'Relato de Problema' : 'Mensagem de Contato'}
--------------------------------------------------
Protocolo: ${protocolo || 'N/A'}
Tipo: ${tipo}
Categoria: ${categoria || 'Geral'}
Remetente: ${effectiveName ? `${effectiveName} ` : ''}<${effectiveSender}>
Assunto: ${effectiveSubject}
Projeto: ${projetoAtivo || 'N/A'}
Prints: ${quantidadePrints || 0}

Descrição:
${effectiveMessage}

Diagnóstico:
- Horário: ${diagnostico?.horario || new Date().toISOString()}
- Navegador: ${diagnostico?.navegador || 'N/A'}
- Resolução: ${diagnostico?.resolucao || 'N/A'}
- Tema Escuro: ${diagnostico?.temaEscuro ? 'Sim' : 'Não'}
- Origem: ${diagnostico?.origem || 'RedijaApp'}
--------------------------------------------------
`.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: targetEmail,
      replyTo: effectiveSender.includes('@') ? effectiveSender : undefined,
      subject: subjectLine,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[Feedback API] Erro no envio via Resend:', error);
      return sendResponse(500, {
        success: false,
        error: error.message || 'Falha ao despachar e-mail via Resend.',
      });
    }

    return sendResponse(200, {
      success: true,
      id: data?.id,
      protocolo,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Feedback API] Exceção inesperada:', errorMsg);
    return sendResponse(500, {
      success: false,
      error: `Erro interno no servidor: ${errorMsg}`,
    });
  }
}
