import { useState, useEffect, useCallback } from 'react';

export type AppRoute = 'app' | 'docs';

export interface ResolvedAppRoute {
  route: AppRoute;
  sectionId?: string;
}

const VALID_DOCS_PATH_PREFIX = /^\/docs(?:\/([^/]+))?\/?$/i;
const VALID_DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;

export function extractSharedDriveFileIdFromLocation(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const rawId = params.get('driveFileId')?.trim();
  if (!rawId || !VALID_DRIVE_FILE_ID_REGEX.test(rawId)) {
    return null;
  }
  return rawId;
}

export function buildProjectShareUrl(driveFileId: string, origin?: string): string {
  const baseOrigin =
    (origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://redija.app')).replace(
      /\/+$/,
      '',
    );
  return `${baseOrigin}/?driveFileId=${encodeURIComponent(driveFileId)}`;
}

export function clearSharedDriveFileFromLocation(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('driveFileId')) {
      url.searchParams.delete('driveFileId');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // Ignora falha em ambientes sem history/URL válido
  }
}

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

  return { route: 'app' };
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
    navigateTo,
  };
}
