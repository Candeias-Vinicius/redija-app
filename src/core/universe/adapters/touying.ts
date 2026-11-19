import type { UniverseAdapter } from './types';

/** `@preview/touying` (o framework de slides, sem tema próprio): tema simples em 16:9. */
export const touyingAdapter: UniverseAdapter = {
  packageName: 'touying',
  build: ({ packageId, fontRule }) =>
    [
      `#import "${packageId}": *`,
      '#import themes.simple: *',
      '#show: simple-theme.with(aspect-ratio: "16-9")',
      fontRule('sans'),
    ]
      .filter(Boolean)
      .join('\n'),
};
