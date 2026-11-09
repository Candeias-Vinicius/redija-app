import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AcademicReference,
  Block,
  DocumentMetadata,
  DocumentProject,
  ProjectTemplateType,
  SidebarConfig,
  TemplateConfig,
} from '@/types/document';
import { type TemplateCustomizerApplyPayload } from '@/components/TemplateCustomizerModal';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/universeResolver';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { importDocumentFile } from '@/core/storage/documentImporter';
import { triggerBlobDownload } from '@/core/typst/projectCompiler';
import {
  loadInitialActiveProject,
  saveProject,
  listProjects,
  listTrashedProjects,
  duplicateProject,
  moveProjectToTrash,
  restoreProjectFromTrash,
  deleteProject,
  setActiveProjectId,
  serializeBackup,
} from '@/core/storage/db';

export const FALLBACK_INITIAL_PROJECT = createProjectFromTemplate('tcc');

const DEFAULT_PROJECT_NAME_BY_TEMPLATE: Record<ProjectTemplateType, string> = {
  tcc: 'Trabalho de Conclusão de Curso',
  artigo: 'Novo Artigo Científico',
  sbc: 'Novo Artigo SBC',
  ieee: 'Novo Artigo IEEE',
  poster: 'Novo Pôster Científico A0',
  universe_custom: 'Novo Projeto Typst Universe',
  relatorio: 'Novo Relatório Técnico',
  projeto_pesquisa: 'Novo Projeto de Pesquisa',
  em_branco: 'Novo Documento',
};

const COMPACT_ARTICLE_OR_POSTER_TYPES = new Set<ProjectTemplateType | undefined>([
  'sbc',
  'ieee',
  'poster',
  'universe_custom',
]);

export function resolveTemplateTypeOnCustomizerApply(
  prevTemplateType: ProjectTemplateType | undefined,
  templateConfig: TemplateConfig,
  selectedTemplateType?: ProjectTemplateType,
): ProjectTemplateType | undefined {
  const preset = templateConfig.preset;
  if (preset === 'sbc' || preset === 'ieee' || preset === 'poster' || preset === 'universe_custom') {
    return preset;
  }
  if (
    (preset === 'abnt_classic' || preset === 'abnt_2023' || preset === 'apa_7') &&
    COMPACT_ARTICLE_OR_POSTER_TYPES.has(prevTemplateType)
  ) {
    return 'tcc';
  }
  if (preset === 'article_2col' && COMPACT_ARTICLE_OR_POSTER_TYPES.has(prevTemplateType)) {
    return 'artigo';
  }
  return selectedTemplateType ?? prevTemplateType;
}

export function generateDefaultProjectName(
  templateType: ProjectTemplateType,
  existingProjects: Pick<DocumentProject, 'name'>[],
): string {
  const defaultBase = DEFAULT_PROJECT_NAME_BY_TEMPLATE[templateType] ?? 'Novo Documento';
  let candidate = defaultBase;
  let counter = 2;
  while (existingProjects.some((p) => p.name.trim().toLowerCase() === candidate.toLowerCase())) {
    candidate = `${defaultBase} (${counter})`;
    counter++;
  }
  return candidate;
}

export function generateUniqueCopyName(
  originalName: string,
  existingProjects: Pick<DocumentProject, 'name'>[],
): string {
  let uniqueName = `${originalName} (Cópia)`;
  let counter = 2;
  while (existingProjects.some((p) => p.name.trim().toLowerCase() === uniqueName.toLowerCase())) {
    uniqueName = `${originalName} (Cópia ${counter})`;
    counter++;
  }
  return uniqueName;
}

export type BlocksChangeClassification =
  | { kind: 'none' }
  | { kind: 'structural' }
  | { kind: 'content'; modifiedBlock: Block | null };

export function classifyBlocksChange(
  prevBlocks: Block[],
  nextBlocks: Block[],
): BlocksChangeClassification {
  if (prevBlocks === nextBlocks) {
    return { kind: 'none' };
  }

  const isLengthDifferent = prevBlocks.length !== nextBlocks.length;
  let hasOrderChanged = false;
  let modifiedBlock: Block | null = null;
  let isIdentical = !isLengthDifferent;

  if (!isLengthDifferent) {
    for (let i = 0; i < nextBlocks.length; i++) {
      const pb = prevBlocks[i];
      const nb = nextBlocks[i];
      if (pb.id !== nb.id) {
        hasOrderChanged = true;
        isIdentical = false;
        break;
      }
      if (
        pb.type !== nb.type ||
        pb.content !== nb.content ||
        JSON.stringify(pb.meta) !== JSON.stringify(nb.meta)
      ) {
        isIdentical = false;
        modifiedBlock = nb;
      }
    }
  }

  if (isIdentical) {
    return { kind: 'none' };
  }

  if (isLengthDifferent || hasOrderChanged) {
    return { kind: 'structural' };
  }

  return { kind: 'content', modifiedBlock };
}

interface UseProjectWorkspaceOptions {
  project: DocumentProject;
  setProject: React.Dispatch<React.SetStateAction<DocumentProject>>;
  activeOwner: string;
  isSessionActive: boolean;
  recordHistorySnapshot: (currentProj: DocumentProject, forceNewEntry?: boolean) => void;
  clearHistory: () => void;
  onBroadcastBlocksSync?: (blocks: Block[]) => void;
  onBroadcastBlockUpdate?: (blockId: string, content: string, meta?: Block['meta']) => void;
  onEmptyWorkspace: () => void;
  onProjectImported: () => void;
  onReferenceUpdated: () => void;
}

export function useProjectWorkspace({
  project,
  setProject,
  activeOwner,
  isSessionActive,
  recordHistorySnapshot,
  clearHistory,
  onBroadcastBlocksSync,
  onBroadcastBlockUpdate,
  onEmptyWorkspace,
  onProjectImported,
  onReferenceUpdated,
}: UseProjectWorkspaceOptions) {
  const [projects, setProjects] = useState<DocumentProject[]>([FALLBACK_INITIAL_PROJECT]);
  const [trashedProjects, setTrashedProjects] = useState<DocumentProject[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const skipNextAutoSaveRef = useRef(true);

  const resetWorkspaceState = useCallback(() => {
    skipNextAutoSaveRef.current = true;
    setProjects([]);
    setTrashedProjects([]);
    setIsStorageReady(false);
    setProject(FALLBACK_INITIAL_PROJECT);
  }, [setProject]);

  // Carrega os projetos do IndexedDB isolados pelo perfil atual (Google ou Perfil Local)
  useEffect(() => {
    if (!isSessionActive) {
      return;
    }

    let mounted = true;
    skipNextAutoSaveRef.current = true;

    loadInitialActiveProject(activeOwner)
      .then(({ activeProject, allProjects, trashedProjects: initialTrash }) => {
        if (!mounted) return;
        skipNextAutoSaveRef.current = true;
        setProject(activeProject ?? FALLBACK_INITIAL_PROJECT);
        setProjects(allProjects);
        setTrashedProjects(initialTrash);
        setIsStorageReady(true);
        if (allProjects.length === 0) {
          onEmptyWorkspace();
        }
      })
      .catch((err) => {
        console.error('Erro ao inicializar IndexedDB para sessão:', err);
        if (mounted) setIsStorageReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [activeOwner, isSessionActive, setProject, onEmptyWorkspace]);

  // Auto-save com debounce sempre que o projeto ativo sofrer alterações
  useEffect(() => {
    if (!isStorageReady || projects.length === 0) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const toSave: DocumentProject = {
          ...project,
          ownerEmail: project.ownerEmail || activeOwner,
        };
        const saved = await saveProject(toSave);
        const all = await listProjects(activeOwner);
        setProjects(all);
        setSaveStatus('saved');
        // Mantém updatedAt sincronizado sem disparar novo ciclo de auto-save
        if (saved.updatedAt !== project.updatedAt) {
          skipNextAutoSaveRef.current = true;
          setProject((prev) => ({
            ...prev,
            updatedAt: saved.updatedAt,
            ownerEmail: saved.ownerEmail,
          }));
        }
      } catch (err) {
        console.error('Erro ao salvar no IndexedDB:', err);
        setSaveStatus('saved');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [project, isStorageReady, projects.length, activeOwner, setProject]);

  const handleMetadataChange = useCallback(
    (metadata: DocumentMetadata) => {
      setProject((prev) => {
        if (JSON.stringify(prev.metadata) === JSON.stringify(metadata)) {
          return prev;
        }
        recordHistorySnapshot(prev);
        return { ...prev, metadata };
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleChangeSidebarConfig = useCallback(
    (sidebarConfig?: SidebarConfig) => {
      setProject((prev) => {
        if (JSON.stringify(prev.sidebarConfig) === JSON.stringify(sidebarConfig)) {
          return prev;
        }
        recordHistorySnapshot(prev, true);
        const next = { ...prev };
        if (sidebarConfig) {
          next.sidebarConfig = sidebarConfig;
        } else {
          delete next.sidebarConfig;
        }
        return next;
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleApplyTemplateCustomizer = useCallback(
    ({ config: templateConfig, metadata: nextMetadata, selectedTemplateType }: TemplateCustomizerApplyPayload) => {
      setProject((prev) => {
        const configChanged = JSON.stringify(prev.templateConfig) !== JSON.stringify(templateConfig);
        const metadataChanged = JSON.stringify(prev.metadata) !== JSON.stringify(nextMetadata);
        const nextTemplateType = resolveTemplateTypeOnCustomizerApply(
          prev.templateType,
          templateConfig,
          selectedTemplateType,
        );
        const typeChanged = prev.templateType !== nextTemplateType;

        if (!configChanged && !metadataChanged && !typeChanged) {
          return prev;
        }

        recordHistorySnapshot(prev, true);
        return {
          ...prev,
          templateType: nextTemplateType,
          templateConfig,
          metadata: nextMetadata,
        };
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      setProject((prev) => {
        const classification = classifyBlocksChange(prev.blocks, blocks);
        if (classification.kind === 'none') {
          return prev;
        }

        const now = Date.now();
        if (classification.kind === 'structural') {
          const updatedBlocks = blocks.map((b) => (b.updatedAt ? b : { ...b, updatedAt: now }));
          recordHistorySnapshot(prev, true);
          onBroadcastBlocksSync?.(updatedBlocks);
          return { ...prev, blocks: updatedBlocks };
        }

        const modifiedBlock = classification.modifiedBlock;
        const updatedBlocks = blocks.map((b) =>
          b.id === modifiedBlock?.id ? { ...b, updatedAt: now } : b,
        );
        recordHistorySnapshot(prev, false);
        if (modifiedBlock) {
          onBroadcastBlockUpdate?.(
            modifiedBlock.id,
            modifiedBlock.content,
            modifiedBlock.meta,
          );
        }
        return { ...prev, blocks: updatedBlocks };
      });
    },
    [setProject, recordHistorySnapshot, onBroadcastBlocksSync, onBroadcastBlockUpdate],
  );

  const handleAddReference = useCallback(
    (ref: AcademicReference) => {
      setProject((prev) => {
        recordHistorySnapshot(prev, true);
        return {
          ...prev,
          references: [...prev.references, ref],
        };
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleUpdateReference = useCallback(
    (updatedRef: AcademicReference) => {
      setProject((prev) => {
        recordHistorySnapshot(prev, true);
        return {
          ...prev,
          references: prev.references.map((r) => (r.id === updatedRef.id ? updatedRef : r)),
        };
      });
      onReferenceUpdated();
    },
    [setProject, recordHistorySnapshot, onReferenceUpdated],
  );

  const handleAddMultipleReferences = useCallback(
    (refs: AcademicReference[]) => {
      setProject((prev) => {
        recordHistorySnapshot(prev, true);
        return {
          ...prev,
          references: [...prev.references, ...refs],
        };
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleRemoveReference = useCallback(
    (id: string) => {
      setProject((prev) => {
        recordHistorySnapshot(prev, true);
        return {
          ...prev,
          references: prev.references.filter((r) => r.id !== id),
        };
      });
    },
    [setProject, recordHistorySnapshot],
  );

  const handleSelectProject = useCallback(
    (selected: DocumentProject) => {
      skipNextAutoSaveRef.current = true;
      clearHistory();
      setProject(selected);
      setActiveProjectId(selected.id, activeOwner);
    },
    [clearHistory, setProject, activeOwner],
  );

  const handleCreateProject = useCallback(
    async (templateType: ProjectTemplateType, customName?: string, universePackage?: string) => {
      let finalName = (customName || '').trim();
      if (finalName) {
        const alreadyExists = projects.some(
          (p) => p.name.trim().toLowerCase() === finalName.toLowerCase(),
        );
        if (alreadyExists) {
          alert(
            `Já existe um trabalho ativo com o nome "${finalName}". Escolha um nome diferente para evitar substituição.`,
          );
          return;
        }
      } else {
        finalName = generateDefaultProjectName(templateType, projects);
      }

      const newProj = createProjectFromTemplate(templateType, finalName);
      if (universePackage && newProj.templateConfig) {
        const trimmedPkg = universePackage.trim();
        const knownPkg = POPULAR_UNIVERSE_TEMPLATES.find(
          (t) => t.id.toLowerCase() === trimmedPkg.toLowerCase(),
        );
        const pkgMatch = trimmedPkg.match(/^@?[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+):[0-9.]+$/);
        newProj.templateConfig.universePackage = trimmedPkg;
        newProj.templateConfig.universeEntrypoint =
          knownPkg?.entrypoint || pkgMatch?.[1] || newProj.templateConfig.universeEntrypoint;
      }
      newProj.ownerEmail = activeOwner;
      await saveProject(newProj, false);
      const all = await listProjects(activeOwner);
      setProjects(all);
      skipNextAutoSaveRef.current = true;
      clearHistory();
      setProject(newProj);
      setActiveProjectId(newProj.id, activeOwner);
    },
    [projects, activeOwner, clearHistory, setProject],
  );

  const handleRenameProject = useCallback(
    async (id: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const target = projects.find((p) => p.id === id);
      if (!target) return;
      if (target.name.trim().toLowerCase() === trimmed.toLowerCase()) return;

      const alreadyExists = projects.some(
        (p) => p.id !== id && p.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (alreadyExists) {
        alert(
          `Já existe outro trabalho com o nome "${trimmed}". Escolha um nome diferente para evitar substituição.`,
        );
        return;
      }

      const updated = await saveProject({ ...target, name: trimmed });
      const all = await listProjects(activeOwner);
      setProjects(all);
      if (id === project.id) {
        skipNextAutoSaveRef.current = true;
        setProject(updated);
      }
    },
    [projects, activeOwner, project.id, setProject],
  );

  const handleDuplicateProject = useCallback(
    async (id: string) => {
      const original = projects.find((p) => p.id === id);
      if (!original) return;
      const cloned = await duplicateProject(id);
      if (!cloned) return;

      cloned.name = generateUniqueCopyName(original.name, projects);
      cloned.ownerEmail = activeOwner;
      await saveProject(cloned, false);
      const all = await listProjects(activeOwner);
      setProjects(all);
      skipNextAutoSaveRef.current = true;
      setProject(cloned);
      setActiveProjectId(cloned.id, activeOwner);
    },
    [projects, activeOwner, setProject],
  );

  const handleMoveToTrash = useCallback(
    async (id: string) => {
      await moveProjectToTrash(id);
      const all = await listProjects(activeOwner);
      const trashed = await listTrashedProjects(activeOwner);
      setProjects(all);
      setTrashedProjects(trashed);
      if (all.length > 0) {
        if (id === project.id) {
          skipNextAutoSaveRef.current = true;
          setProject(all[0]);
          setActiveProjectId(all[0].id, activeOwner);
        }
      } else {
        onEmptyWorkspace();
      }
    },
    [activeOwner, project.id, setProject, onEmptyWorkspace],
  );

  const handleRestoreFromTrash = useCallback(
    async (id: string) => {
      const restored = await restoreProjectFromTrash(id);
      if (!restored) return;
      const all = await listProjects(activeOwner);
      const trashed = await listTrashedProjects(activeOwner);
      setProjects(all);
      setTrashedProjects(trashed);
      skipNextAutoSaveRef.current = true;
      setProject(restored);
      setActiveProjectId(restored.id, activeOwner);
    },
    [activeOwner, setProject],
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      await deleteProject(id);
      const all = await listProjects(activeOwner);
      const trashed = await listTrashedProjects(activeOwner);
      setProjects(all);
      setTrashedProjects(trashed);
    },
    [activeOwner],
  );

  const handleExportBackup = useCallback((targetProject: DocumentProject) => {
    const json = serializeBackup(targetProject);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    triggerBlobDownload(blob, `${targetProject.name.toLowerCase().replace(/\s+/g, '_')}.redija`);
  }, []);

  const handleImportBackup = useCallback(
    async (file: File) => {
      try {
        const imported = await importDocumentFile(file);
        imported.ownerEmail = activeOwner;
        await saveProject(imported, false);
        const all = await listProjects(activeOwner);
        setProjects(all);
        skipNextAutoSaveRef.current = true;
        clearHistory();
        setProject(imported);
        setActiveProjectId(imported.id, activeOwner);
        onProjectImported();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao importar documento.');
      }
    },
    [activeOwner, clearHistory, setProject, onProjectImported],
  );

  return {
    projects,
    setProjects,
    trashedProjects,
    isStorageReady,
    saveStatus,
    resetWorkspaceState,
    handleMetadataChange,
    handleChangeSidebarConfig,
    handleApplyTemplateCustomizer,
    handleBlocksChange,
    handleAddReference,
    handleUpdateReference,
    handleAddMultipleReferences,
    handleRemoveReference,
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleDuplicateProject,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handlePermanentDelete,
    handleExportBackup,
    handleImportBackup,
  };
}
