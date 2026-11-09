import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  AcademicReference,
  Block,
  DocumentMetadata,
  DocumentProject,
  ProjectTemplateType,
  SidebarConfig,
  TemplateConfig,
} from '@/types/document';

export interface HistorySnapshot {
  templateType?: ProjectTemplateType;
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  templateConfig?: TemplateConfig;
  sidebarConfig?: SidebarConfig;
}

const HISTORY_GROUP_INTERVAL_MS = 900;
const MAX_HISTORY_ENTRIES = 50;

export function toHistorySnapshot(proj: DocumentProject): HistorySnapshot {
  return {
    templateType: proj.templateType,
    metadata: proj.metadata,
    blocks: proj.blocks,
    references: proj.references,
    templateConfig: proj.templateConfig,
    sidebarConfig: proj.sidebarConfig,
  };
}

export function areSnapshotsSameReference(a: HistorySnapshot, b: HistorySnapshot): boolean {
  return (
    a.templateType === b.templateType &&
    a.metadata === b.metadata &&
    a.blocks === b.blocks &&
    a.references === b.references &&
    a.templateConfig === b.templateConfig &&
    a.sidebarConfig === b.sidebarConfig
  );
}

export function applyHistorySnapshot(
  proj: DocumentProject,
  snapshot: HistorySnapshot,
): DocumentProject {
  return {
    ...proj,
    templateType: snapshot.templateType ?? proj.templateType,
    metadata: snapshot.metadata,
    blocks: snapshot.blocks,
    references: snapshot.references,
    templateConfig: snapshot.templateConfig,
    sidebarConfig: snapshot.sidebarConfig,
  };
}

export function useUndoRedoHistory(
  setProject: React.Dispatch<React.SetStateAction<DocumentProject>>,
) {
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const lastHistoryPushTimeRef = useRef<number>(0);

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
    lastHistoryPushTimeRef.current = 0;
  }, []);

  const recordHistorySnapshot = useCallback(
    (currentProj: DocumentProject, forceNewEntry = false) => {
      const now = Date.now();
      const snapshot = toHistorySnapshot(currentProj);

      setPast((prev) => {
        const last = prev[prev.length - 1];
        if (last && areSnapshotsSameReference(last, snapshot)) {
          return prev;
        }
        // Agrupa digitações rápidas em intervalos de 900ms para que Ctrl+Z desfaça frases/ações inteiras
        if (!forceNewEntry && now - lastHistoryPushTimeRef.current < HISTORY_GROUP_INTERVAL_MS && prev.length > 0) {
          return prev;
        }
        lastHistoryPushTimeRef.current = now;
        return [...prev.slice(-(MAX_HISTORY_ENTRIES - 1)), snapshot];
      });
      setFuture([]);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, -1);

      setProject((currentProj) => {
        setFuture((prevFuture) => [
          toHistorySnapshot(currentProj),
          ...prevFuture.slice(0, MAX_HISTORY_ENTRIES - 1),
        ]);
        return applyHistorySnapshot(currentProj, previous);
      });

      return nextPast;
    });
  }, [setProject]);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);

      setProject((currentProj) => {
        setPast((prevPast) => [
          ...prevPast.slice(-(MAX_HISTORY_ENTRIES - 1)),
          toHistorySnapshot(currentProj),
        ]);
        return applyHistorySnapshot(currentProj, next);
      });

      return remainingFuture;
    });
  }, [setProject]);

  // Atalhos globais de teclado Ctrl+Z e Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        if (past.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (future.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [past.length, future.length, handleUndo, handleRedo]);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    recordHistorySnapshot,
    handleUndo,
    handleRedo,
    clearHistory,
  };
}
