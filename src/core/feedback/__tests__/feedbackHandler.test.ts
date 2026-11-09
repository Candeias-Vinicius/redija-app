import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../../../api/feedback';

interface MockResponseData {
  success?: boolean;
  error?: string;
  id?: string;
  protocolo?: string;
}

vi.mock('resend', () => {
  class MockResend {
    emails = {
      send: vi.fn().mockImplementation(async ({ subject }: { subject: string }) => {
        if (subject.includes('FORCE_ERROR')) {
          return { data: null, error: { message: 'Erro simulado no Resend' } };
        }
        return { data: { id: 'mock-email-id-123' }, error: null };
      }),
    };
  }
  return {
    Resend: MockResend,
  };
});

describe('Vercel Serverless Function: /api/feedback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve rejeitar métodos diferentes de POST com HTTP 405', async () => {
    const req = { method: 'GET' };
    let statusCode = 0;
    let responseData: MockResponseData = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseData = data as MockResponseData;
      },
      setHeader: vi.fn(),
    };

    await handler(req, res);

    expect(statusCode).toBe(405);
    expect(responseData).toEqual({
      success: false,
      error: 'Método não permitido (utilize POST).',
    });
  });

  it('deve retornar erro 400 quando a mensagem ou descrição estiver vazia', async () => {
    const req = {
      method: 'POST',
      body: {
        tipo: 'bug',
        assunto: 'Teste sem descrição',
        descricao: '',
      },
    };
    let statusCode = 0;
    let responseData: MockResponseData = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseData = data as MockResponseData;
      },
      setHeader: vi.fn(),
    };

    await handler(req, res);

    expect(statusCode).toBe(400);
    expect(responseData?.success).toBe(false);
    expect(responseData?.error).toContain('obrigatória');
  });

  it('deve retornar status 503 com instrução clara quando RESEND_API_KEY não estiver definida', async () => {
    delete process.env.RESEND_API_KEY;

    const req = {
      method: 'POST',
      body: {
        tipo: 'bug',
        assunto: 'Bug visual',
        descricao: 'O botão de exportar não responde.',
      },
    };
    let statusCode = 0;
    let responseData: MockResponseData = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseData = data as MockResponseData;
      },
      setHeader: vi.fn(),
    };

    await handler(req, res);

    expect(statusCode).toBe(503);
    expect(responseData?.success).toBe(false);
    expect(responseData?.error).toContain('RESEND_API_KEY não configurada');
  });

  it('deve despachar o e-mail com sucesso (HTTP 200) quando RESEND_API_KEY estiver configurada', async () => {
    process.env.RESEND_API_KEY = 're_test_key_12345';

    const req = {
      method: 'POST',
      body: {
        tipo: 'bug',
        protocolo: 'RDJ-2026-TEST01',
        categoria: 'bug',
        remetente: 'usuario@teste.com',
        assunto: 'Falha no preview ABNT',
        descricao: 'Ao compilar documento de 10 páginas o PDF demora.',
        projetoAtivo: 'Meu TCC',
        diagnostico: {
          navegador: 'Chrome Headless',
          resolucao: '1920x1080',
          temaEscuro: false,
        },
      },
    };
    let statusCode = 0;
    let responseData: MockResponseData = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseData = data as MockResponseData;
      },
      setHeader: vi.fn(),
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(responseData?.success).toBe(true);
    expect(responseData?.id).toBe('mock-email-id-123');
    expect(responseData?.protocolo).toBe('RDJ-2026-TEST01');
  });

  it('deve suportar Web standard Request/Response (Edge / Fetch API)', async () => {
    process.env.RESEND_API_KEY = 're_test_key_12345';

    const req = {
      method: 'POST',
      json: async () => ({
        tipo: 'contato',
        email: 'contato@usuario.com',
        assunto: 'Dúvida sobre normas',
        mensagem: 'Gostaria de saber se aceita Vancouver.',
      }),
    };

    const response = (await handler(req)) as Response;
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);

    const json = (await response.json()) as MockResponseData;
    expect(json.success).toBe(true);
    expect(json.id).toBe('mock-email-id-123');
  });

  it('deve retornar status 500 se o serviço Resend relatar erro no envio', async () => {
    process.env.RESEND_API_KEY = 're_test_key_12345';

    const req = {
      method: 'POST',
      body: {
        tipo: 'bug',
        assunto: 'FORCE_ERROR',
        descricao: 'Simulação de erro na API do Resend',
      },
    };
    let statusCode = 0;
    let responseData: MockResponseData = {};

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseData = data as MockResponseData;
      },
      setHeader: vi.fn(),
    };

    await handler(req, res);

    expect(statusCode).toBe(500);
    expect(responseData?.success).toBe(false);
    expect(responseData?.error).toBe('Erro simulado no Resend');
  });
});
