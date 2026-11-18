// Google Drive falso (só o necessário para os modelos personalizados), para os testes unitários.
import { vi } from 'vitest';

export interface FakeDriveFile {
  id: string;
  name: string;
  content: string;
  appProperties: Record<string, string>;
  parents: string[];
  mimeType?: string;
  createdTime: string;
  modifiedTime: string;
  trashed: boolean;
}

export interface FakeDrive {
  files: Map<string, FakeDriveFile>;
  requests: { method: string; url: string }[];
  fetch: typeof fetch;
  /** Arquivos de modelos ativos, do mais antigo para o mais novo. */
  templateFiles: () => FakeDriveFile[];
  addFile: (file: Partial<FakeDriveFile> & { id: string }) => FakeDriveFile;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let clock = Date.parse('2026-01-01T00:00:00.000Z');
function tick(): string {
  clock += 1000;
  return new Date(clock).toISOString();
}

export function createFakeDrive(): FakeDrive {
  const files = new Map<string, FakeDriveFile>();
  const requests: { method: string; url: string }[] = [];
  let seq = 0;

  const addFile: FakeDrive['addFile'] = (partial) => {
    const now = tick();
    const file: FakeDriveFile = {
      name: 'arquivo',
      content: '',
      appProperties: {},
      parents: [],
      createdTime: now,
      modifiedTime: now,
      trashed: false,
      ...partial,
    };
    files.set(file.id, file);
    return file;
  };

  const matchesQuery = (file: FakeDriveFile, q: string): boolean => {
    if (/trashed = false/.test(q) && file.trashed) return false;
    const prop = q.match(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/);
    if (prop) return file.appProperties[prop[1]] === prop[2];
    const name = q.match(/name = '([^']+)'/);
    if (name) {
      if (file.name !== name[1]) return false;
      if (/mimeType = 'application\/vnd.google-apps.folder'/.test(q)) {
        return file.mimeType === 'application/vnd.google-apps.folder';
      }
      return true;
    }
    return false;
  };

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const method = (init?.method ?? 'GET').toUpperCase();
    requests.push({ method, url: url.toString() });

    const isUpload = url.pathname.startsWith('/upload/drive/v3/files');
    const idMatch = url.pathname.match(/\/files\/([^/]+)$/);
    const fileId = idMatch ? decodeURIComponent(idMatch[1]) : null;

    if (method === 'GET' && !fileId) {
      const q = url.searchParams.get('q') ?? '';
      const list = [...files.values()]
        .filter((f) => matchesQuery(f, q))
        .sort((a, b) => a.createdTime.localeCompare(b.createdTime));
      return json({
        files: list.map((f) => ({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
          appProperties: f.appProperties,
        })),
      });
    }

    if (method === 'GET' && fileId) {
      const file = files.get(fileId);
      if (!file || file.trashed) return json({ error: { message: 'not found' } }, 404);
      return new Response(file.content, { status: 200 });
    }

    if (method === 'POST' && !isUpload) {
      const meta = JSON.parse(String(init?.body ?? '{}'));
      const file = addFile({ id: `folder_${++seq}`, ...meta });
      return json({ id: file.id });
    }

    if (method === 'POST' && isUpload) {
      const form = init?.body as FormData;
      const meta = JSON.parse(await (form.get('metadata') as Blob).text());
      const content = await (form.get('file') as Blob).text();
      const file = addFile({ id: `file_${++seq}`, ...meta, content });
      return json({ id: file.id, modifiedTime: file.modifiedTime });
    }

    if (method === 'PATCH' && isUpload && fileId) {
      const file = files.get(fileId);
      if (!file || file.trashed) return json({ error: { message: 'not found' } }, 404);
      file.content = String(init?.body ?? '');
      file.modifiedTime = tick();
      return json({ id: file.id });
    }

    if (method === 'DELETE' && fileId) {
      if (!files.delete(fileId)) return json({ error: { message: 'not found' } }, 404);
      return new Response(null, { status: 204 });
    }

    return json({ error: { message: `rota não simulada: ${method} ${url}` } }, 500);
  });

  return {
    files,
    requests,
    fetch: fetchImpl as unknown as typeof fetch,
    addFile,
    templateFiles: () =>
      [...files.values()]
        .filter((f) => f.appProperties.isRedijaCustomTemplates === 'true' && !f.trashed)
        .sort((a, b) => a.createdTime.localeCompare(b.createdTime)),
  };
}

/** localStorage em memória (com `length` e `key`) para o ambiente Node do Vitest. */
export function installMemoryLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
    writable: true,
    configurable: true,
  });
  return store;
}
