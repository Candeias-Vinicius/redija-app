import { typstContent, typstString } from '@/core/transpiler/escape';
import type { UniverseAdapter } from './types';

/** `@preview/charged-ieee`: artigo IEEE em duas colunas. */
export const chargedIeeeAdapter: UniverseAdapter = {
  packageName: 'charged-ieee',
  build: ({ project, cfg, packageId, fontRule }) => {
    const m = project.metadata;
    const authors = (m.author || 'Autor')
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean);
    const authorItems = (authors.length ? authors : ['Autor']).map((name) => {
      const fields = [`name: ${typstString(name)}`];
      if (m.institution?.trim()) fields.push(`organization: ${typstContent(m.institution.trim())}`);
      if (m.location?.trim()) fields.push(`location: ${typstContent(m.location.trim())}`);
      return `(${fields.join(', ')})`;
    });
    const authorsExpr = authorItems.length === 1 ? `(${authorItems[0]},)` : `(${authorItems.join(', ')})`;

    const args: string[] = [`title: ${typstString(m.title)}`, `authors: ${authorsExpr}`];
    if (m.abstract.trim()) args.push(`abstract: ${typstContent(m.abstract)}`);
    const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
    if (keywords.length > 0) args.push(`index-terms: (${keywords.map(typstString).join(', ')},)`);
    if (cfg.paperSize === 'a4') args.push('paper-size: "a4"');

    return [
      `#import "${packageId}": *`,
      `#show: ieee.with(\n  ${args.join(',\n  ')},\n)`,
      fontRule('serif', true),
    ]
      .filter(Boolean)
      .join('\n');
  },
};
