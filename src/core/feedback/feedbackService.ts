import type { FeedbackPayload } from './types';

export const COMPANY_SUPPORT_EMAIL = 'contato.redija@gmail.com';

export interface MailtoFallbackOptions {
  to?: string;
  subject: string;
  body: string;
}

export interface FeedbackSubmissionDeps {
  fetchFn?: typeof fetch;
  openMailtoFn?: (mailtoUrl: string) => void;
}

export interface FeedbackSubmissionResult {
  deliveredVia: 'api' | 'mailto';
  id?: string;
  protocolo?: string;
}

export function generateSupportProtocol(year = new Date().getFullYear()): string {
  const randomSuffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `RDJ-${year}-${randomSuffix}`;
}

export function buildMailtoUrl({
  to = COMPANY_SUPPORT_EMAIL,
  subject,
  body,
}: MailtoFallbackOptions): string {
  const mailtoSubject = encodeURIComponent(subject);
  const mailtoBody = encodeURIComponent(body);
  return `mailto:${to}?subject=${mailtoSubject}&body=${mailtoBody}`;
}

export async function submitFeedbackWithMailtoFallback(
  payload: FeedbackPayload,
  fallbackMailto: MailtoFallbackOptions,
  deps?: FeedbackSubmissionDeps,
): Promise<FeedbackSubmissionResult> {
  const fetchFn = deps?.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const openMailtoFn =
    deps?.openMailtoFn ??
    ((url: string) => {
      window.open(url, '_blank');
    });

  try {
    const response = await fetchFn('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
      id?: string;
      protocolo?: string;
    } | null;

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.error || `Serviço de e-mail retornou status HTTP ${response.status}`,
      );
    }

    return {
      deliveredVia: 'api',
      id: result.id,
      protocolo: result.protocolo ?? payload.protocolo,
    };
  } catch (err) {
    console.warn('Envio via API indisponível, acionando fallback mailto:', err);
    openMailtoFn(buildMailtoUrl(fallbackMailto));
    return {
      deliveredVia: 'mailto',
      protocolo: payload.protocolo,
    };
  }
}
