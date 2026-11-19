import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { config } from './config.ts';
import { convertUpload, formatFromFileName } from './convert.ts';
import { processDocxExport, type ExportRequestPayload } from './export.ts';
import { getPandocVersion } from './pandoc.ts';
import { ImportError } from './zip.ts';

const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isOriginAllowed(origin: string, allowed: readonly string[]): boolean {
  if (DEV_ORIGIN.test(origin)) return true;
  return allowed.some((rule) => {
    if (rule === origin) return true;
    // Suporta curinga de subdomínio, ex.: https://*.vercel.app (previews da Vercel)
    if (rule.includes('*')) {
      const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
      return new RegExp(`^${escaped}$`, 'i').test(origin);
    }
    return false;
  });
}

/** Limitador simples por IP (janela de 1 minuto), suficiente para uma única instância. */
function createRateLimiter(perMinute: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + 60_000 });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return true;
    }
    entry.count += 1;
    return entry.count <= perMinute;
  };
}

export function createApp() {
  const app = new Hono();
  const allowRequest = createRateLimiter(config.rateLimitPerMinute);
  let runningJobs = 0;

  app.use(
    '*',
    cors({
      origin: (origin) => (origin && isOriginAllowed(origin, config.allowedOrigins) ? origin : null),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      maxAge: 86400,
    }),
  );

  app.get('/health', async (c) => {
    const pandoc = await getPandocVersion();
    return c.json({ ok: pandoc !== null, pandoc }, pandoc ? 200 : 503);
  });

  app.post(
    '/convert',
    bodyLimit({
      maxSize: config.maxUploadBytes + 64 * 1024,
      onError: (c) =>
        c.json({ error: `Arquivo grande demais (limite: ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB).` }, 413),
    }),
    async (c) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
      if (!allowRequest(ip)) {
        return c.json({ error: 'Muitas importações em sequência. Aguarde um minuto e tente de novo.' }, 429);
      }
      if (runningJobs >= config.maxConcurrentJobs) {
        return c.json({ error: 'O serviço de importação está ocupado. Tente novamente em instantes.' }, 503);
      }

      let file: File | null;
      try {
        const form = await c.req.formData();
        const value = form.get('file');
        file = value instanceof File ? value : null;
      } catch {
        return c.json({ error: 'Envie o arquivo como multipart/form-data no campo "file".' }, 400);
      }
      if (!file) return c.json({ error: 'Nenhum arquivo enviado (campo "file").' }, 400);
      if (!formatFromFileName(file.name)) {
        return c.json({ error: 'Formato não suportado. Envie .docx, .tex, .md, .typ ou .zip.' }, 415);
      }

      runningJobs += 1;
      const startedAt = Date.now();
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await convertUpload(file.name, bytes);
        console.log(
          JSON.stringify({ evt: 'convert', format: result.format, bytes: bytes.byteLength, ms: Date.now() - startedAt }),
        );
        return c.json(result);
      } catch (err) {
        if (err instanceof ImportError) {
          return c.json({ error: err.message }, err.status as 400);
        }
        // Não registra conteúdo do documento, só o tipo do erro
        console.error(JSON.stringify({ evt: 'convert_error', message: (err as Error).message?.slice(0, 200) }));
        return c.json({ error: 'Erro inesperado ao converter o documento.' }, 500);
      } finally {
        runningJobs -= 1;
      }
    },
  );

  app.post(
    '/export',
    bodyLimit({
      maxSize: config.maxUploadBytes + 64 * 1024,
      onError: (c) =>
        c.json({ error: `Projeto grande demais para exportação (limite: ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB).` }, 413),
    }),
    async (c) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
      if (!allowRequest(ip)) {
        return c.json({ error: 'Muitas exportações em sequência. Aguarde um minuto e tente de novo.' }, 429);
      }
      if (runningJobs >= config.maxConcurrentJobs) {
        return c.json({ error: 'O serviço de conversão está ocupado. Tente novamente em instantes.' }, 503);
      }

      let payload: ExportRequestPayload;
      try {
        payload = (await c.req.json()) as ExportRequestPayload;
      } catch {
        return c.json({ error: 'Corpo JSON inválido para exportação .docx.' }, 400);
      }

      runningJobs += 1;
      const startedAt = Date.now();
      try {
        const result = await processDocxExport(payload);
        console.log(
          JSON.stringify({ evt: 'export_docx', ms: Date.now() - startedAt }),
        );
        return c.json(result);
      } catch (err) {
        if (err instanceof ImportError) {
          return c.json({ error: err.message }, err.status as 400);
        }
        console.error(JSON.stringify({ evt: 'export_error', message: (err as Error).message?.slice(0, 200) }));
        return c.json({ error: 'Erro inesperado ao exportar o documento para .docx.' }, 500);
      } finally {
        runningJobs -= 1;
      }
    },
  );

  return app;
}
