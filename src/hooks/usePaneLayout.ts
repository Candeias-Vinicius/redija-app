import { useState, useEffect, useCallback } from 'react';

export type ResizingPane = 'sidebar' | 'preview' | null;

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 520;

const DEFAULT_PREVIEW_WIDTH = 500;
const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 820;

function readSavedWidth(key: string, min: number, max: number, fallback: number): number {
  try {
    const saved = Number(localStorage.getItem(key));
    return saved >= min && saved <= max ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function usePaneLayout() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() =>
    readSavedWidth('redija:sidebarWidth', MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH),
  );
  const [previewWidth, setPreviewWidth] = useState<number>(() =>
    readSavedWidth('redija:previewWidth', MIN_PREVIEW_WIDTH, MAX_PREVIEW_WIDTH, DEFAULT_PREVIEW_WIDTH),
  );
  const [resizingPane, setResizingPane] = useState<ResizingPane>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('redija:darkMode') === '1';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    // Impede que as 3 abas fiquem ocultas ao mesmo tempo
    setShowSidebar((prev) => {
      if (prev && !showEditor && !showPreview) return prev;
      return !prev;
    });
  }, [showEditor, showPreview]);

  const toggleEditor = useCallback(() => {
    setShowEditor((prev) => {
      if (prev && !showSidebar && !showPreview) return prev;
      return !prev;
    });
  }, [showSidebar, showPreview]);

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => {
      if (prev && !showSidebar && !showEditor) return prev;
      return !prev;
    });
  }, [showSidebar, showEditor]);

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

  useEffect(() => {
    if (!resizingPane) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingPane === 'sidebar') {
        const nextWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
        setSidebarWidth(nextWidth);
        try {
          localStorage.setItem('redija:sidebarWidth', String(nextWidth));
        } catch {
          // ignore
        }
      } else if (resizingPane === 'preview') {
        const nextWidth = Math.max(
          MIN_PREVIEW_WIDTH,
          Math.min(MAX_PREVIEW_WIDTH, window.innerWidth - e.clientX),
        );
        setPreviewWidth(nextWidth);
        try {
          localStorage.setItem('redija:previewWidth', String(nextWidth));
        } catch {
          // ignore
        }
      }
    };

    const handleMouseUp = () => {
      setResizingPane(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingPane]);

  return {
    sidebarWidth,
    previewWidth,
    resizingPane,
    setResizingPane,
    showSidebar,
    showEditor,
    showPreview,
    toggleSidebar,
    toggleEditor,
    togglePreview,
    darkMode,
    setDarkMode,
    toggleDarkMode,
  };
}
