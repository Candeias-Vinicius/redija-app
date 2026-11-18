import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export type ResizingPane = 'sidebar' | 'preview' | null;
export type PaneId = 'sidebar' | 'editor' | 'preview';

// Abaixo de 1280px os três painéis não cabem lado a lado com folga: usa abas.
const COMPACT_MQ = '(max-width: 1279px)';

/** Largura mínima da área do editor no layout desktop. */
export const MIN_EDITOR_WIDTH = 480;
/** Largura dos divisores redimensionáveis entre os painéis. */
const DIVIDER_WIDTH = 6;
/** Largura da barra que substitui um painel minimizado (w-10). */
const RAIL_WIDTH = 40;

export const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_RATIO = 0.22;

export const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 1000;
const DEFAULT_PREVIEW_RATIO = 0.36;

const SIDEBAR_RATIO_KEY = 'redija:sidebarRatio';
const PREVIEW_RATIO_KEY = 'redija:previewRatio';
const LEGACY_SIDEBAR_PX_KEY = 'redija:sidebarWidth';
const LEGACY_PREVIEW_PX_KEY = 'redija:previewWidth';
const DESKTOP_PANES_KEY = 'redija:desktopPanes';
const DARK_MODE_KEY = 'redija:darkMode';

type DesktopPaneState = {
  showSidebar: boolean;
  showEditor: boolean;
  showPreview: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function currentViewportWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1440;
}

/**
 * Lê a proporção salva do painel. As larguras são guardadas como fração da
 * janela (e não em px) para que os painéis acompanhem telas maiores ou menores.
 * Migra o formato antigo, que salvava px.
 */
function readSavedRatio(ratioKey: string, legacyPxKey: string, fallback: number): number {
  try {
    const ratio = Number(localStorage.getItem(ratioKey));
    if (ratio > 0.05 && ratio < 0.8) return ratio;
    const legacyPx = Number(localStorage.getItem(legacyPxKey));
    if (legacyPx > 0) return clamp(legacyPx / currentViewportWidth(), 0.1, 0.6);
  } catch {
    // localStorage indisponível
  }
  return fallback;
}

function persistRatio(key: string, ratio: number) {
  try {
    localStorage.setItem(key, ratio.toFixed(4));
  } catch {
    // ignore
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

function readIsCompact(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(COMPACT_MQ).matches;
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readSavedDarkMode(): boolean | null {
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Converte as proporções em px respeitando os limites de cada painel e a
 * largura mínima do editor, para que ele nunca fique espremido.
 */
function computePaneWidths(
  viewportWidth: number,
  sidebarRatio: number,
  previewRatio: number,
  panes: DesktopPaneState,
) {
  const editorReserve = panes.showEditor ? MIN_EDITOR_WIDTH : 0;
  // Painéis minimizados viram uma barra fina de restauração (RAIL_WIDTH cada)
  const rails =
    (panes.showSidebar ? 0 : RAIL_WIDTH) +
    (panes.showEditor ? 0 : RAIL_WIDTH) +
    (panes.showPreview ? 0 : RAIL_WIDTH);
  const dividers =
    rails +
    (panes.showSidebar && (panes.showEditor || panes.showPreview) ? DIVIDER_WIDTH : 0) +
    (panes.showPreview && panes.showEditor ? DIVIDER_WIDTH : 0);

  const sidebarMax = Math.max(
    MIN_SIDEBAR_WIDTH,
    Math.min(
      MAX_SIDEBAR_WIDTH,
      viewportWidth - dividers - editorReserve - (panes.showPreview ? MIN_PREVIEW_WIDTH : 0),
    ),
  );
  const sidebarWidth = Math.round(
    clamp(sidebarRatio * viewportWidth, MIN_SIDEBAR_WIDTH, sidebarMax),
  );

  const usedBySidebar = panes.showSidebar ? sidebarWidth : 0;
  const previewMax = Math.max(
    MIN_PREVIEW_WIDTH,
    Math.min(MAX_PREVIEW_WIDTH, viewportWidth - dividers - editorReserve - usedBySidebar),
  );
  const previewWidth = Math.round(
    clamp(previewRatio * viewportWidth, MIN_PREVIEW_WIDTH, previewMax),
  );

  return { sidebarWidth, previewWidth, sidebarMax, previewMax };
}

export function usePaneLayout() {
  const [isCompact, setIsCompact] = useState<boolean>(readIsCompact);
  const [viewportWidth, setViewportWidth] = useState<number>(currentViewportWidth);
  const [sidebarRatio, setSidebarRatio] = useState<number>(() =>
    readSavedRatio(SIDEBAR_RATIO_KEY, LEGACY_SIDEBAR_PX_KEY, DEFAULT_SIDEBAR_RATIO),
  );
  const [previewRatio, setPreviewRatio] = useState<number>(() =>
    readSavedRatio(PREVIEW_RATIO_KEY, LEGACY_PREVIEW_PX_KEY, DEFAULT_PREVIEW_RATIO),
  );
  const [resizingPane, setResizingPane] = useState<ResizingPane>(null);

  // Estado inicial calculado uma única vez (sem ler refs durante o render)
  const [initialPanes] = useState(() => {
    const desktop = readDesktopPanes();
    const visible: DesktopPaneState = readIsCompact()
      ? { showSidebar: false, showEditor: true, showPreview: false }
      : desktop;
    return { desktop, visible };
  });

  const desktopPanesRef = useRef<DesktopPaneState>(initialPanes.desktop);
  const wasCompactRef = useRef(isCompact);
  const panesRef = useRef<DesktopPaneState>(initialPanes.visible);

  const [showSidebar, setShowSidebar] = useState(initialPanes.visible.showSidebar);
  const [showEditor, setShowEditor] = useState(initialPanes.visible.showEditor);
  const [showPreview, setShowPreview] = useState(initialPanes.visible.showPreview);

  // Mantém um snapshot dos painéis visíveis para a transição desktop → compacto
  useEffect(() => {
    panesRef.current = { showSidebar, showEditor, showPreview };
  }, [showSidebar, showEditor, showPreview]);

  // Tema: preferência salva pelo usuário; sem preferência, segue o sistema.
  const [hasSavedTheme, setHasSavedTheme] = useState<boolean>(() => readSavedDarkMode() !== null);
  const [darkMode, setDarkMode] = useState<boolean>(() => readSavedDarkMode() ?? systemPrefersDark());

  const { sidebarWidth, previewWidth, sidebarMax, previewMax } = useMemo(
    () =>
      computePaneWidths(viewportWidth, sidebarRatio, previewRatio, {
        showSidebar,
        showEditor,
        showPreview,
      }),
    [viewportWidth, sidebarRatio, previewRatio, showSidebar, showEditor, showPreview],
  );

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

  /** Deixa só um painel visível (no compacto, equivale a selecionar a aba). */
  const focusPane = useCallback(
    (pane: PaneId) => {
      if (isCompact) {
        selectPane(pane);
        return;
      }
      applyDesktopPanes({
        showSidebar: pane === 'sidebar',
        showEditor: pane === 'editor',
        showPreview: pane === 'preview',
      });
    },
    [isCompact, selectPane, applyDesktopPanes],
  );

  /** Volta a exibir os três painéis. */
  const restoreAllPanes = useCallback(() => {
    applyDesktopPanes({ showSidebar: true, showEditor: true, showPreview: true });
  }, [applyDesktopPanes]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DARK_MODE_KEY, next ? '1' : '0');
      } catch {
        // Ignorar se localStorage estiver bloqueado
      }
      return next;
    });
    setHasSavedTheme(true);
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

  // Recalcula as larguras quando a janela muda (os painéis crescem e encolhem)
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Aplica o tema e acompanha o sistema enquanto o usuário não escolheu um tema
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (hasSavedTheme || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [hasSavedTheme]);

  const setPaneWidthPx = useCallback(
    (pane: 'sidebar' | 'preview', px: number) => {
      const vw = window.innerWidth;
      if (pane === 'sidebar') {
        const next = clamp(px, MIN_SIDEBAR_WIDTH, sidebarMax) / vw;
        setSidebarRatio(next);
        persistRatio(SIDEBAR_RATIO_KEY, next);
      } else {
        const next = clamp(px, MIN_PREVIEW_WIDTH, previewMax) / vw;
        setPreviewRatio(next);
        persistRatio(PREVIEW_RATIO_KEY, next);
      }
    },
    [sidebarMax, previewMax],
  );

  /** Redimensiona um painel pelo teclado (setas nos divisores). */
  const nudgePane = useCallback(
    (pane: 'sidebar' | 'preview', deltaPx: number) => {
      setPaneWidthPx(pane, (pane === 'sidebar' ? sidebarWidth : previewWidth) + deltaPx);
    },
    [setPaneWidthPx, sidebarWidth, previewWidth],
  );

  // Pointer-based resize (mouse + touch)
  useEffect(() => {
    if (!resizingPane) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (resizingPane === 'sidebar') {
        setPaneWidthPx('sidebar', e.clientX);
      } else if (resizingPane === 'preview') {
        setPaneWidthPx('preview', window.innerWidth - e.clientX);
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
  }, [resizingPane, setPaneWidthPx]);

  return {
    isCompact,
    sidebarWidth,
    previewWidth,
    sidebarMax,
    previewMax,
    resizingPane,
    setResizingPane,
    nudgePane,
    showSidebar,
    showEditor,
    showPreview,
    selectPane,
    toggleSidebar,
    toggleEditor,
    togglePreview,
    focusPane,
    restoreAllPanes,
    darkMode,
    setDarkMode,
    toggleDarkMode,
  };
}
