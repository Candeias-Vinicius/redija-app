// =====================================================================
// RedijaApp — Perfil de um modelo do Typst Universe
// Lê o `.tar.gz` do pacote e descobre como o modelo é usado: versão mínima do
// Typst, tipo (documento, apresentação, currículo...), a regra `#show` do
// exemplo que acompanha o modelo (`[template] entrypoint`) e a assinatura da
// função de entrada. O gerador usa o perfil para preencher o modelo com os
// dados do trabalho (veja `universeHeader.ts`).
// =====================================================================

import type {
  UniverseFrontCall,
  UniverseFrontField,
  UniverseTemplateKind,
  UniverseTemplateProfile,
} from '@/types/document';
import { gunzip, listTarFiles } from './packageThumbnail';
import {
  findAlias,
  findClose,
  findPackageImports,
  findShowRules,
  findSignature,
  splitArgs,
  valueShape,
  type TypstShowRule,
} from './typstSource';

/** Suba quando o analisador mudar: perfis guardados com versão menor são refeitos. */
export const UNIVERSE_PROFILE_VERSION = 1;

const decoder = new TextDecoder();

export interface UniversePackageManifest {
  name: string;
  version: string;
  entrypoint: string;
  compiler?: string;
  categories: string[];
  template?: { path: string; entrypoint: string; thumbnail?: string };
}

type TomlValue = string | string[] | number | boolean;

/**
 * Leitor mínimo de TOML para o `typst.toml`: seções `[nome]`, chaves com texto entre
 * aspas, números, booleanos e listas de textos (inclusive em várias linhas).
 */
export function parseSimpleToml(text: string): Record<string, Record<string, TomlValue>> {
  const out: Record<string, Record<string, TomlValue>> = {};
  let section = '';
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const sec = line.match(/^\[\s*([a-zA-Z0-9_.-]+)\s*\]/);
    if (sec) {
      section = sec[1];
      out[section] ??= {};
      continue;
    }
    const kv = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (!kv) continue;
    let raw = kv[2];
    if (raw.startsWith('[') && !balancedArray(raw)) {
      while (i + 1 < lines.length && !balancedArray(raw)) raw += `\n${lines[++i]}`;
    }
    out[section] ??= {};
    out[section][kv[1]] = parseTomlValue(raw);
  }
  return out;
}

function balancedArray(raw: string): boolean {
  const noStrings = raw.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""').replace(/#.*$/gm, '');
  return (noStrings.match(/\[/g)?.length ?? 0) <= (noStrings.match(/\]/g)?.length ?? 0);
}

function parseTomlValue(raw: string): TomlValue {
  const v = raw.trim();
  const str = v.match(/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/);
  if (str) return str[1] !== undefined ? str[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : str[2];
  if (v.startsWith('[')) {
    const items: string[] = [];
    const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'/g;
    let m: RegExpExecArray | null;
    const body = v.replace(/#.*$/gm, '');
    while ((m = re.exec(body))) items.push(m[1] ?? m[2]);
    return items;
  }
  if (v === 'true' || v === 'false') return v === 'true';
  const num = Number(v.replace(/#.*$/, '').trim());
  return Number.isFinite(num) ? num : v;
}

const asString = (v: TomlValue | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '');
}

export function parseUniverseManifest(toml: string): UniversePackageManifest | null {
  const data = parseSimpleToml(toml);
  const pkg = data.package;
  if (!pkg) return null;
  const tpl = data.template;
  const tplPath = asString(tpl?.path);
  const tplEntry = asString(tpl?.entrypoint);
  return {
    name: asString(pkg.name) ?? '',
    version: asString(pkg.version) ?? '',
    entrypoint: asString(pkg.entrypoint) ?? 'lib.typ',
    compiler: asString(pkg.compiler),
    categories: Array.isArray(pkg.categories) ? pkg.categories : [],
    template:
      tplPath !== undefined && tplEntry
        ? { path: normalizePath(tplPath), entrypoint: normalizePath(tplEntry), thumbnail: asString(tpl?.thumbnail) }
        : undefined,
  };
}

const ACADEMIC = ['paper', 'thesis', 'report', 'book'];

/** Tipo do modelo pelas categorias. Um modelo acadêmico continua documento mesmo com outras categorias. */
export function classifyUniverseKind(categories: string[], hasTemplate: boolean): UniverseTemplateKind {
  if (!hasTemplate) return 'library';
  if (categories.some((c) => ACADEMIC.includes(c))) return 'document';
  if (categories.includes('presentation')) return 'presentation';
  if (categories.includes('cv')) return 'cv';
  if (categories.includes('poster') || categories.includes('flyer')) return 'poster';
  return 'document';
}

/** Compara versões `x.y.z`: negativo se `a < b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface UniversePackageContents {
  manifest: UniversePackageManifest;
  /** Arquivos do pacote com caminhos relativos à raiz do pacote. */
  files: Map<string, Uint8Array>;
}

/** Abre o `.tar.gz` de um pacote e lê o `typst.toml` (aceita uma pasta única de topo). */
export async function readUniversePackage(tarGzBytes: Uint8Array): Promise<UniversePackageContents | null> {
  const all = listTarFiles(await gunzip(tarGzBytes));
  let base = '';
  if (!all.has('typst.toml')) {
    const nested = [...all.keys()].find((p) => /^[^/]+\/typst\.toml$/.test(p));
    if (!nested) return null;
    base = nested.slice(0, -'typst.toml'.length);
  }
  const files = new Map<string, Uint8Array>();
  for (const [path, data] of all) {
    if (base && !path.startsWith(base)) continue;
    files.set(path.slice(base.length), data);
  }
  const toml = files.get('typst.toml');
  const manifest = toml ? parseUniverseManifest(decoder.decode(toml)) : null;
  return manifest ? { manifest, files } : null;
}

const BUILTIN_SHOW = new Set([
  'smallcaps', 'upper', 'lower', 'strong', 'emph', 'align', 'block', 'box', 'columns', 'pad',
  'rotate', 'scale', 'center', 'text', 'par', 'it',
]);

/** Chamadas de capa/slide de título que valem repetir depois do `#show`. */
const TITLE_CALLS = new Set([
  'title-slide', 'title-page', 'titlepage', 'maketitle', 'make-title', 'make_title', 'cover',
  'cover-page', 'coverpage', 'capa', 'title',
]);

/** Chamadas com bloco de conteúdo que recebem um texto do trabalho. */
const FRONT_FIELDS: Record<string, UniverseFrontField> = {
  abstract: 'abstract',
  resumo: 'abstract',
  summary: 'abstract',
  resumen: 'abstract',
  zusammenfassung: 'abstract',
  riassunto: 'abstract',
  'abstract-page': 'abstract',
  'abstract-foreign': 'foreignAbstract',
  'foreign-abstract': 'foreignAbstract',
  'resumo-estrangeiro': 'foreignAbstract',
  'abstract-en': 'foreignAbstract',
  'abstract-english': 'foreignAbstract',
  dedication: 'dedication',
  dedicatoria: 'dedication',
  acknowledgments: 'acknowledgments',
  acknowledgements: 'acknowledgments',
  acknowledgement: 'acknowledgments',
  agradecimentos: 'acknowledgments',
  epigraph: 'epigraph',
  epigrafe: 'epigraph',
};

const MAX_REGION_CHARS = 40_000;

/** Remove linhas que são só comentário e excesso de linhas vazias. */
function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, (block) => (block.includes('"') ? block : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Escolhe a regra `#show` do exemplo que aplica o modelo (e não a de outro pacote). */
function pickMainRule(
  rules: TypstShowRule[],
  packageName: string,
  example: string,
  libFiles: Array<[string, string]>,
): { rule: TypstShowRule; original: string } | null {
  const imports = findPackageImports(example).filter((i) => i.spec.includes(`/${packageName}:`));
  const itemNames = new Map<string, string>();
  const modules = new Set<string>();
  let star = false;
  for (const imp of imports) {
    if (imp.items === '*') star = true;
    else if (Array.isArray(imp.items)) {
      for (const it of imp.items) {
        const m = it.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_-]*))?$/);
        if (m) itemNames.set(m[2] ?? m[1].split('.').pop()!, m[1]);
      }
    }
    if (imp.items === null || imp.alias) modules.add(imp.alias ?? packageName);
  }
  const fromPkg = (r: TypstShowRule): boolean => {
    const root = r.entry.split('.')[0];
    if (itemNames.has(root) || modules.has(root)) return true;
    if (!star || BUILTIN_SHOW.has(root)) return false;
    const local = r.entry.split('.').pop()!;
    return Boolean(findSignature(libFiles, local) || findAlias(libFiles, local));
  };
  const usable = rules.filter((r) => !BUILTIN_SHOW.has(r.entry.split('.')[0]));
  const rule =
    usable.find((r) => fromPkg(r) && r.args.length > 0) ??
    usable.find((r) => fromPkg(r)) ??
    usable.find((r) => r.args.length > 0) ??
    usable[0];
  if (!rule) return null;
  const root = rule.entry.split('.')[0];
  let original = rule.entry.split('.').pop()!;
  if (!rule.entry.includes('.') && itemNames.has(root)) original = itemNames.get(root)!.split('.').pop()!;
  return { rule, original };
}

/** Só argumentos simples (texto, número, sim/não) sobrevivem numa chamada com texto do trabalho. */
function keepSimpleArgs(args: string): string {
  const inner = args.slice(1, -1);
  const kept = splitArgs(inner).filter(
    (a) => a.kind === 'named' && ['str', 'num', 'bool', 'none', 'auto'].includes(valueShape(a.expr)),
  );
  return kept.length ? `(${kept.map((a) => (a.kind === 'named' ? `${a.name}: ${a.expr}` : '')).join(', ')})` : '';
}

/**
 * Chamadas entre a regra `#show` e o primeiro título do exemplo: capa ou slide de título
 * (sem conteúdo) e páginas como resumo e agradecimentos (com conteúdo, que é trocado).
 */
function findFrontCalls(example: string, ruleEnd: number): UniverseFrontCall[] {
  const after = example.slice(ruleEnd);
  const heading = after.search(/^[ \t]*=+[ \t]/m);
  const seg = heading >= 0 ? after.slice(0, heading) : after.slice(0, 6000);
  const calls: UniverseFrontCall[] = [];
  const re = /^[ \t]*#(\(?)([a-zA-Z_][a-zA-Z0-9_.-]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    const fullName = m[2];
    const name = fullName.split('.').pop()!;
    const field = FRONT_FIELDS[name];
    if (!field && !TITLE_CALLS.has(name)) continue;
    let j = m.index + m[0].length;
    if (m[1] === '(') {
      // #(modulo.make-title)()
      if (seg[j] !== ')') continue;
      j++;
    }
    const argGroups: string[] = [];
    let ok = true;
    while (seg[j] === '(') {
      const close = findClose(seg, j + 1, '(');
      if (close < 0) {
        ok = false;
        break;
      }
      argGroups.push(seg.slice(j, close + 1));
      j = close + 1;
    }
    if (!ok) continue;
    const hasContent = seg[j] === '[';
    if (field) {
      if (!hasContent || m[1] === '(') continue;
      const args = argGroups.length === 1 ? keepSimpleArgs(argGroups[0]) : '';
      calls.push({ call: `#${fullName}${args}`, field });
      const close = findClose(seg, j + 1, '[');
      if (close > 0) re.lastIndex = close + 1;
      continue;
    }
    // Capa com bloco de conteúdo traz texto de exemplo: fica de fora.
    if (hasContent) continue;
    const call = seg.slice(seg.indexOf('#', m.index), j).trim();
    if (call.length > 1 && call.length < 4000) calls.push({ call });
  }
  return calls.slice(0, 8);
}

/** Monta o perfil a partir dos arquivos do pacote. */
export function analyzeUniversePackage(
  contents: UniversePackageContents,
  packageId: string,
): UniverseTemplateProfile {
  const { manifest, files } = contents;
  const kind = classifyUniverseKind(manifest.categories, Boolean(manifest.template));
  const profile: UniverseTemplateProfile = {
    version: UNIVERSE_PROFILE_VERSION,
    packageId,
    kind,
    categories: manifest.categories,
    ...(manifest.compiler ? { compiler: manifest.compiler } : {}),
  };
  if (!manifest.template) return profile;

  const tplDir = manifest.template.path ? `${manifest.template.path}/` : '';
  const exampleBytes = files.get(`${tplDir}${manifest.template.entrypoint}`);
  if (!exampleBytes) return profile;
  const example = decoder.decode(exampleBytes);

  const libFiles: Array<[string, string]> = [];
  for (const [path, data] of files) {
    if (!path.endsWith('.typ') || (tplDir && path.startsWith(tplDir))) continue;
    libFiles.push([path, decoder.decode(data)]);
  }

  const picked = pickMainRule(findShowRules(example), manifest.name, example, libFiles);
  if (!picked) return profile;
  const { rule, original } = picked;

  let signature = findSignature(libFiles, original);
  if (!signature) {
    const alias = findAlias(libFiles, original);
    if (alias) signature = findSignature(libFiles, alias.split('.').pop()!);
  }

  const preamble = stripCommentLines(example.slice(0, rule.index));
  const ruleEnd = rule.index + rule.raw.length;
  if (preamble.length + rule.raw.length > MAX_REGION_CHARS) return profile;

  const frontCalls = findFrontCalls(example, ruleEnd);
  return {
    ...profile,
    entry: rule.entry,
    form: rule.form,
    ...(rule.bodyVar ? { bodyVar: rule.bodyVar } : {}),
    preamble,
    showRule: rule.raw,
    ...(frontCalls.length ? { frontCalls } : {}),
    ...(signature
      ? {
          signature: {
            named: signature.named.map((p) => p.name),
            positional: signature.positional,
            sink: signature.sink,
          },
        }
      : {}),
  };
}

/** Lê o pacote e monta o perfil. Retorna `null` se o arquivo não for um pacote Typst. */
export async function buildUniverseTemplateProfile(
  tarGzBytes: Uint8Array,
  packageId: string,
): Promise<{ profile: UniverseTemplateProfile; manifest: UniversePackageManifest } | null> {
  const contents = await readUniversePackage(tarGzBytes);
  if (!contents) return null;
  return { profile: analyzeUniversePackage(contents, packageId), manifest: contents.manifest };
}

/** Arquivos do projeto gerado pelo RedijaApp: os da pasta do modelo com esses nomes ficam de fora. */
const RESERVED_FILES = new Set(['main.typ', 'abnt.typ', 'sbc.typ', 'ieee.typ', 'poster.typ', 'refs.bib']);
const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 25 * 1024 * 1024;

export interface UniverseTemplateFiles {
  /** Arquivos `.typ` da pasta do modelo (ex.: `config.typ` importado pelo exemplo). */
  textFiles: Record<string, string>;
  /** Imagens e demais arquivos (ex.: o logo da universidade usado na capa). */
  binaryFiles: Record<string, Uint8Array>;
}

/**
 * Arquivos da pasta `[template] path` que o exemplo referencia com caminho relativo
 * (logos, `config.typ`). Ficam na raiz do projeto, como no `typst init`. Ficam de fora o
 * próprio exemplo e arquivos com nomes do RedijaApp
 * (as imagens do trabalho, em `/assets/`, têm prioridade sobre arquivos de mesmo nome).
 */
export function collectTemplateFiles(contents: UniversePackageContents): UniverseTemplateFiles {
  const out: UniverseTemplateFiles = { textFiles: {}, binaryFiles: {} };
  const tpl = contents.manifest.template;
  if (!tpl) return out;
  const dir = tpl.path ? `${tpl.path}/` : '';
  let total = 0;
  for (const [path, data] of contents.files) {
    if (dir && !path.startsWith(dir)) continue;
    const rel = path.slice(dir.length);
    if (!rel || rel === tpl.entrypoint || rel.split('/').includes('..')) continue;
    if (RESERVED_FILES.has(rel)) continue;
    if (data.length > MAX_ASSET_BYTES || total + data.length > MAX_TOTAL_ASSET_BYTES) continue;
    total += data.length;
    if (rel.endsWith('.typ')) out.textFiles[rel] = decoder.decode(data);
    else out.binaryFiles[`/${rel}`] = data.slice();
  }
  return out;
}
