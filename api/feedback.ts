import type { EmailProvider, FeedbackPayload } from '../src/core/feedback/types';
import { buildFeedbackEmailContent } from '../src/core/feedback/emailTemplateBuilder';
import { ResendEmailProvider } from '../src/core/feedback/emailProvider';

export type { FeedbackPayload };

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

export type EmailProviderFactory = () => EmailProvider | null;

function defaultResendProviderFactory(): EmailProvider | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new ResendEmailProvider(apiKey);
}

export function createFeedbackHandler(
  resolveEmailProvider: EmailProviderFactory = defaultResendProviderFactory,
) {
  return async function feedbackHandler(req: NodeLikeRequest, res?: NodeLikeResponse) {
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

    if (req.method !== 'POST') {
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

    const effectiveMessage = (body?.descricao || body?.mensagem || '').trim();
    if (!effectiveMessage) {
      return sendResponse(400, { success: false, error: 'A mensagem ou descrição é obrigatória.' });
    }

    const emailProvider = resolveEmailProvider();
    if (!emailProvider) {
      console.error('[Feedback API] RESEND_API_KEY não configurada no ambiente.');
      return sendResponse(503, {
        success: false,
        error:
          'RESEND_API_KEY não configurada no ambiente da Vercel. Por favor, adicione sua chave de API do Resend nas configurações do projeto na Vercel.',
      });
    }

    const targetEmail = process.env.RESEND_TO_EMAIL || 'contato.redija@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'RedijaApp <onboarding@resend.dev>';
    const { subjectLine, htmlContent, textContent, effectiveSender } = buildFeedbackEmailContent(
      body || {},
      effectiveMessage,
    );

    try {
      const result = await emailProvider.send({
        from: fromEmail,
        to: targetEmail,
        replyTo: effectiveSender.includes('@') ? effectiveSender : undefined,
        subject: subjectLine,
        text: textContent,
        html: htmlContent,
      });

      if (result.error) {
        console.error('[Feedback API] Erro no envio via Resend:', { message: result.error });
        return sendResponse(500, {
          success: false,
          error: result.error,
        });
      }

      return sendResponse(200, {
        success: true,
        id: result.id,
        protocolo: body?.protocolo,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Feedback API] Exceção inesperada:', errorMsg);
      return sendResponse(500, {
        success: false,
        error: `Erro interno no servidor: ${errorMsg}`,
      });
    }
  };
}

export default createFeedbackHandler();
