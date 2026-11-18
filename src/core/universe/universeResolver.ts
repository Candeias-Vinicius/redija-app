// =====================================================================
// RedijaApp — Conector do Typst Universe (Typst Package Resolver & Cache)
// Baixa pacotes reais de packages.typst.org com cache permanente no IndexedDB
// e fornece fallback virtual resiliente quando offline ou em presets curados.
// =====================================================================

import { db, CachedUniversePackage } from '@/core/storage/db';
import { extractTemplateThumbnail } from './packageThumbnail';
import {
  buildVirtualUniversePackageFiles,
  isValidTarGzBytes,
  knownUniverseEntrypoint,
  parsePackageId,
  POPULAR_UNIVERSE_TEMPLATES,
  type ParsedPackageId,
  type UniverseTemplateInfo,
} from './virtualPackage';

export {
  buildVirtualUniversePackageFiles,
  isValidTarGzBytes,
  knownUniverseEntrypoint,
  parsePackageId,
  POPULAR_UNIVERSE_TEMPLATES,
  type ParsedPackageId,
  type UniverseTemplateInfo,
};

export interface ResolvedUniversePackage {
  files: Record<string, string>;
  tarGzBytes?: Uint8Array;
  entrypoint: string;
}

function prefixVirtualFiles(
  fullId: string,
  relFiles: Record<string, string>,
): Record<string, string> {
  const prefixed: Record<string, string> = {};
  for (const [relPath, content] of Object.entries(relFiles)) {
    const cleanRel = relPath.replace(/^\/+/, '');
    prefixed[`/${fullId}/${cleanRel}`] = content;
  }
  return prefixed;
}

/**
 * Obtém os arquivos ou tarball de um pacote a partir do cache local do IndexedDB.
 */
export async function getCachedPackage(packageId: string): Promise<CachedUniversePackage | null> {
  const parsed = parsePackageId(packageId);
  try {
    const cached = await db.universePackages.get(parsed.fullId);
    return cached || null;
  } catch (err) {
    console.warn('Erro ao consultar cache de pacotes Typst Universe:', err);
    return null;
  }
}

/**
 * Salva um pacote baixado no cache permanente do IndexedDB.
 */
export async function saveCachedPackage(pkg: CachedUniversePackage): Promise<void> {
  try {
    await db.universePackages.put(pkg);
  } catch (err) {
    console.warn('Erro ao salvar pacote Typst Universe no cache IndexedDB:', err);
  }
}

/**
 * Resolve e carrega um pacote do Typst Universe:
 * 1. Consulta o cache local (IndexedDB) para tar.gz real ou pacote virtual válido.
 * 2. Se não estiver em cache válido, baixa o arquivo `.tar.gz` real de packages.typst.org.
 * 3. Em caso de HTTP 404 ou modo offline, sintetiza um pacote virtual Typst (`typst.toml` + `lib.typ`)
 *    compilável nativamente pelo `PackageRegistry` do compilador WASM.
 */
export async function resolveUniversePackage(
  packageId: string,
): Promise<ResolvedUniversePackage> {
  const parsed = parsePackageId(packageId);

  // 1. Recupera do cache local do IndexedDB se já contiver tarball real ou manifest virtual válido
  const cached = await getCachedPackage(parsed.fullId);
  if (cached) {
    if (cached.tarGzBytes && isValidTarGzBytes(cached.tarGzBytes)) {
      return {
        files: cached.files ?? {},
        tarGzBytes: cached.tarGzBytes,
        entrypoint: cached.entrypoint,
      };
    }
    const hasManifest = Boolean(cached.files?.[`/${parsed.fullId}/typst.toml`]);
    if (hasManifest && Object.keys(cached.files).length > 0) {
      return {
        files: cached.files,
        entrypoint: cached.entrypoint,
      };
    }
  }

  const entrypoint =
    knownUniverseEntrypoint(parsed.name) || parsed.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'article';

  // 2. Tenta baixar o pacote .tar.gz real da rede oficial do Typst Universe
  let isDefiniteNotFound = false;
  if (typeof fetch === 'function') {
    try {
      const tarballUrl = `https://packages.typst.org/${parsed.namespace}/${parsed.name}-${parsed.version}.tar.gz`;
      const response = await fetch(tarballUrl, { method: 'GET' });

      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (isValidTarGzBytes(bytes)) {
          await saveCachedPackage({
            id: parsed.fullId,
            name: parsed.name,
            version: parsed.version,
            entrypoint,
            files: {},
            tarGzBytes: bytes,
            downloadedAt: new Date().toISOString(),
          });
          return {
            files: {},
            tarGzBytes: bytes,
            entrypoint,
          };
        }
      } else if (response.status === 404) {
        isDefiniteNotFound = true;
      }
    } catch (err) {
      console.warn(
        `Tentativa de rede para o pacote ${parsed.fullId} falhou, usando fallback local:`,
        err,
      );
    }
  }

  // 3. Fallback virtual compatível com Typst PackageRegistry (`typst.toml` + `lib.typ`)
  const virtualFiles = prefixVirtualFiles(
    parsed.fullId,
    buildVirtualUniversePackageFiles(parsed, entrypoint),
  );

  // Só persiste fallback virtual para pacotes inexistentes no repositório (404),
  // permitindo nova tentativa de download quando offline voltar a ficar online.
  if (isDefiniteNotFound) {
    await saveCachedPackage({
      id: parsed.fullId,
      name: parsed.name,
      version: parsed.version,
      entrypoint,
      files: virtualFiles,
      downloadedAt: new Date().toISOString(),
    });
  }

  return { files: virtualFiles, entrypoint };
}

export interface PackageThumbnail {
  bytes: Uint8Array;
  mime: string;
}

const thumbnailRequests = new Map<string, Promise<PackageThumbnail | null>>();

async function loadPackageThumbnail(fullId: string): Promise<PackageThumbnail | null> {
  let cached = await getCachedPackage(fullId);
  if (cached && cached.thumbnail !== undefined) return cached.thumbnail;

  if (!cached?.tarGzBytes) {
    // Pacote virtual (não existe no Universe): não há capa para mostrar.
    if (cached) return null;
    // Ainda não baixado: baixa o pacote (fica em cache, pronto para compilar offline depois).
    await resolveUniversePackage(fullId);
    cached = await getCachedPackage(fullId);
    // Sem rede, nada é guardado e uma próxima abertura tenta de novo.
    if (!cached?.tarGzBytes) return null;
  }

  let thumbnail: PackageThumbnail | null = null;
  try {
    thumbnail = await extractTemplateThumbnail(cached.tarGzBytes);
  } catch (err) {
    console.warn(`Não foi possível ler a capa do pacote ${fullId}:`, err);
  }
  try {
    await db.universePackages.update(fullId, { thumbnail });
  } catch (err) {
    console.warn('Não foi possível guardar a capa do pacote no cache:', err);
  }
  return thumbnail;
}

/**
 * Capa real de um modelo do Typst Universe (`[template] thumbnail`), guardada junto do cache
 * do pacote. Baixa o pacote se ainda não estiver em cache. Retorna `null` quando não há capa
 * (pacote sem thumbnail, inexistente ou sem conexão).
 */
export function getUniversePackageThumbnail(packageId: string): Promise<PackageThumbnail | null> {
  const { fullId } = parsePackageId(packageId);
  const pending = thumbnailRequests.get(fullId);
  if (pending) return pending;
  const request = loadPackageThumbnail(fullId)
    .catch((err) => {
      console.warn(`Não foi possível obter a capa do pacote ${fullId}:`, err);
      return null;
    })
    .finally(() => thumbnailRequests.delete(fullId));
  thumbnailRequests.set(fullId, request);
  return request;
}

const SAFE_UNIVERSE_PKG_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+$/;

/**
 * Resolve ativos de pacote Typst Universe apenas quando um pacote está ativo.
 */
export async function resolveProjectUniverseAssets(packageId?: string): Promise<{
  extraFiles?: Record<string, string>;
  packageArchives?: Record<string, Uint8Array>;
}> {
  const trimmed = packageId?.trim();
  if (!trimmed) {
    return {};
  }
  const safePkgId = SAFE_UNIVERSE_PKG_REGEX.test(trimmed)
    ? trimmed
    : '@preview/charged-ieee:0.1.4';
  const parsed = parsePackageId(safePkgId);
  const resolved = await resolveUniversePackage(parsed.fullId);
  return {
    extraFiles: Object.keys(resolved.files).length > 0 ? resolved.files : undefined,
    packageArchives: resolved.tarGzBytes ? { [parsed.fullId]: resolved.tarGzBytes } : undefined,
  };
}
