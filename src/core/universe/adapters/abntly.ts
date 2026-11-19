import { escapeMarkup, typstContent, typstString } from '@/core/transpiler/escape';
import type { UniverseAdapter } from './types';

/** Funções do abntly usadas aqui. O pacote exporta um `quadro` próprio, que não pode entrar. */
const ABNTLY_IMPORTS = ['abntly', 'config-info', 'cover', 'title-page', 'abstract', 'keywords'];

/**
 * `@preview/abntly` (ABNT NBR 14724). Os dados do trabalho vão em `info: config-info(...)`,
 * e capa, folha de rosto e resumo são chamadas próprias do pacote, ligadas pela aba
 * Estrutura do Customizer.
 */
export const abntlyAdapter: UniverseAdapter = {
  packageName: 'abntly',
  build: ({ project, cfg, packageId, fontRule, logoPath }) => {
    const m = project.metadata;
    const text = (value?: string): string => value?.trim() ?? '';

    const authors = text(m.author)
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean);
    // Um autor vai como texto, para o abntly separar o sobrenome na ficha catalográfica;
    // vários vão como conteúdo (um por linha), que o pacote imprime sem inverter.
    const authorExpr =
      authors.length > 1 ? `[${authors.map(escapeMarkup).join(' \\ ')}]` : typstString(authors[0] ?? 'Autor');

    const info: string[] = [`title: ${typstString(text(m.title))}`];
    if (text(m.subtitle)) info.push(`subtitle: ${typstString(text(m.subtitle))}`);
    info.push(`author: ${authorExpr}`);
    if (text(m.advisor)) info.push(`advisor: ${typstString(text(m.advisor))}`);
    if (text(m.coadvisor)) info.push(`co-advisor: ${typstString(text(m.coadvisor))}`);
    if (text(m.institution)) info.push(`institution: ${typstString(text(m.institution))}`);
    if (text(m.course)) info.push(`program: ${typstString(text(m.course))}`);
    if (text(m.location)) info.push(`location: ${typstString(text(m.location))}`);
    if (text(m.year)) info.push(`year: ${typstString(text(m.year))}`);
    if (logoPath) info.push(`logo: image(${typstString(logoPath)}, width: 2cm)`);

    const options = [`info: config-info(\n    ${info.join(',\n    ')},\n  )`];
    // O abntly traz textos fixos em português e inglês; outros idiomas ficam em "pt".
    if (cfg.documentLanguage === 'en') options.push('lang: "en"');

    const lines = [
      `#import "${packageId}": ${ABNTLY_IMPORTS.join(', ')}`,
      `#show: abntly.with(\n  ${options.join(',\n  ')},\n)`,
    ];
    const font = fontRule('serif');
    if (font) lines.push(font);

    if (cfg.includeCoverPage) lines.push('#cover()');
    if (cfg.includeTitlePage) lines.push(`#title-page${typstContent(text(m.nature))}`);

    const abstractPage = (body: string, keywords: string[] | undefined, lang?: string): string => {
      const kws = (keywords ?? []).map((k) => k.trim()).filter(Boolean);
      const kwLine = kws.length > 0 ? `\n  #keywords(${kws.map(typstContent).join(', ')})` : '';
      const langArg = lang ? `(lang: ${typstString(lang)})` : '';
      return `#abstract${langArg}[\n  ${escapeMarkup(body)}${kwLine}\n]`;
    };
    if (text(m.abstract)) lines.push(abstractPage(text(m.abstract), m.keywords));
    if (text(m.foreignAbstract)) lines.push(abstractPage(text(m.foreignAbstract), m.foreignKeywords, 'en'));

    if (cfg.includeToc) lines.push('#outline()');
    return lines.join('\n');
  },
};
