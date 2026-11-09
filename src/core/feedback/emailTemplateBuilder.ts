import type { FeedbackPayload } from './types';

export interface RenderedFeedbackEmail {
  subjectLine: string;
  htmlContent: string;
  textContent: string;
  effectiveSender: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildFeedbackEmailContent(
  payload: FeedbackPayload,
  effectiveMessage: string,
): RenderedFeedbackEmail {
  const {
    tipo = 'bug',
    protocolo,
    categoria,
    nome,
    remetente,
    email,
    assunto,
    projetoAtivo,
    quantidadePrints,
    diagnostico,
  } = payload;

  const effectiveSubject = (assunto || 'Sem assunto').trim();
  const effectiveSender = (remetente || email || 'anonimo@usuario.redija.com.br').trim();
  const effectiveName = (nome || '').trim();

  const subjectLine = `[RedijaApp] ${protocolo ? `${protocolo}: ` : ''}${
    tipo === 'bug' ? '🐛 Bug: ' : '✉️ Contato: '
  }${effectiveSubject}`;

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

      ${
        projetoAtivo
          ? `
      <div class="field">
        <div class="field-label">Projeto Ativo</div>
        <div class="field-value">${escapeHtml(projetoAtivo)}</div>
      </div>`
          : ''
      }

      ${
        quantidadePrints
          ? `
      <div class="field">
        <div class="field-label">Prints Anexados</div>
        <div class="field-value">${quantidadePrints} imagem(ns) selecionada(s)</div>
      </div>`
          : ''
      }

      <div class="field">
        <div class="field-label">Mensagem / Descrição</div>
        <div class="message-box">${escapeHtml(effectiveMessage)}</div>
      </div>

      ${
        diagnostico
          ? `
      <div class="field" style="margin-top: 24px;">
        <div class="field-label">Diagnóstico do Navegador & Ambiente</div>
        <table class="diag-table">
          ${diagnostico.horario ? `<tr><td>Horário</td><td>${escapeHtml(diagnostico.horario)}</td></tr>` : ''}
          ${diagnostico.navegador ? `<tr><td>Navegador</td><td>${escapeHtml(diagnostico.navegador)}</td></tr>` : ''}
          ${diagnostico.resolucao ? `<tr><td>Resolução</td><td>${escapeHtml(diagnostico.resolucao)}</td></tr>` : ''}
          ${diagnostico.temaEscuro !== undefined ? `<tr><td>Tema Escuro</td><td>${diagnostico.temaEscuro ? 'Sim' : 'Não'}</td></tr>` : ''}
          ${diagnostico.origem ? `<tr><td>Origem</td><td>${escapeHtml(diagnostico.origem)}</td></tr>` : ''}
        </table>
      </div>`
          : ''
      }
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

  return {
    subjectLine,
    htmlContent,
    textContent,
    effectiveSender,
  };
}
