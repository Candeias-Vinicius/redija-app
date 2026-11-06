// =====================================================================
// RedijaApp — Tradução e formatação amigável de diagnósticos do Typst
// =====================================================================

export interface TypstDiagnostic {
  package: string;
  path: string;
  severity: string;
  range: string;
  message: string;
}

export interface FriendlyDiagnostic {
  severity: 'error' | 'warning';
  location: string;
  message: string;
  rawMessage: string;
}

const TRANSLATIONS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/unclosed delimiter/i, () => 'Delimitador não fechado no texto (ex.: colchete, parêntese ou aspas).'],
  [/unexpected end of file/i, () => 'Fim inesperado do arquivo durante a compilação.'],
  [/unknown variable:\s*(.+)/i, (m) => `Variável ou símbolo desconhecido no Typst: ${m[1]}.`],
  [/unknown font family:\s*(.+)/i, (m) => `Família de fonte não encontrada: ${m[1]}.`],
  [/file not found/i, () => 'Arquivo auxiliar ou imagem referenciada não foi encontrado.'],
  [/cannot divide by zero/i, () => 'Erro matemático: divisão por zero.'],
  [/expected\s+(.+),\s*found\s+(.+)/i, (m) => `Sintaxe inesperada: esperava ${m[1]}, mas encontrou ${m[2]}.`],
];

/**
 * Converte uma mensagem de diagnóstico do compilador Typst para uma
 * descrição amigável em português para exibição na interface.
 */
export function formatTypstDiagnostic(diag: TypstDiagnostic): FriendlyDiagnostic {
  const raw = diag.message || 'Erro desconhecido na compilação.';
  let translated = raw;

  for (const [pattern, formatter] of TRANSLATIONS) {
    const match = raw.match(pattern);
    if (match) {
      translated = formatter(match);
      break;
    }
  }

  const fileLabel = diag.path === '/abnt.typ' ? 'Modelo ABNT' : 'Documento';
  const location = diag.range ? `${fileLabel} (linha ${diag.range})` : fileLabel;

  return {
    severity: diag.severity === 'warning' ? 'warning' : 'error',
    location,
    message: translated,
    rawMessage: raw,
  };
}

/**
 * Filtra apenas os erros fatais de uma lista de diagnósticos do Typst.
 */
export function filterErrors(diagnostics: TypstDiagnostic[] = []): FriendlyDiagnostic[] {
  return diagnostics
    .filter((d) => d.severity === 'error')
    .map(formatTypstDiagnostic);
}
