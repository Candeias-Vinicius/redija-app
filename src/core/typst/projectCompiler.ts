import { DocumentProject } from '@/types/document';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import {
  buildVirtualUniversePackageFiles,
  getCachedPackage,
  parsePackageId,
  resolveProjectUniverseAssets,
  resolveUniversePackage,
  saveCachedPackage,
} from '@/core/universe/universeResolver';
import { generateTypstFiles, extractBinaryAssets } from '@/core/transpiler/typstGenerator';
import { compileToPdf, type PdfCompileOutput } from './typstClient';

export const PRESENTATION_SLIDES_UNIVERSE_PKG = '@preview/touying:0.5.3';

export class OfflineSlidesPackageRequiredError extends Error {
  constructor(packageId = PRESENTATION_SLIDES_UNIVERSE_PKG) {
    super(
      `Você está sem internet e o pacote de slides (${packageId}) ainda não foi baixado neste navegador. Conecte-se à internet pelo menos uma vez para baixar e armazenar o pacote em cache.`,
    );
    this.name = 'OfflineSlidesPackageRequiredError';
  }
}

/**
 * Garante que o pacote de slides está em cache no IndexedDB quando online,
 * ou valida sua presença em cache quando o navegador está offline (RDJ-09.6 Cenários 2 e 3).
 */
export async function ensurePresentationSlidesPackageReady(
  options: { isOffline?: boolean } = {},
): Promise<{
  extraFiles?: Record<string, string>;
  packageArchives?: Record<string, Uint8Array>;
}> {
  const isOffline =
    options.isOffline ?? (typeof navigator !== 'undefined' && navigator.onLine === false);

  const cached = await getCachedPackage(PRESENTATION_SLIDES_UNIVERSE_PKG);
  if (cached) {
    return {
      extraFiles: Object.keys(cached.files ?? {}).length > 0 ? cached.files : undefined,
      packageArchives: cached.tarGzBytes
        ? { [PRESENTATION_SLIDES_UNIVERSE_PKG]: cached.tarGzBytes }
        : undefined,
    };
  }

  if (isOffline) {
    throw new OfflineSlidesPackageRequiredError(PRESENTATION_SLIDES_UNIVERSE_PKG);
  }

  const resolved = await resolveUniversePackage(PRESENTATION_SLIDES_UNIVERSE_PKG);
  const afterResolveCached = await getCachedPackage(PRESENTATION_SLIDES_UNIVERSE_PKG);
  if (!afterResolveCached) {
    const parsed = parsePackageId(PRESENTATION_SLIDES_UNIVERSE_PKG);
    const virtualFiles =
      Object.keys(resolved.files).length > 0
        ? resolved.files
        : Object.fromEntries(
            Object.entries(buildVirtualUniversePackageFiles(parsed, resolved.entrypoint)).map(
              ([k, v]) => [`/${parsed.fullId}/${k.replace(/^\/+/, '')}`, v],
            ),
          );
    await saveCachedPackage({
      id: parsed.fullId,
      name: parsed.name,
      version: parsed.version,
      entrypoint: resolved.entrypoint,
      files: virtualFiles,
      tarGzBytes: resolved.tarGzBytes,
      downloadedAt: new Date().toISOString(),
    });
  }

  return {
    extraFiles: Object.keys(resolved.files).length > 0 ? resolved.files : undefined,
    packageArchives: resolved.tarGzBytes
      ? { [PRESENTATION_SLIDES_UNIVERSE_PKG]: resolved.tarGzBytes }
      : undefined,
  };
}

/**
 * Orquestra resolução de pacotes Typst Universe, geração de código-fonte,
 * extração de imagens binárias e compilação para PDF via Web Worker.
 */
export async function compileProjectToPdf(
  project: DocumentProject,
  options: { isOffline?: boolean; enforceSlidesPackageCache?: boolean } = {},
): Promise<PdfCompileOutput> {
  const caps = getTemplateCapabilities(project);
  let pkgAssets: {
    extraFiles?: Record<string, string>;
    packageArchives?: Record<string, Uint8Array>;
  } = {};

  if (caps.effectiveType === 'universe_custom') {
    const targetPkg = project.templateConfig?.universePackage || '@preview/charged-ieee:0.1.4';
    if (options.enforceSlidesPackageCache && targetPkg.startsWith('@preview/touying')) {
      pkgAssets = await ensurePresentationSlidesPackageReady({ isOffline: options.isOffline });
    } else {
      pkgAssets = await resolveProjectUniverseAssets(targetPkg);
    }
  } else if (caps.effectiveType === 'presentation' && options.enforceSlidesPackageCache) {
    pkgAssets = await ensurePresentationSlidesPackageReady({ isOffline: options.isOffline });
  }

  const files = generateTypstFiles(project, pkgAssets.extraFiles);
  const binaryFiles = extractBinaryAssets(project);

  return compileToPdf(
    files,
    binaryFiles,
    {
      fontFamily: project.templateConfig?.fontFamily ?? 'serif',
      customFontFamily: project.templateConfig?.customFontFamily,
    },
    pkgAssets.packageArchives,
  );
}

/**
 * Dispara o download de um Blob no navegador liberando a URL de objeto em seguida.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
