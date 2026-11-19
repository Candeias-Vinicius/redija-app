// =====================================================================
// RedijaApp: Regras de mesclagem dos modelos personalizados (funções puras)
// =====================================================================
//
// Cada aparelho guarda a lista completa de modelos do usuário, inclusive os removidos
// (`deletedAt` preenchido). A mesclagem é feita item a item pelo `id`: vence a versão com o
// `updatedAt` mais recente. Assim uma remoção feita num aparelho não é desfeita por outro que
// ainda tinha o modelo, e o "Desfazer" (que atualiza o `updatedAt`) volta a valer em todos.

/** Modelo personalizado no formato sincronizado (sem o dono, que é implícito em cada lista). */
export interface SyncedCustomTemplate {
  id: string;
  name: string;
  packageId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 200;
const PACKAGE_ID_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9][0-9.]*$/;

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Valida e normaliza um modelo vindo do armazenamento local, do `localStorage` antigo ou do
 * arquivo do Drive. Retorna `null` para entradas inválidas (que são descartadas).
 * Registros antigos sem `updatedAt` usam a data de criação.
 */
export function normalizeCustomTemplate(
  value: unknown,
  fallbackDate = new Date().toISOString(),
): SyncedCustomTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id.trim() || v.id.length > MAX_ID_LENGTH) return null;
  if (typeof v.name !== 'string' || typeof v.packageId !== 'string') return null;

  const name = v.name.trim().slice(0, MAX_NAME_LENGTH);
  const packageId = v.packageId.trim();
  if (!name || !PACKAGE_ID_REGEX.test(packageId)) return null;

  const createdAt = toIsoDate(v.createdAt) ?? toIsoDate(v.updatedAt) ?? fallbackDate;
  const updatedAt = toIsoDate(v.updatedAt) ?? createdAt;
  const deletedAt = toIsoDate(v.deletedAt);

  return { id: v.id, name, packageId, createdAt, updatedAt, deletedAt };
}

export function isSameCustomTemplate(a: SyncedCustomTemplate, b: SyncedCustomTemplate): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.packageId === b.packageId &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null)
  );
}

/**
 * Escolhe a versão que vale entre duas cópias do mesmo modelo.
 * - `updatedAt` mais recente vence;
 * - empate: a remoção vence (um modelo removido nunca "ressuscita" por acaso);
 * - empate total: desempate estável, para todos os aparelhos chegarem ao mesmo resultado.
 */
export function pickNewerCustomTemplate(
  a: SyncedCustomTemplate,
  b: SyncedCustomTemplate,
): SyncedCustomTemplate {
  const timeA = Date.parse(a.updatedAt);
  const timeB = Date.parse(b.updatedAt);
  if (timeA !== timeB) return timeA > timeB ? a : b;
  if (Boolean(a.deletedAt) !== Boolean(b.deletedAt)) return a.deletedAt ? a : b;
  return JSON.stringify(a) <= JSON.stringify(b) ? a : b;
}

/** Ordem de exibição: mais antigos primeiro (os novos entram no fim da lista). */
export function compareCustomTemplates(a: SyncedCustomTemplate, b: SyncedCustomTemplate): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Se dois aparelhos adicionaram o mesmo pacote antes de sincronizar, fica só o mais antigo.
 * Os outros recebem marca de exclusão com o próprio `updatedAt` (o empate favorece a remoção),
 * então todos os aparelhos chegam ao mesmo resultado sem depender do relógio de cada um.
 */
function dedupeByPackage(list: SyncedCustomTemplate[]): SyncedCustomTemplate[] {
  const keeperByPackage = new Map<string, SyncedCustomTemplate>();
  for (const item of [...list].sort(compareCustomTemplates)) {
    if (item.deletedAt) continue;
    const key = item.packageId.toLowerCase();
    if (!keeperByPackage.has(key)) keeperByPackage.set(key, item);
  }
  return list.map((item) => {
    if (item.deletedAt) return item;
    const keeper = keeperByPackage.get(item.packageId.toLowerCase());
    if (!keeper || keeper.id === item.id) return item;
    return { ...item, deletedAt: item.updatedAt };
  });
}

function differs(
  merged: SyncedCustomTemplate[],
  side: SyncedCustomTemplate[],
): boolean {
  if (merged.length !== side.length) return true;
  const byId = new Map(side.map((t) => [t.id, t]));
  return merged.some((t) => {
    const other = byId.get(t.id);
    return !other || !isSameCustomTemplate(t, other);
  });
}

export interface CustomTemplatesMergeResult {
  /** Lista completa (inclui os removidos), em ordem de exibição. */
  merged: SyncedCustomTemplate[];
  /** O armazenamento local precisa ser atualizado. */
  changedLocal: boolean;
  /** O arquivo do Drive precisa ser regravado. */
  changedRemote: boolean;
}

/**
 * Mescla a lista local com a do Drive, item a item pelo `updatedAt`, respeitando o `deletedAt`.
 * Um item que só existe de um lado é mantido (nada é apagado de verdade, só marcado).
 */
export function mergeCustomTemplateLists(
  local: SyncedCustomTemplate[],
  remote: SyncedCustomTemplate[],
): CustomTemplatesMergeResult {
  const byId = new Map<string, SyncedCustomTemplate>();
  for (const item of [...local, ...remote]) {
    const current = byId.get(item.id);
    byId.set(item.id, current ? pickNewerCustomTemplate(current, item) : item);
  }
  const merged = dedupeByPackage([...byId.values()]).sort(compareCustomTemplates);
  return {
    merged,
    changedLocal: differs(merged, local),
    changedRemote: differs(merged, remote),
  };
}

// ---------------------------------------------------------------------
// Arquivo `redija-modelos.json` no Drive
// ---------------------------------------------------------------------

export const CUSTOM_TEMPLATES_PAYLOAD_KIND = 'redija-custom-templates';
export const CUSTOM_TEMPLATES_PAYLOAD_VERSION = 1;

export interface CustomTemplatesPayload {
  kind: typeof CUSTOM_TEMPLATES_PAYLOAD_KIND;
  version: number;
  exportedAt: string;
  templates: SyncedCustomTemplate[];
}

export function serializeCustomTemplatesPayload(templates: SyncedCustomTemplate[]): string {
  const payload: CustomTemplatesPayload = {
    kind: CUSTOM_TEMPLATES_PAYLOAD_KIND,
    version: CUSTOM_TEMPLATES_PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    templates: [...templates].sort(compareCustomTemplates),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Lê o conteúdo do arquivo do Drive de forma tolerante: arquivo vazio, corrompido ou de outro
 * formato vira lista vazia, e entradas inválidas são descartadas.
 */
export function parseCustomTemplatesPayload(value: unknown): SyncedCustomTemplate[] {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = data.trim() ? JSON.parse(data) : null;
    } catch {
      return [];
    }
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { templates?: unknown }).templates)
      ? (data as { templates: unknown[] }).templates
      : [];

  const byId = new Map<string, SyncedCustomTemplate>();
  for (const raw of list) {
    const item = normalizeCustomTemplate(raw);
    if (!item) continue;
    const current = byId.get(item.id);
    byId.set(item.id, current ? pickNewerCustomTemplate(current, item) : item);
  }
  return [...byId.values()].sort(compareCustomTemplates);
}
