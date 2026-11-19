import { abntlyAdapter } from './abntly';
import { chargedIeeeAdapter } from './chargedIeee';
import { touyingAdapter } from './touying';
import type { UniverseAdapter } from './types';

export type { UniverseAdapter, UniverseAdapterContext } from './types';

/** Modelos com adaptador próprio. Os demais usam o exemplo do modelo (`universeHeader.ts`). */
export const UNIVERSE_ADAPTERS: UniverseAdapter[] = [chargedIeeeAdapter, touyingAdapter, abntlyAdapter];

/** Adaptador do pacote (`@preview/nome:versão`), se houver. */
export function findUniverseAdapter(packageId: string): UniverseAdapter | undefined {
  const name = packageId.match(/^@[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+):/)?.[1];
  return name ? UNIVERSE_ADAPTERS.find((a) => a.packageName === name) : undefined;
}
