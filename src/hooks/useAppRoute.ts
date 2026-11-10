import { useState, useEffect, useCallback } from 'react';

export type AppRoute = 'app' | 'docs';

export interface ResolvedAppRoute {
  route: AppRoute;
  sectionId?: string;
  sharedDocId?: string;
}

const VALID_DOCS_PATH_PREFIX = /^\/docs(?:\/([^/]+))?\/?$/i;

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

  const sharedDocId = params.get('doc') || params.get('project') || params.get('join') || undefined;

  return { route: 'app', sharedDocId };
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
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  return {
    route: locationState.route,
    sectionId: locationState.sectionId,
    sharedDocId: locationState.sharedDocId,
    navigateTo,
  };
}
