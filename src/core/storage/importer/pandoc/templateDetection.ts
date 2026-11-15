import { DocumentMetadata, ProjectTemplateType } from '@/types/document';
import { stripHtmlTags } from '../../../transpiler/escape';

/**
 * Detecta heuristicamente o modelo de um documento Word/Markdown a partir do texto.
 */
export function detectDocxTemplate(text: string): ProjectTemplateType {
  const normalized = stripHtmlTags(text.replace(/>/g, '> '))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (
    /\b(?:folha de aprovacao|folha de rosto|dedicatoria|epigrafe|lista de figuras|lista de ilustracoes|lista de tabelas|trabalho de conclusao de curso|monografia|dissertacao|banca examinadora)\b/.test(
      normalized,
    )
  ) {
    return 'tcc';
  }
  if (/\b(?:relatorio tecnico|relatorio de estagio|estagio supervisionado)\b/.test(normalized)) {
    return 'relatorio';
  }
  if (
    /\b(?:projeto de pesquisa|justificativa|objetivos especificos)\b/.test(normalized) &&
    !/\bresumo\b/.test(normalized)
  ) {
    return 'projeto_pesquisa';
  }
  return 'artigo';
}

/**
 * Detecta heuristicamente o modelo do projeto a partir do preâmbulo e comandos LaTeX.
 */
export function detectLatexTemplate(texContent: string): ProjectTemplateType {
  if (
    /\\documentclass(?:\[[^\]]*\])?\{(?:IEEEtran|ieeecolor)\}/i.test(texContent) ||
    /\\begin\{IEEEkeywords\}/i.test(texContent)
  ) {
    return 'ieee';
  }
  if (
    /\\documentclass(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent) ||
    /\\usepackage(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent)
  ) {
    return 'sbc';
  }
  if (/\\documentclass(?:\[[^\]]*\])?\{(?:tikzposter|baposter|a0poster|beamerposter)\}/i.test(texContent)) {
    return 'poster';
  }
  if (
    /\\documentclass(?:\[([^\]]*)\])?\{abntex2\}/i.test(texContent) ||
    /\\usepackage(?:\[[^\]]*\])?\{abntex2/i.test(texContent)
  ) {
    const optsMatch = texContent.match(/\\documentclass\[([^\]]*)\]\{abntex2\}/i);
    const tipoMatch = texContent.match(/\\tipotrabalho\{([^}]+)\}/i);
    const tipoStr = (tipoMatch?.[1] || optsMatch?.[1] || '').toLowerCase();
    if (tipoStr.includes('artigo') || tipoStr.includes('article')) return 'artigo';
    if (tipoStr.includes('relatorio') || tipoStr.includes('relatório')) return 'relatorio';
    if (tipoStr.includes('projeto')) return 'projeto_pesquisa';
    return 'tcc';
  }
  if (
    /\\(?:chapter|imprimircapa|imprimirfolhaderosto|begin\{dedicatoria\}|begin\{agradecimentos\})\b/i.test(
      texContent,
    ) ||
    /\\documentclass(?:\[[^\]]*\])?\{(?:book|report|memoir)\}/i.test(texContent)
  ) {
    return 'tcc';
  }
  return 'artigo';
}

/**
 * Detecta heuristicamente o modelo de projeto a partir de imports e show rules Typst.
 */
export function detectTypstTemplate(typContent: string): ProjectTemplateType {
  if (/^\s*#import\s+"@preview\//m.test(typContent)) return 'universe_custom';
  if (/sbc-article\.with|sbc\.typ/i.test(typContent)) return 'sbc';
  if (/ieee-article\.with|ieee\.typ/i.test(typContent)) return 'ieee';
  if (/academic-poster\.with|poster\.typ/i.test(typContent)) return 'poster';
  if (/abnt\.with|abnt\.typ/i.test(typContent)) {
    if (/incluir-capa:\s*false|colunas:\s*2/i.test(typContent)) return 'artigo';
    return 'tcc';
  }
  if (/^=\s+/m.test(typContent)) return 'artigo';
  return 'em_branco';
}

/** Pacote (`@preview/nome:versão`) e função de entrada (`#show: nome.with(`) de um modelo do Typst Universe. */
export function extractTypstUniverseInfo(typContent: string): { pkg?: string; entrypoint?: string } {
  return {
    pkg: typContent.match(/#import\s+"(@preview\/[^"]+)"/)?.[1],
    entrypoint: typContent.match(/#show:\s*([a-zA-Z0-9_-]+)\.with\(/)?.[1],
  };
}

/**
 * Extrai metadados dos parâmetros nomeados do `#show: modelo.with(...)` de um arquivo Typst
 * (titulo/title, autor/author/authors, instituicao, resumo/abstract, palavras-chave/keywords, …).
 */
export function extractTypstMetadata(typContent: string): Partial<DocumentMetadata> {
  const meta: Partial<DocumentMetadata> = {};

  const stringParam = (keys: string[]): string | undefined => {
    for (const k of keys) {
      const m = typContent.match(new RegExp(`\\b${k}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i'));
      if (m) return m[1].replace(/\\"/g, '"').trim();
    }
    return undefined;
  };
  const tupleItems = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.replace(/["']/g, '').trim())
      .filter(Boolean);

  const fields: [keyof DocumentMetadata, string[]][] = [
    ['title', ['titulo', 'title']],
    ['subtitle', ['subtitulo', 'subtitle']],
    ['author', ['autor', 'author']],
    ['institution', ['instituicao', 'institution']],
    ['course', ['curso', 'course', 'department']],
    ['location', ['local', 'location']],
    ['year', ['ano', 'year']],
    ['advisor', ['orientador', 'advisor']],
  ];
  for (const [field, keys] of fields) {
    const value = stringParam(keys);
    if (value) (meta as Record<string, string>)[field] = value;
  }

  if (!meta.author) {
    const authorsTuple = typContent.match(/\bauthors\s*:\s*\(([^)]+)\)/i);
    const authors = authorsTuple ? tupleItems(authorsTuple[1]) : [];
    if (authors.length > 0) meta.author = authors.join('; ');
  }

  const resumo = typContent.match(/\bresumo\s*:\s*\[([^\]]+)\]/i)?.[1].trim();
  const abstract = typContent.match(/\babstract\s*:\s*\[([^\]]+)\]/i)?.[1].trim();
  if (resumo) {
    meta.abstract = resumo;
    if (abstract) meta.foreignAbstract = abstract;
  } else if (abstract) {
    meta.abstract = abstract;
  }

  const ptKw = typContent.match(/\bpalavras-chave\s*:\s*\(([^)]+)\)/i)?.[1];
  const enKw = typContent.match(/\bkeywords\s*:\s*\(([^)]+)\)/i)?.[1];
  if (ptKw) {
    meta.keywords = tupleItems(ptKw);
    if (enKw) meta.foreignKeywords = tupleItems(enKw);
  } else if (enKw) {
    meta.keywords = tupleItems(enKw);
  }

  return meta;
}
