import { describe, it, expect, vi } from 'vitest';
import {
  COMPANY_SUPPORT_EMAIL,
  buildMailtoUrl,
  generateSupportProtocol,
  submitFeedbackWithMailtoFallback,
} from '../feedbackService';

describe('feedbackService', () => {
  it('gera protocolo único no padrão RDJ-YYYY-XXXXXX', () => {
    const proto = generateSupportProtocol(2026);
    expect(proto).toMatch(/^RDJ-2026-[A-F0-9]{6}$/);
  });

  it('constrói URL mailto devidamente codificada para o suporte oficial', () => {
    const url = buildMailtoUrl({
      subject: '[RedijaApp] Bug #1',
      body: 'Linha 1\nLinha 2',
    });
    expect(url).toContain(`mailto:${COMPANY_SUPPORT_EMAIL}?`);
    expect(url).toContain('subject=%5BRedijaApp%5D%20Bug%20%231');
    expect(url).toContain('body=Linha%201%0ALinha%202');
  });

  it('retorna deliveredVia api quando /api/feedback responde com sucesso sem acionar mailto', async () => {
    const openMailtoFn = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, id: 'email-1', protocolo: 'RDJ-2026-ABCDEF' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const result = await submitFeedbackWithMailtoFallback(
      { tipo: 'bug', protocolo: 'RDJ-2026-ABCDEF', assunto: 'Teste', descricao: 'Descrição' },
      { subject: 'Fallback', body: 'Corpo' },
      { fetchFn, openMailtoFn },
    );

    expect(result).toEqual({
      deliveredVia: 'api',
      id: 'email-1',
      protocolo: 'RDJ-2026-ABCDEF',
    });
    expect(openMailtoFn).not.toHaveBeenCalled();
  });

  it('aciona fallback mailto quando /api/feedback falha com erro HTTP ou de rede', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const openMailtoFn = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Serviço indisponível' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const result = await submitFeedbackWithMailtoFallback(
      { tipo: 'contato', mensagem: 'Oi' },
      { subject: 'Contato', body: 'Corpo do e-mail' },
      { fetchFn, openMailtoFn },
    );

    expect(result.deliveredVia).toBe('mailto');
    expect(openMailtoFn).toHaveBeenCalledTimes(1);
    expect(openMailtoFn.mock.calls[0][0]).toContain(`mailto:${COMPANY_SUPPORT_EMAIL}`);
    warnSpy.mockRestore();
  });
});
