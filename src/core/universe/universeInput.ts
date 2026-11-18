import { POPULAR_UNIVERSE_TEMPLATES } from './virtualPackage';

export type UniverseInputResult =
  | { ok: true; packageId: string; namespace: string; name: string; version: string }
  | { ok: false; reason: 'empty' | 'missing-version' | 'invalid'; name?: string };

const FULL_SPEC = /@?([a-z0-9][a-z0-9_-]*)\/([a-z0-9][a-z0-9_-]*):(\d+\.\d+\.\d+)/i;
const SHORT_SPEC = /^@?([a-z0-9][a-z0-9_-]*):(\d+\.\d+\.\d+)$/i;
const UNIVERSE_URL = /typst\.app\/universe\/package\/([a-z0-9][a-z0-9_-]*)/i;

/**
 * Entende o que o usuário colou do Typst Universe:
 * - a linha de importação: `#import "@preview/charged-ieee:0.1.4": ieee`
 * - o comando: `typst init @preview/charged-ieee:0.1.4`
 * - só o pacote: `@preview/charged-ieee:0.1.4` ou `charged-ieee:0.1.4`
 * Um link da página do pacote não traz a versão, então pede a linha de importação.
 */
export function parseUniverseInput(raw: string): UniverseInputResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };

  const full = text.match(FULL_SPEC);
  if (full) {
    const [, namespace, name, version] = full;
    const ns = namespace.toLowerCase();
    const pkg = name.toLowerCase();
    return { ok: true, namespace: ns, name: pkg, version, packageId: `@${ns}/${pkg}:${version}` };
  }

  const short = text.match(SHORT_SPEC);
  if (short) {
    const pkg = short[1].toLowerCase();
    return { ok: true, namespace: 'preview', name: pkg, version: short[2], packageId: `@preview/${pkg}:${short[2]}` };
  }

  const url = text.match(UNIVERSE_URL);
  if (url) return { ok: false, reason: 'missing-version', name: url[1].toLowerCase() };

  return { ok: false, reason: 'invalid' };
}

const ACRONYMS = new Set(['ieee', 'sbc', 'abnt', 'apa', 'acm', 'tcc', 'ufrj', 'usp', 'mla', 'pdf']);

/** Sugere um nome legível para o modelo: título conhecido ou o nome do pacote formatado. */
export function suggestTemplateName(packageName: string): string {
  const known = POPULAR_UNIVERSE_TEMPLATES.find((t) => t.name === packageName);
  if (known) return known.title;
  return packageName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) =>
      ACRONYMS.has(part.toLowerCase()) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}

export type PackageCheck = 'found' | 'not-found' | 'unknown';

/** Confere no repositório oficial se o pacote existe (sem baixar o conteúdo). */
export async function checkUniversePackageExists(
  namespace: string,
  name: string,
  version: string,
): Promise<PackageCheck> {
  if (typeof fetch !== 'function') return 'unknown';
  try {
    const response = await fetch(`https://packages.typst.org/${namespace}/${name}-${version}.tar.gz`, {
      method: 'HEAD',
    });
    if (response.ok) return 'found';
    if (response.status === 404) return 'not-found';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
