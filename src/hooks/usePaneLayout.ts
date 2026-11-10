import { useState, useEffect, useCallback, useRef } from 'react';

export type ResizingPane = 'sidebar' | 'preview' | null;
export type PaneId = 'sidebar' | 'editor' | 'preview';

const COMPACT_MQ = '(max-width: 1023px)';

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 520;

const DEFAULT_PREVIEW_WIDTH = 500;
const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 820;

const DESKTOP_PANES_KEY = 'redija:desktopPanes';

type DesktopPaneState = {
  showSidebar: boolean;
  showEditor: boolean;
  showPreview: boolean;
};

function readSavedWidth(key: string, min: number, max: number, fallback: number): number {
  try {
    const saved = Number(localStorage.getItem(key));
    return saved >= min && saved <= max ? saved : fallback;
  } catch {
    return fallback;
  }
}

function readDesktopPanes(): DesktopPaneState {
  try {
    const raw = localStorage.getItem(DESKTOP_PANES_KEY);
    if (!raw) return { showSidebar: true, showEditor: true, showPreview: true };
    const parsed = JSON.parse(raw) as Partial<DesktopPaneState>;
    const showSidebar = parsed.showSidebar !== false;
    const showEditor = parsed.showEditor !== false;
    const showPreview = parsed.showPreview !== false;
    // Garante pelo menos um painel visível
    if (!showSidebar && !showEditor && !showPreview) {
      return { showSidebar: true, showEditor: true, showPreview: true };
    }
    return { showSidebar, showEditor, showPreview };
  } catch {
    return { showSidebar: true, showEditor: true, showPreview: true };
  }
}

function persistDesktopPanes(state: DesktopPaneState) {
  try {
    localStorage.setItem(DESKTOP_PANES_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clampSidebarWidth(width: number, viewportWidth: number): number {
  const maxByViewport = Math.max(MIN_SIDEBAR_WIDTH, Math.floor(viewportWidth * 0.42));
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, maxByViewport, width));
}

function clampPreviewWidth(width: number, viewportWidth: number): number {
  const maxByViewport = Math.max(MIN_PREVIEW_WIDTH, Math.floor(viewportWidth * 0.45));
  return Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, maxByViewport, width));
}

function readIsCompact(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(COMPACT_MQ).matches;
}

export function usePaneLayout() {
  const [isCompact, setIsCompact] = useState<boolean>(readIsCompact);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = readSavedWidth(
      'redija:sidebarWidth',
      MIN_SIDEBAR_WIDTH,
      MAX_SIDEBAR_WIDTH,
      DEFAULT_SIDEBAR_WIDTH,
    );
    return typeof window !== 'undefined' ? clampSidebarWidth(saved, window.innerWidth) : saved;
  });
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    const saved = readSavedWidth(
      'redija:previewWidth',
      MIN_PREVIEW_WIDTH,
      MAX_PREVIEW_WIDTH,
      DEFAULT_PREVIEW_WIDTH,
    );
    return typeof window !== 'undefined' ? clampPreviewWidth(saved, window.innerWidth) : saved;
  });
  const [resizingPane, setResizingPane] = useState<ResizingPane>(null);

  const desktopPanesRef = useRef<DesktopPaneState>(readDesktopPanes());
  const wasCompactRef = useRef(isCompact);
  const panesRef = useRef({ showSidebar: true, showEditor: true, showPreview: true });

  const [showSidebar, setShowSidebar] = useState(() =>
    readIsCompact() ? false : desktopPanesRef.current.showSidebar,
  );
  const [showEditor, setShowEditor] = useState(() =>
    readIsCompact() ? true : desktopPanesRef.current.showEditor,
  );
  const [showPreview, setShowPreview] = useState(() =>
    readIsCompact() ? false : desktopPanesRef.current.showPreview,
  );

  panesRef.current = { showSidebar, showEditor, showPreview };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('redija:darkMode') === '1';
    } catch {
      return false;
    }
  });

  const persistWidths = useCallback((sidebar: number, preview: number) => {
    try {
      localStorage.setItem('redija:sidebarWidth', String(sidebar));
      localStorage.setItem('redija:previewWidth', String(preview));
    } catch {
      // ignore
    }
  }, []);

  const applyDesktopPanes = useCallback((state: DesktopPaneState) => {
    setShowSidebar(state.showSidebar);
    setShowEditor(state.showEditor);
    setShowPreview(state.showPreview);
    desktopPanesRef.current = state;
    persistDesktopPanes(state);
  }, []);

  const selectPane = useCallback((pane: PaneId) => {
    setShowSidebar(pane === 'sidebar');
    setShowEditor(pane === 'editor');
    setShowPreview(pane === 'preview');
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isCompact) {
      selectPane('sidebar');
      return;
    }
    setShowSidebar((prev) => {
      if (prev && !showEditor && !showPreview) return prev;
      const next = !prev;
      const state = { showSidebar: next, showEditor, showPreview };
      desktopPanesRef.current = state;
      persistDesktopPanes(state);
      return next;
    });
  }, [isCompact, selectPane, showEditor, showPreview]);

  const toggleEditor = useCallback(() => {
    if (isCompact) {
      selectPane('editor');
      return;
    }
    setShowEditor((prev) => {
      if (prev && !showSidebar && !showPreview) return prev;
      const next = !prev;
      const state = { showSidebar, showEditor: next, showPreview };
      desktopPanesRef.current = state;
      persistDesktopPanes(state);
      return next;
    });
  }, [isCompact, selectPane, showSidebar, showPreview]);

  const togglePreview = useCallback(() => {
    if (isCompact) {
      selectPane('preview');
      return;
    }
    setShowPreview((prev) => {
      if (prev && !showSidebar && !showEditor) return prev;
      const next = !prev;
      const state = { showSidebar, showEditor, showPreview: next };
      desktopPanesRef.current = state;
      persistDesktopPanes(state);
      return next;
    });
  }, [isCompact, selectPane, showSidebar, showEditor]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Compact / desktop mode transitions
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia(COMPACT_MQ);
    const apply = (compact: boolean) => {
      const wasCompact = wasCompactRef.current;
      setIsCompact(compact);
      wasCompactRef.current = compact;

      if (compact && !wasCompact) {
        const current = panesRef.current;
        const multi = [current.showSidebar, current.showEditor, current.showPreview].filter(Boolean)
          .length > 1;
        if (multi) {
          desktopPanesRef.current = current;
          persistDesktopPanes(current);
        }
        if (current.showEditor) selectPane('editor');
        else if (current.showPreview) selectPane('preview');
        else selectPane('sidebar');
      } else if (!compact && wasCompact) {
        applyDesktopPanes(desktopPanesRef.current);
      }
    };

    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    // Só aplica transição se o valor mudou em relação ao estado inicial já hidratado
    if (mql.matches !== wasCompactRef.current) {
      apply(mql.matches);
    }
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [applyDesktopPanes, selectPane]);

  // Clamp pane widths when viewport shrinks
  useEffect(() => {
    const clampToViewport = () => {
      const vw = window.innerWidth;
      setSidebarWidth((prev) => {
        const next = clampSidebarWidth(prev, vw);
        return next === prev ? prev : next;
      });
      setPreviewWidth((prev) => {
        const next = clampPreviewWidth(prev, vw);
        return next === prev ? prev : next;
      });
    };

    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('redija:darkMode', darkMode ? '1' : '0');
    } catch {
      // Ignorar se localStorage estiver bloqueado
    }
  }, [darkMode]);

  // Pointer-based resize (mouse + touch)
  useEffect(() => {
    if (!resizingPane) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (resizingPane === 'sidebar') {
        const nextWidth = clampSidebarWidth(e.clientX, window.innerWidth);
        setSidebarWidth(nextWidth);
        persistWidths(nextWidth, previewWidth);
      } else if (resizingPane === 'preview') {
        const nextWidth = clampPreviewWidth(window.innerWidth - e.clientX, window.innerWidth);
        setPreviewWidth(nextWidth);
        persistWidths(sidebarWidth, nextWidth);
      }
    };

    const handlePointerUp = () => {
      setResizingPane(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [resizingPane, persistWidths, previewWidth, sidebarWidth]);

  return {
    isCompact,
    sidebarWidth,
    previewWidth,
    resizingPane,
    setResizingPane,
    showSidebar,
    showEditor,
    showPreview,
    selectPane,
    toggleSidebar,
    toggleEditor,
    togglePreview,
    darkMode,
    setDarkMode,
    toggleDarkMode,
  };
}
