import { useState, useEffect, useCallback } from 'react';
import { scrollBehavior } from '@/core/motion';

export type AppRoute = 'app' | 'docs';

export interface ResolvedAppRoute {
  route: AppRoute;
  sectionId?: string;
  /** Trabalho aberto no editor (`/?p=<id>`). Sem ele, o app mostra a Home. */
  projectId?: string;
}

const VALID_DOCS_PATH_PREFIX = /^\/docs(?:\/([^/]+))?\/?$/i;
const PROJECT_PARAM = 'p';

export function resolveRouteFromLocation(
  pathname: string,
  search: string,
  hash: string,
): ResolvedAppRoute {
  const cleanHash = hash.replace(/^#/, '').trim();
  const pathMatch = pathname.match(VALID_DOCS_PATH_PREFIX);

  if (pathMatch) {
    const subSection = pathMatch[1] ? decodeURIComponent(pathMatch[1]) : undefined;
    const sectionFromHash = cleanHash.startsWith('docs:') ? cleanHash.slice(5) : cleanHash || undefined;
    return {
      route: 'docs',
      sectionId: subSection || sectionFromHash,
    };
  }

  const params = new URLSearchParams(search);
  const viewParam = params.get('view');
  if (params.has('docs') || viewParam === 'docs') {
    return {
      route: 'docs',
      sectionId: params.get('section') || cleanHash || undefined,
    };
  }

  if (cleanHash === 'docs' || cleanHash.startsWith('docs:')) {
    return {
      route: 'docs',
      sectionId: cleanHash.startsWith('docs:') ? cleanHash.slice(5) : undefined,
    };
  }

  const projectId = params.get(PROJECT_PARAM)?.trim() || undefined;
  return projectId ? { route: 'app', projectId } : { route: 'app' };
}

function readCurrentLocation(): ResolvedAppRoute {
  if (typeof window === 'undefined') {
    return { route: 'app' };
  }
  return resolveRouteFromLocation(
    window.location.pathname,
    window.location.search,
    window.location.hash,
  );
}

export function useAppRoute() {
  const [locationState, setLocationState] = useState<ResolvedAppRoute>(readCurrentLocation);

  useEffect(() => {
    const handleRouteChange = () => {
      setLocationState(readCurrentLocation());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const navigateTo = useCallback((target: '/' | '/docs', sectionId?: string) => {
    const nextUrl = target === '/docs' && sectionId ? `/docs#${sectionId}` : target;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextUrl);
      setLocationState({
        route: target === '/docs' ? 'docs' : 'app',
        sectionId,
      });

      if (target === '/docs' && sectionId) {
        requestAnimationFrame(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      }
    }
  }, []);

  /** Abre um trabalho no editor (entra no histórico: o botão Voltar retorna à Home). */
  const openProjectRoute = useCallback((projectId: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    const url = `/?${PROJECT_PARAM}=${encodeURIComponent(projectId)}`;
    if (options?.replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
    setLocationState({ route: 'app', projectId });
  }, []);

  /** Volta para a Home (lista de trabalhos). */
  const goHomeRoute = useCallback((options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (options?.replace) window.history.replaceState({}, '', '/');
    else window.history.pushState({}, '', '/');
    setLocationState({ route: 'app' });
  }, []);

  return {
    route: locationState.route,
    sectionId: locationState.sectionId,
    projectId: locationState.projectId,
    navigateTo,
    openProjectRoute,
    goHomeRoute,
  };
}
