// =====================================================================
// RedijaApp — Typst PackageRegistry + MemoryAccessModel para Web Worker
// Resolve pacotes `@preview/...` via arquivo tar.gz pré-carregado,
// download síncrono no Worker ou fallback virtual seguro no IndexedDB/offline.
// =====================================================================

import { MemoryAccessModel } from '@myriaddreamin/typst.ts/dist/esm/fs/memory.mjs';
import type {
  PackageRegistry,
  PackageResolveContext,
  PackageSpec,
} from '@myriaddreamin/typst.ts/dist/esm/internal.types.mjs';
import {
  buildVirtualUniversePackageFiles,
  isValidTarGzBytes,
  POPULAR_UNIVERSE_TEMPLATES,
} from '@/core/universe/virtualPackage';

export interface SplitTypstFilesResult {
  sourceFiles: Record<string, string>;
  packageFiles: Record<string, Record<string, string>>;
}

const PACKAGE_FILE_PATH_REGEX = /^\/?(@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+)\/(.+)$/;

/**
 * Separa arquivos regulares (`/main.typ`, `/abnt.typ`) de arquivos virtuais
 * de pacotes (`/@preview/nome:versao/arquivo.typ`), evitando poluir `addSource`.
 */
export function splitCompileFiles(files: Record<string, string>): SplitTypstFilesResult {
  const sourceFiles: Record<string, string> = {};
  const packageFiles: Record<string, Record<string, string>> = {};

  for (const [path, content] of Object.entries(files)) {
    const match = path.match(PACKAGE_FILE_PATH_REGEX);
    if (match) {
      const pkgId = match[1];
      const relPath = match[2].replace(/^\/+/, '');
      if (!packageFiles[pkgId]) {
        packageFiles[pkgId] = {};
      }
      packageFiles[pkgId][relPath] = content;
    } else {
      sourceFiles[path] = content;
    }
  }

  return { sourceFiles, packageFiles };
}

export class SafeMemoryAccessModel extends MemoryAccessModel {
  override isFile(path?: string): boolean {
    return Boolean(path && path.startsWith('/@memory/') && this.mData.has(path));
  }
}

/**
 * Cria o MemoryAccessModel usado pelo compilador WASM com `isFile` restrito
 * apenas aos arquivos realmente inseridos sob `/@memory/`.
 */
export function createTypstMemoryAccessModel(): SafeMemoryAccessModel {
  return new SafeMemoryAccessModel();
}

export class WorkerPackageRegistry implements PackageRegistry {
  private readonly am: MemoryAccessModel;
  private readonly archiveCache = new Map<string, string>();
  private readonly virtualCache = new Map<string, string>();
  private pendingArchives = new Map<string, Uint8Array>();
  private pendingVirtualFiles = new Map<string, Record<string, string>>();
  private readonly encoder = new TextEncoder();

  constructor(accessModel: MemoryAccessModel) {
    this.am = accessModel;
  }

  /**
   * Atualiza os tarballs e arquivos virtuais disponíveis para a compilação atual.
   * Pacotes reais já extraídos em `archiveCache` permanecem em memória entre compilações;
   * fallbacks virtuais são renováveis caso um pacote real chegue depois.
   */
  public setRequestPackages(
    packageArchives?: Record<string, Uint8Array>,
    packageFiles?: Record<string, Record<string, string>>,
  ): void {
    this.virtualCache.clear();
    this.pendingArchives = new Map(Object.entries(packageArchives ?? {}));
    this.pendingVirtualFiles = new Map(Object.entries(packageFiles ?? {}));
  }

  private getPackageDir(spec: PackageSpec): string {
    return `/@memory/fetch/packages/${spec.namespace}/${spec.name}/${spec.version}`;
  }

  private pullPackageDataSync(spec: PackageSpec): Uint8Array | undefined {
    if (typeof XMLHttpRequest === 'undefined') {
      return undefined;
    }
    const url = `https://packages.typst.org/${spec.namespace}/${spec.name}-${spec.version}.tar.gz`;
    try {
      const request = new XMLHttpRequest();
      request.overrideMimeType('text/plain; charset=x-user-defined');
      request.open('GET', url, false);
      request.send(null);
      if (request.status === 200 && typeof request.response === 'string') {
        const bytes = Uint8Array.from(request.response, (c) => c.charCodeAt(0) & 0xff);
        return isValidTarGzBytes(bytes) ? bytes : undefined;
      }
    } catch {
      // Falha de rede ou offline: segue para fallback virtual
    }
    return undefined;
  }

  private extractArchive(
    previewDir: string,
    archiveBytes: Uint8Array,
    context: PackageResolveContext,
  ): void {
    const entries: Array<[string, Uint8Array, Date]> = [];
    context.untar(archiveBytes, (filePath, fileData, mtime) => {
      const normalized = filePath.replace(/^\/+/, '');
      entries.push([`${previewDir}/${normalized}`, fileData, new Date(mtime)]);
    });
    for (const [fullPath, fileData, mtime] of entries) {
      this.am.insertFile(fullPath, fileData, mtime);
    }
  }

  private insertVirtualFiles(
    previewDir: string,
    spec: PackageSpec,
    files: Record<string, string>,
  ): void {
    const now = new Date();
    const hasManifest = Boolean(files['typst.toml']);
    if (!hasManifest) {
      const safeName = spec.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'custom-template';
      const safeVersion = spec.version.replace(/[^0-9.]/g, '') || '0.1.0';
      const toml = `[package]\nname = "${safeName}"\nversion = "${safeVersion}"\nentrypoint = "lib.typ"\n`;
      this.am.insertFile(`${previewDir}/typst.toml`, this.encoder.encode(toml), now);
    }
    for (const [relPath, content] of Object.entries(files)) {
      const normalized = relPath.replace(/^\/+/, '');
      this.am.insertFile(`${previewDir}/${normalized}`, this.encoder.encode(content), now);
    }
  }

  public resolve(spec: PackageSpec, context: PackageResolveContext): string | undefined {
    const pkgId = `@${spec.namespace}/${spec.name}:${spec.version}`;
    const previewDir = this.getPackageDir(spec);

    // 1. Pacote real já extraído em cache na memória do Worker
    const cachedRealDir = this.archiveCache.get(pkgId);
    if (cachedRealDir) {
      return cachedRealDir;
    }

    // 2. Archive .tar.gz pré-carregado (ex.: cache IndexedDB enviado pela UI)
    const preloadedArchive = this.pendingArchives.get(pkgId);
    if (preloadedArchive && isValidTarGzBytes(preloadedArchive)) {
      this.extractArchive(previewDir, preloadedArchive, context);
      this.archiveCache.set(pkgId, previewDir);
      return previewDir;
    }

    // 3. Reaproveitamento rápido de fallback virtual dentro da mesma compilação
    const cachedVirtualDir = this.virtualCache.get(pkgId);
    if (cachedVirtualDir) {
      return cachedVirtualDir;
    }

    // 4. Download síncrono para pacotes `@preview/...` (inclusive dependências transitivas)
    if (spec.namespace === 'preview') {
      const downloaded = this.pullPackageDataSync(spec);
      if (downloaded) {
        this.extractArchive(previewDir, downloaded, context);
        this.archiveCache.set(pkgId, previewDir);
        return previewDir;
      }
    }

    // 5. Pacote virtual pré-enviado no bundle (ex.: templates curados offline)
    const preloadedVirtual = this.pendingVirtualFiles.get(pkgId);
    if (preloadedVirtual && Object.keys(preloadedVirtual).length > 0) {
      this.insertVirtualFiles(previewDir, spec, preloadedVirtual);
      this.virtualCache.set(pkgId, previewDir);
      return previewDir;
    }

    // 6. Síntese resiliente offline para qualquer pacote `@preview/...`
    if (spec.namespace === 'preview') {
      const known = POPULAR_UNIVERSE_TEMPLATES.find((t) => t.name === spec.name);
      const fallbackEntry = known?.entrypoint || spec.name;
      const syntheticFiles = buildVirtualUniversePackageFiles(spec, fallbackEntry);
      this.insertVirtualFiles(previewDir, spec, syntheticFiles);
      this.virtualCache.set(pkgId, previewDir);
      return previewDir;
    }

    return undefined;
  }
}
