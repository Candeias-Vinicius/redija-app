import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { ProjectsModal } from '@/components/ProjectsModal';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TemplateCustomizerModal } from '@/components/TemplateCustomizerModal';
import { BugReportModal } from '@/components/BugReportModal';
import { ShareModal } from '@/components/ShareModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import {
  saveProjectToDrive,
  listDriveProjects,
  loadProjectFromDrive,
  deleteAllUserDriveProjects,
} from '@/core/storage/googleDriveService';
import {
  DocumentProject,
  DocumentMetadata,
  Block,
  AcademicReference,
  ProjectTemplateType,
  TemplateConfig,
  DEFAULT_TEMPLATE_CONFIG,
} from '@/types/document';
import {
  generateStandaloneTypst,
  generateTypstFiles,
  extractBinaryAssets,
} from '@/core/transpiler/typstGenerator';
import { compileToPdf } from '@/core/typst/typstClient';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import {
  db,
  loadInitialActiveProject,
  saveProject,
  getProject,
  listProjects,
  listTrashedProjects,
  duplicateProject,
  moveProjectToTrash,
  restoreProjectFromTrash,
  deleteProject,
  setActiveProjectId,
  serializeBackup,
  parseBackup,
} from '@/core/storage/db';

const fallbackInitialProject = createProjectFromTemplate('tcc');

interface HistorySnapshot {
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  templateConfig?: TemplateConfig;
}

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(fallbackInitialProject);
  const [projects, setProjects] = useState<DocumentProject[]>([fallbackInitialProject]);
  const [trashedProjects, setTrashedProjects] = useState<DocumentProject[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showCode, setShowCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<AcademicReference | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Google Auth, Drive Sync e Colaboração
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    error: authError,
    isConfigured: isAuthConfigured,
    login,
    loginDevMock,
    logout,
    revokeAccess,
    getValidAccessToken,
  } = useGoogleAuth();

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('redija:guestMode') === 'true';
    } catch {
      return false;
    }
  });

  const [rawDriveSyncStatus, setRawDriveSyncStatus] = useState<
    'synced' | 'syncing' | 'error'
  >('synced');
  const driveSyncStatus = !isAuthenticated || !user ? 'local' : rawDriveSyncStatus;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Sincronização Google Drive: trava contra chamadas concorrentes e deduplicação de assinaturas
  const isDriveSyncingRef = useRef(false);
  const driveFileIdByProjectIdRef = useRef<Record<string, string>>({});
  const lastSyncedSignatureRef = useRef<Record<string, string>>({});

  const getProjectContentSignature = useCallback((p: DocumentProject): string => {
    return JSON.stringify({
      name: p.name,
      metadata: p.metadata,
      blocks: p.blocks,
      references: p.references,
      templateConfig: p.templateConfig,
    });
  }, []);

  // Histórico Undo / Redo (Ctrl+Z / Ctrl+Y)
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const lastHistoryPushTimeRef = useRef<number>(0);

  // Largura redimensionável das abas (Sidebar e PDF Preview)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('redija:sidebarWidth'));
      return saved >= 240 && saved <= 520 ? saved : 320;
    } catch {
      return 320;
    }
  });
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('redija:previewWidth'));
      return saved >= 320 && saved <= 820 ? saved : 500;
    } catch {
      return 500;
    }
  });
  const [resizingPane, setResizingPane] = useState<'sidebar' | 'preview' | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const toggleSidebar = () => {
    // Impede que as 3 abas fiquem ocultas ao mesmo tempo
    if (showSidebar && !showEditor && !showPreview) return;
    setShowSidebar((prev) => !prev);
  };

  const toggleEditor = () => {
    if (showEditor && !showSidebar && !showPreview) return;
    setShowEditor((prev) => !prev);
  };

  const togglePreview = () => {
    if (showPreview && !showSidebar && !showEditor) return;
    setShowPreview((prev) => !prev);
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('redija:darkMode') === '1';
    } catch {
      return false;
    }
  });

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

  // Persistir larguras das abas e tratar arraste dos divisores
  useEffect(() => {
    if (!resizingPane) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingPane === 'sidebar') {
        const nextWidth = Math.max(240, Math.min(520, e.clientX));
        setSidebarWidth(nextWidth);
        try {
          localStorage.setItem('redija:sidebarWidth', String(nextWidth));
        } catch {
          // ignore
        }
      } else if (resizingPane === 'preview') {
        const nextWidth = Math.max(320, Math.min(820, window.innerWidth - e.clientX));
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

  const recordHistorySnapshot = useCallback((currentProj: DocumentProject, forceNewEntry = false) => {
    const now = Date.now();
    const snapshot: HistorySnapshot = {
      metadata: currentProj.metadata,
      blocks: currentProj.blocks,
      references: currentProj.references,
      templateConfig: currentProj.templateConfig,
    };

    setPast((prev) => {
      // Agrupa digitações rápidas em intervalos de 900ms para que Ctrl+Z desfaça frases/ações inteiras
      if (!forceNewEntry && now - lastHistoryPushTimeRef.current < 900 && prev.length > 0) {
        return prev;
      }
      lastHistoryPushTimeRef.current = now;
      return [...prev.slice(-49), snapshot];
    });
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, -1);

      setProject((currentProj) => {
        setFuture((prevFuture) => [
          {
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
          },
          ...prevFuture.slice(0, 49),
        ]);
        return {
          ...currentProj,
          metadata: previous.metadata,
          blocks: previous.blocks,
          references: previous.references,
          templateConfig: previous.templateConfig,
        };
      });

      return nextPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);

      setProject((currentProj) => {
        setPast((prevPast) => [
          ...prevPast.slice(-49),
          {
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
          },
        ]);
        return {
          ...currentProj,
          metadata: next.metadata,
          blocks: next.blocks,
          references: next.references,
          templateConfig: next.templateConfig,
        };
      });

      return remainingFuture;
    });
  }, []);

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

  const skipNextAutoSaveRef = useRef(true);

  // Carrega o projeto ativo do IndexedDB ao iniciar
  useEffect(() => {
    let mounted = true;
    loadInitialActiveProject()
      .then(({ activeProject, allProjects, trashedProjects: initialTrash }) => {
        if (!mounted) return;
        skipNextAutoSaveRef.current = true;
        setProject(activeProject);
        setProjects(allProjects);
        setTrashedProjects(initialTrash);
        setIsStorageReady(true);
      })
      .catch((err) => {
        console.error('Erro ao inicializar IndexedDB:', err);
        if (mounted) setIsStorageReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-save com debounce sempre que o projeto ativo sofrer alterações
  useEffect(() => {
    if (!isStorageReady) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const saved = await saveProject(project);
        const all = await listProjects();
        setProjects(all);
        setSaveStatus('saved');
        // Mantém updatedAt sincronizado sem disparar novo ciclo de auto-save
        if (saved.updatedAt !== project.updatedAt) {
          skipNextAutoSaveRef.current = true;
          setProject((prev) => ({ ...prev, updatedAt: saved.updatedAt }));
        }
      } catch (err) {
        console.error('Erro ao salvar no IndexedDB:', err);
        setSaveStatus('saved');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [project, isStorageReady]);

  // Sincronização em segundo plano com o Google Drive (Debounce de 3.5 segundos)
  useEffect(() => {
    if (!isStorageReady || !isAuthenticated || !user) {
      return;
    }

    const driveTimer = setTimeout(async () => {
      // Se já houver um upload em andamento para o Drive, aguarda o próximo ciclo
      if (isDriveSyncingRef.current) {
        return;
      }

      const knownFileId = project.driveFileId || driveFileIdByProjectIdRef.current[project.id];
      const signature = getProjectContentSignature(project);

      // Se o conteúdo já foi sincronizado e já temos o driveFileId, evita requisições redundantes
      if (knownFileId && lastSyncedSignatureRef.current[project.id] === signature) {
        return;
      }

      isDriveSyncingRef.current = true;
      setRawDriveSyncStatus('syncing');

      try {
        const token = await getValidAccessToken();
        if (!token) {
          setRawDriveSyncStatus('error');
          return;
        }

        const projectToSync: DocumentProject = {
          ...project,
          driveFileId: knownFileId,
        };

        const { fileId, modifiedTime } = await saveProjectToDrive(projectToSync, token);
        driveFileIdByProjectIdRef.current[project.id] = fileId;
        lastSyncedSignatureRef.current[project.id] = signature;
        setRawDriveSyncStatus('synced');

        // Atualiza driveFileId no estado do projeto de forma funcional para não perder edições recentes
        setProject((prev) => {
          if (prev.id !== project.id) return prev;
          return {
            ...prev,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: prev.ownerEmail || user.email,
          };
        });

        // Grava no IndexedDB sem alterar o updatedAt (evita ciclo repetitivo de auto-save)
        const currentInDb = await getProject(project.id);
        if (currentInDb) {
          const updatedDb = {
            ...currentInDb,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: currentInDb.ownerEmail || user.email,
          };
          await saveProject(updatedDb, false);
          const all = await listProjects();
          setProjects(all);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar com Google Drive:', err);
        setRawDriveSyncStatus('error');
      } finally {
        isDriveSyncingRef.current = false;
      }
    }, 3500);

    return () => clearTimeout(driveTimer);
  }, [project, isStorageReady, isAuthenticated, user, getValidAccessToken, getProjectContentSignature]);

  /**
   * Garante que o projeto ativo esteja gravado no Google Drive antes de compartilhar.
   */
  const handleEnsureProjectSavedToDrive = async (): Promise<string | null> => {
    try {
      let token = await getValidAccessToken();
      if (!token) {
        token = await login(false);
      }
      if (!token) return null;

      const knownFileId = project.driveFileId || driveFileIdByProjectIdRef.current[project.id];
      const projectToSync: DocumentProject = {
        ...project,
        driveFileId: knownFileId,
      };

      setRawDriveSyncStatus('syncing');
      const { fileId, modifiedTime } = await saveProjectToDrive(projectToSync, token);
      driveFileIdByProjectIdRef.current[project.id] = fileId;
      lastSyncedSignatureRef.current[project.id] = getProjectContentSignature(project);

      setProject((prev) => ({
        ...prev,
        driveFileId: fileId,
        driveSyncedAt: modifiedTime,
        ownerEmail: prev.ownerEmail || user?.email,
      }));

      const currentInDb = await getProject(project.id);
      if (currentInDb) {
        await saveProject(
          {
            ...currentInDb,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: currentInDb.ownerEmail || user?.email,
          },
          false,
        );
        const all = await listProjects();
        setProjects(all);
      }

      setRawDriveSyncStatus('synced');
      return fileId;
    } catch (err) {
      console.error('Falha ao garantir salvamento no Drive:', err);
      return null;
    }
  };

  const handleLoginClick = async (): Promise<string | null> => {
    if (!isAuthConfigured) {
      loginDevMock();
      return 'mock_dev_token_xyz';
    } else {
      return await login(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsGuestMode(false);
    try {
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  };

  const handleRevokeAccess = async () => {
    await revokeAccess();
    setIsGuestMode(false);
    try {
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  };

  const handleDeleteAccountAndData = async () => {
    try {
      const token = await getValidAccessToken();
      if (token) {
        await deleteAllUserDriveProjects(token);
      }
    } catch (err) {
      console.warn('Erro ao deletar arquivos do Google Drive:', err);
    }

    try {
      await db.projects.clear();
      const fresh = createProjectFromTemplate('tcc');
      await saveProject(fresh);
      await setActiveProjectId(fresh.id);
      setProject(fresh);
      setProjects([fresh]);
      setTrashedProjects([]);
    } catch (err) {
      console.warn('Erro ao limpar cache local na exclusão:', err);
    }

    await revokeAccess();
    setIsGuestMode(false);
    try {
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  };

  /**
   * Sincroniza a lista de projetos trazendo arquivos existentes do Google Drive para o Dexie.
   */
  const handleSyncFromDrive = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncingDrive(true);
    try {
      const token = await getValidAccessToken();
      if (!token) return;

      const driveSummaries = await listDriveProjects(token);
      const currentProjects = await listProjects();
      let hasNewOrUpdated = false;

      // Filtra duplicatas existentes no Drive mantendo apenas o arquivo mais recente de cada projeto
      const seenNames = new Set<string>();

      for (const summary of driveSummaries) {
        const normName = summary.name.trim().toLowerCase();
        if (seenNames.has(normName)) {
          continue;
        }
        seenNames.add(normName);

        const existsLocally = currentProjects.find((p) => p.driveFileId === summary.id);
        if (existsLocally) {
          driveFileIdByProjectIdRef.current[existsLocally.id] = summary.id;
          // Se o arquivo no Google Drive foi atualizado por um colaborador (mais recente que o sync local)
          const remoteTime = new Date(summary.modifiedTime).getTime();
          const localTime = new Date(existsLocally.driveSyncedAt || existsLocally.updatedAt).getTime();
          if (remoteTime > localTime + 2000) {
            try {
              const remoteLoaded = await loadProjectFromDrive(summary.id, token);
              const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(
                existsLocally,
                remoteLoaded
              );
              if (hasMergedRemoteChanges) {
                await saveProject(mergedProject, false);
                hasNewOrUpdated = true;
              }
            } catch (err) {
              console.warn(`Erro ao mesclar alterações do Drive para ${summary.name}:`, err);
            }
          }
        } else {
          const matchByName = currentProjects.find(
            (p) =>
              !p.driveFileId &&
              p.name.trim().toLowerCase() === normName
          );
          if (matchByName) {
            matchByName.driveFileId = summary.id;
            matchByName.driveSyncedAt = summary.modifiedTime;
            matchByName.ownerEmail = user?.email;
            await saveProject(matchByName, false);
            driveFileIdByProjectIdRef.current[matchByName.id] = summary.id;
            hasNewOrUpdated = true;
          } else {
            try {
              const loaded = await loadProjectFromDrive(summary.id, token);
              await saveProject(loaded, false);
              driveFileIdByProjectIdRef.current[loaded.id] = summary.id;
              hasNewOrUpdated = true;
            } catch (err) {
              console.warn(`Não foi possível carregar projeto ${summary.name}:`, err);
            }
          }
        }
      }

      if (hasNewOrUpdated) {
        const all = await listProjects();
        setProjects(all);
        // Se o projeto ativo recebeu vinculação, atualiza estado ativo
        const activeUpdated = all.find((p) => p.id === project.id);
        if (activeUpdated && activeUpdated.driveFileId !== project.driveFileId) {
          setProject(activeUpdated);
        }
      }
    } catch (err) {
      console.error('Erro ao listar projetos do Drive:', err);
    } finally {
      setIsSyncingDrive(false);
    }
  }, [isAuthenticated, getValidAccessToken, user, project.id, project.driveFileId]);

  // Sincroniza projetos do Google Drive automaticamente em segundo plano ao logar
  useEffect(() => {
    if (!isAuthenticated || !isStorageReady) return;

    let isMounted = true;
    (async () => {
      await Promise.resolve();
      if (isMounted) {
        await handleSyncFromDrive();
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isStorageReady, handleSyncFromDrive]);

  // Sincronização inteligente ao voltar para a aba do navegador
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncFromDrive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, handleSyncFromDrive]);

  const handleMetadataChange = (metadata: DocumentMetadata) => {
    setProject((prev) => {
      if (JSON.stringify(prev.metadata) === JSON.stringify(metadata)) {
        return prev;
      }
      recordHistorySnapshot(prev);
      return { ...prev, metadata };
    });
  };

  const handleTemplateConfigChange = (templateConfig: TemplateConfig) => {
    setProject((prev) => {
      if (JSON.stringify(prev.templateConfig) === JSON.stringify(templateConfig)) {
        return prev;
      }
      recordHistorySnapshot(prev, true);
      return { ...prev, templateConfig };
    });
  };

  const handleBlocksChange = (blocks: Block[]) => {
    setProject((prev) => {
      if (prev.blocks === blocks) return prev;
      if (prev.blocks.length === blocks.length) {
        let isIdentical = true;
        for (let i = 0; i < blocks.length; i++) {
          const pb = prev.blocks[i];
          const nb = blocks[i];
          if (
            pb.id !== nb.id ||
            pb.type !== nb.type ||
            pb.content !== nb.content ||
            JSON.stringify(pb.meta) !== JSON.stringify(nb.meta)
          ) {
            isIdentical = false;
            break;
          }
        }
        if (isIdentical) {
          return prev;
        }
      }

      const isStructuralChange = blocks.length !== prev.blocks.length;
      recordHistorySnapshot(prev, isStructuralChange);
      return { ...prev, blocks };
    });
  };

  const handleAddReference = (ref: AcademicReference) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: [...prev.references, ref],
      };
    });
  };

  const handleUpdateReference = (updatedRef: AcademicReference) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: prev.references.map((r) => (r.id === updatedRef.id ? updatedRef : r)),
      };
    });
    setEditingReference(null);
  };

  const handleAddMultipleReferences = (refs: AcademicReference[]) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: [...prev.references, ...refs],
      };
    });
  };

  const handleRemoveReference = (id: string) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: prev.references.filter((r) => r.id !== id),
      };
    });
  };

  const handleSelectProject = (selected: DocumentProject) => {
    skipNextAutoSaveRef.current = true;
    setPast([]);
    setFuture([]);
    setProject(selected);
    setActiveProjectId(selected.id);
  };

  const handleCreateProject = async (
    templateType: ProjectTemplateType,
    customName?: string,
  ) => {
    const newProj = createProjectFromTemplate(templateType, customName);
    await saveProject(newProj, false);
    const all = await listProjects();
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setPast([]);
    setFuture([]);
    setProject(newProj);
    setActiveProjectId(newProj.id);
  };

  const handleRenameProject = async (id: string, newName: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const updated = await saveProject({ ...target, name: newName });
    const all = await listProjects();
    setProjects(all);
    if (id === project.id) {
      skipNextAutoSaveRef.current = true;
      setProject(updated);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const cloned = await duplicateProject(id);
    if (!cloned) return;
    const all = await listProjects();
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setProject(cloned);
    setActiveProjectId(cloned.id);
  };

  const handleMoveToTrash = async (id: string) => {
    if (projects.length <= 1) return;
    await moveProjectToTrash(id);
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
    if (id === project.id && all.length > 0) {
      skipNextAutoSaveRef.current = true;
      setProject(all[0]);
      setActiveProjectId(all[0].id);
    }
  };

  const handleRestoreFromTrash = async (id: string) => {
    const restored = await restoreProjectFromTrash(id);
    if (!restored) return;
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
    skipNextAutoSaveRef.current = true;
    setProject(restored);
    setActiveProjectId(restored.id);
  };

  const handlePermanentDelete = async (id: string) => {
    await deleteProject(id);
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
  };

  const handleExportBackup = (targetProject: DocumentProject) => {
    const json = serializeBackup(targetProject);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${targetProject.name.toLowerCase().replace(/\s+/g, '_')}.redija`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const content = await file.text();
      const imported = parseBackup(content);
      await saveProject(imported, false);
      const all = await listProjects();
      setProjects(all);
      skipNextAutoSaveRef.current = true;
      setProject(imported);
      setActiveProjectId(imported.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar arquivo .redija.');
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const files = generateTypstFiles(project);
      const binaryFiles = extractBinaryAssets(project);
      const result = await compileToPdf(files, binaryFiles);
      if (result.error || !result.pdf) {
        const msg =
          result.error ||
          result.diagnostics.map((d) => `${d.location}: ${d.message}`).join('\n') ||
          'Não foi possível gerar o PDF.';
        alert(`Erro ao gerar PDF:\n${msg}`);
        return;
      }

      const pdfBytes = new Uint8Array(result.pdf);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportTypst = () => {
    const code = generateStandaloneTypst(project);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.typ`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated && !isGuestMode) {
    return (
      <LoginScreen
        onLogin={() => login(false)}
        onLoginDevMock={loginDevMock}
        onContinueAsGuest={() => {
          setIsGuestMode(true);
          try {
            sessionStorage.setItem('redija:guestMode', 'true');
          } catch {
            // Ignora
          }
        }}
        isLoading={isAuthLoading}
        error={authError}
        isConfigured={isAuthConfigured}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 select-none overflow-hidden">
      {/* Alerta de Recomendação de Backup para Usuários sem Login */}
      <BackupNoticeBanner
        isAuthenticated={isAuthenticated}
        onLogin={handleLoginClick}
        onLoginDevMock={loginDevMock}
        isConfigured={isAuthConfigured}
        isLoading={isAuthLoading}
      />

      <Header
        projectName={project.name}
        projectsCount={projects.length}
        saveStatus={saveStatus}
        driveSyncStatus={driveSyncStatus}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showSidebar={showSidebar}
        showEditor={showEditor}
        showPreview={showPreview}
        onToggleSidebar={toggleSidebar}
        onToggleEditor={toggleEditor}
        onTogglePreview={togglePreview}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
        onOpenBugReportModal={() => setIsBugReportOpen(true)}
        onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
        onExportTypst={handleExportTypst}
        showCode={showCode}
        setShowCode={setShowCode}
        user={user}
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        onLogin={handleLoginClick}
        onLogout={handleLogout}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Painel Esquerdo: Metadados ABNT e Referências */}
        {showSidebar && (
          <Sidebar
            project={project}
            metadata={project.metadata}
            onChangeMetadata={handleMetadataChange}
            references={project.references}
            onOpenReferenceModal={() => {
              setEditingReference(null);
              setIsModalOpen(true);
            }}
            onEditReference={(ref) => {
              setEditingReference(ref);
              setIsModalOpen(true);
            }}
            onRemoveReference={handleRemoveReference}
            onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
            onMinimize={toggleSidebar}
            widthPx={!showEditor && !showPreview ? window.innerWidth : sidebarWidth}
          />
        )}

        {/* Divisor Redimensionável: Sidebar <-> Editor */}
        {showSidebar && (showEditor || showPreview) && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setResizingPane('sidebar');
            }}
            title="Arraste para redimensionar a barra lateral"
            className={`w-1.5 cursor-col-resize shrink-0 flex items-center justify-center transition-colors group ${
              resizingPane === 'sidebar'
                ? 'bg-emerald-500'
                : 'bg-neutral-200/60 hover:bg-emerald-500/60'
            }`}
          >
            <div className="w-0.5 h-8 rounded-full bg-neutral-400/60 group-hover:bg-white" />
          </div>
        )}

        {/* Centro: Editor Visual Estilo Notion */}
        {showEditor && (
          <Editor
            blocks={project.blocks}
            metadata={project.metadata}
            references={project.references}
            citationStyle={project.templateConfig?.citationStyle ?? DEFAULT_TEMPLATE_CONFIG.citationStyle}
            isFullWidth={!showSidebar && !showPreview}
            onOpenReferenceModal={() => {
              setEditingReference(null);
              setIsModalOpen(true);
            }}
            onChangeBlocks={handleBlocksChange}
            onMinimize={toggleEditor}
          />
        )}

        {/* Divisor Redimensionável: Editor <-> Preview PDF */}
        {showEditor && showPreview && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setResizingPane('preview');
            }}
            title="Arraste para redimensionar o painel do PDF e o editor"
            className={`w-1.5 cursor-col-resize shrink-0 flex items-center justify-center transition-colors group ${
              resizingPane === 'preview'
                ? 'bg-emerald-500'
                : 'bg-neutral-200/60 hover:bg-emerald-500/60'
            }`}
          >
            <div className="w-0.5 h-8 rounded-full bg-neutral-400/60 group-hover:bg-white" />
          </div>
        )}

        {/* Painel Direito: Preview A4 ABNT ou Código Typst */}
        {showPreview && (
          <PdfPreview
            project={project}
            showCode={showCode}
            widthPx={previewWidth}
            isFullWidth={!showEditor}
            onMinimize={togglePreview}
          />
        )}
      </div>

      <ReferenceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReference(null);
        }}
        editingReference={editingReference}
        onAddReference={handleAddReference}
        onUpdateReference={handleUpdateReference}
        onAddMultipleReferences={handleAddMultipleReferences}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        trashedProjects={trashedProjects}
        activeProjectId={project.id}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDuplicateProject={handleDuplicateProject}
        onMoveToTrash={handleMoveToTrash}
        onRestoreFromTrash={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        isAuthenticated={isAuthenticated}
        onSyncFromDrive={handleSyncFromDrive}
        isSyncingDrive={isSyncingDrive}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectName={project.name}
        driveFileId={project.driveFileId}
        getAccessToken={getValidAccessToken}
        currentUserEmail={user?.email}
        onEnsureProjectSavedToDrive={handleEnsureProjectSavedToDrive}
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        user={user}
        onLogout={handleLogout}
        onRevokeAccess={handleRevokeAccess}
        onDeleteAccountAndData={handleDeleteAccountAndData}
        getAccessToken={getValidAccessToken}
        projectsCount={projects.length}
        syncedProjectsCount={projects.filter((p) => Boolean(p.driveFileId)).length}
      />

      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

      <TemplateCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={project.templateConfig ?? DEFAULT_TEMPLATE_CONFIG}
        metadata={project.metadata}
        blocks={project.blocks}
        onChangeConfig={handleTemplateConfigChange}
        onChangeMetadata={handleMetadataChange}
      />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        projectName={project.name}
      />
    </div>
  );
};
