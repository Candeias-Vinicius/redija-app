import { gzipSync } from 'node:zlib';
import type { BrowserContext, Request, Route } from '@playwright/test';

/**
 * Google Drive falso, compartilhado entre vários contextos do navegador (cada contexto é um
 * "aparelho"). Atende só ao que o RedijaApp usa: listar, criar (multipart), atualizar conteúdo,
 * baixar e excluir arquivos, além da pasta RedijaApp.
 */
interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  content: string;
  appProperties: Record<string, string>;
  parents: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface CustomTemplateOnDrive {
  id: string;
  name: string;
  packageId: string;
  deletedAt: string | null;
}

export class FakeDrive {
  private files = new Map<string, DriveFile>();
  private seq = 0;
  /** Requisições recebidas (método + URL), por contexto. */
  readonly requests: { context: string; method: string; url: string }[] = [];

  private add(partial: Partial<DriveFile>): DriveFile {
    const now = new Date(Date.now() + this.seq).toISOString();
    const file: DriveFile = {
      id: `file_${++this.seq}`,
      name: 'arquivo',
      content: '',
      appProperties: {},
      parents: [],
      createdTime: now,
      modifiedTime: now,
      ...partial,
    };
    this.files.set(file.id, file);
    return file;
  }

  /** Modelos gravados em `redija-modelos.json` (inclusive os marcados como removidos). */
  customTemplates(): CustomTemplateOnDrive[] {
    const file = [...this.files.values()].find(
      (f) => f.appProperties.isRedijaCustomTemplates === 'true',
    );
    if (!file?.content) return [];
    return (JSON.parse(file.content).templates ?? []) as CustomTemplateOnDrive[];
  }

  customTemplateFiles(): { name: string; parentName?: string }[] {
    return [...this.files.values()]
      .filter((f) => f.appProperties.isRedijaCustomTemplates === 'true')
      .map((f) => ({ name: f.name, parentName: this.files.get(f.parents[0])?.name }));
  }

  private matches(file: DriveFile, q: string): boolean {
    if (/trashed = true/.test(q)) return false;
    const prop = q.match(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/);
    if (prop) return file.appProperties[prop[1]] === prop[2];
    const name = q.match(/name = '([^']+)'/);
    if (name) return file.name === name[1];
    if (/name contains '\.redija'/.test(q)) return file.name.endsWith('.redija');
    return false;
  }

  private parseMultipart(request: Request): { metadata: Partial<DriveFile>; content: string } {
    const type = request.headers()['content-type'] ?? '';
    const boundary = type.match(/boundary=(.+)$/)?.[1] ?? '';
    const body = request.postDataBuffer()?.toString('utf8') ?? '';
    const parts = body
      .split(`--${boundary}`)
      .map((part) => part.replace(/^\r\n/, '').replace(/\r\n$/, ''))
      .filter((part) => part && part !== '--');
    let metadata: Partial<DriveFile> = {};
    let content = '';
    for (const part of parts) {
      const [head, ...rest] = part.split('\r\n\r\n');
      const value = rest.join('\r\n\r\n');
      if (/name="metadata"/.test(head)) metadata = JSON.parse(value);
      else if (/name="file"/.test(head)) content = value;
    }
    return { metadata, content };
  }

  private async handle(route: Route, contextName: string) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    this.requests.push({ context: contextName, method, url: url.toString() });

    const isUpload = url.pathname.startsWith('/upload/drive/v3/files');
    const fileId = url.pathname.match(/\/files\/([^/]+)$/)?.[1];
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (!url.pathname.includes('/drive/v3/files')) return json({}, 404);

    if (method === 'GET' && !fileId) {
      const q = url.searchParams.get('q') ?? '';
      const files = [...this.files.values()]
        .filter((f) => this.matches(f, q))
        .map(({ id, name, createdTime, modifiedTime, appProperties }) => ({
          id,
          name,
          createdTime,
          modifiedTime,
          appProperties,
        }));
      return json({ files });
    }
    if (method === 'GET' && fileId) {
      const file = this.files.get(fileId);
      if (!file) return json({ error: { message: 'not found' } }, 404);
      return route.fulfill({ status: 200, contentType: 'application/json', body: file.content });
    }
    if (method === 'POST' && !isUpload) {
      const file = this.add(JSON.parse(request.postData() ?? '{}'));
      return json({ id: file.id });
    }
    if (method === 'POST' && isUpload) {
      const { metadata, content } = this.parseMultipart(request);
      const file = this.add({ ...metadata, content });
      return json({ id: file.id, modifiedTime: file.modifiedTime });
    }
    if (method === 'PATCH' && isUpload && fileId) {
      const file = this.files.get(fileId);
      if (!file) return json({ error: { message: 'not found' } }, 404);
      file.content = request.postData() ?? '';
      file.modifiedTime = new Date().toISOString();
      return json({ id: file.id });
    }
    if (method === 'DELETE' && fileId) {
      this.files.delete(fileId);
      return route.fulfill({ status: 204, body: '' });
    }
    return json({ error: { message: `não simulado: ${method} ${url}` } }, 500);
  }

  async attach(context: BrowserContext, contextName: string) {
    await context.route('https://www.googleapis.com/**', (route) => this.handle(route, contextName));
  }
}

// ---------------------------------------------------------------------
// Pacote falso do Typst Universe com capa (thumbnail)
// ---------------------------------------------------------------------

/** PNG 1×1 válido. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function tarHeader(name: string, size: number): Buffer {
  const block = Buffer.alloc(512);
  block.write(name, 0, 100, 'utf8');
  block.write('0000644\0', 100);
  block.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  block.write('0', 156);
  block.write('ustar\0', 257);
  block.write('00', 263);
  block.fill(0x20, 148, 156);
  let sum = 0;
  for (const b of block) sum += b;
  block.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return block;
}

/** `.tar.gz` mínimo de um pacote-modelo com `[template] thumbnail`. */
export function templatePackageTarGz(name: string, version: string): Buffer {
  const entries: [string, Buffer][] = [
    [
      'typst.toml',
      Buffer.from(
        `[package]\nname = "${name}"\nversion = "${version}"\nentrypoint = "lib.typ"\n\n[template]\npath = "template"\nentrypoint = "main.typ"\nthumbnail = "thumbnail.png"\n`,
      ),
    ],
    ['lib.typ', Buffer.from('#let ieee(..args, body) = body\n')],
    ['thumbnail.png', PNG_1X1],
  ];
  const parts: Buffer[] = [];
  for (const [entryName, data] of entries) {
    parts.push(tarHeader(entryName, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

/** Atende o Typst Universe sem rede: HEAD/GET do pacote com capa. */
export async function routeUniversePackages(context: BrowserContext) {
  await context.route('https://packages.typst.org/**', async (route) => {
    const match = new URL(route.request().url()).pathname.match(/\/preview\/(.+)-([0-9.]+)\.tar\.gz$/);
    if (!match) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'application/gzip',
      body: templatePackageTarGz(match[1], match[2]),
    });
  });
}
