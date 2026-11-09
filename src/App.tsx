import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, Plus, Upload } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { ProjectsModal } from '@/components/ProjectsModal';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TemplateCustomizerModal } from '@/components/TemplateCustomizerModal';
import { BugReportModal } from '@/components/BugReportModal';
import { BetaNoticeModal } from '@/components/BetaNoticeModal';
import { ShareModal } from '@/components/ShareModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import { isBetaNoticeDismissed } from '@/core/version';
import {
  saveProjectToDrive,
  saveProjectPdfToDrive,
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
  SidebarConfig,
  TemplateConfig,
  DEFAULT_TEMPLATE_CONFIG,
} from '@/types/document';
import type { ContextualGuideMode } from '@/core/templates/templateCapabilities';
import {
  generateStandaloneTypst,
  generateTypstFiles,
  extractBinaryAssets,
} from '@/core/transpiler/typstGenerator';
import { compileToPdf } from '@/core/typst/typstClient';
import {
  exportTypstProjectZip,
  getCleanProjectSlug,
} from '@/core/transpiler/projectExporter';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import { importDocumentFile } from '@/core/storage/documentImporter';
import {
  realtimeCollab,
  CollaboratorPresence,
} from '@/core/collaboration/RealtimeCollabManager';
import {
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
} from '@/core/storage/db';

const fallbackInitialProject = createProjectFromTemplate('tcc');

interface HistorySnapshot {
  templateType?: ProjectTemplateType;
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  templateConfig?: TemplateConfig;
  sidebarConfig?: SidebarConfig;
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
  const [welcomeInitialTab, setWelcomeInitialTab] = useState<'overview' | ContextualGuideMode>(
    'overview',
  );
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isBetaNoticeOpen, setIsBetaNoticeOpen] = useState(false);
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
      return (
        sessionStorage.getItem('redija:guestMode') === 'true' ||
        localStorage.getItem('redija:guestMode') === 'true'
      );
    } catch {
      return false;
    }
  });

  const [rawDriveSyncStatus, setRawDriveSyncStatus] = useState<
    'synced' | 'syncing' | 'error'
  >('synced');
  const driveSyncStatus = !isAuthenticated || !user ? 'local' : rawDriveSyncStatus;
  const activeOwner = isAuthenticated && user ? user.email : 'local';

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorPresence[]>([]);

  // Sincronização Google Drive: trava contra chamadas concorrentes e deduplicação de assinaturas
  const isDriveSyncingRef = useRef(false);
  const driveFileIdByProjectIdRef = useRef<Record<string, string>>({});
  const lastSyncedSignatureRef = useRef<Record<string, string>>({});

  const getProjectContentSignature = useCallback((p: DocumentProject): string => {
    return JSON.stringify({
      name: p.name,
      templateType: p.templateType,
      metadata: p.metadata,
      blocks: p.blocks,
      references: p.references,
      templateConfig: p.templateConfig,
      sidebarConfig: p.sidebarConfig,
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
      templateType: currentProj.templateType,
      metadata: currentProj.metadata,
      blocks: currentProj.blocks,
      references: currentProj.references,
      templateConfig: currentProj.templateConfig,
      sidebarConfig: currentProj.sidebarConfig,
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
            templateType: currentProj.templateType,
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
            sidebarConfig: currentProj.sidebarConfig,
          },
          ...prevFuture.slice(0, 49),
        ]);
        return {
          ...currentProj,
          templateType: previous.templateType ?? currentProj.templateType,
          metadata: previous.metadata,
          blocks: previous.blocks,
          references: previous.references,
          templateConfig: previous.templateConfig,
          sidebarConfig: previous.sidebarConfig,
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
            templateType: currentProj.templateType,
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
            sidebarConfig: currentProj.sidebarConfig,
          },
        ]);
        return {
          ...currentProj,
          templateType: next.templateType ?? currentProj.templateType,
          metadata: next.metadata,
          blocks: next.blocks,
          references: next.references,
          templateConfig: next.templateConfig,
          sidebarConfig: next.sidebarConfig,
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

  // Exibição do aviso de boas-vindas do Beta no primeiro acesso do usuário
  useEffect(() => {
    if ((isAuthenticated || isGuestMode) && !isBetaNoticeDismissed()) {
      const timer = setTimeout(() => {
        if (!isBetaNoticeDismissed()) {
          setIsBetaNoticeOpen(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isGuestMode]);

  const skipNextAutoSaveRef = useRef(true);

  // Carrega os projetos do IndexedDB isolados pelo perfil atual (Google ou Perfil Local)
  useEffect(() => {
    // Se não estiver autenticado nem em modo convidado (ou seja, na LoginScreen), não carrega
    if (!isAuthenticated && !isGuestMode) {
      return;
    }

    let mounted = true;
    skipNextAutoSaveRef.current = true;

    loadInitialActiveProject(activeOwner)
      .then(({ activeProject, allProjects, trashedProjects: initialTrash }) => {
        if (!mounted) return;
        skipNextAutoSaveRef.current = true;
        if (activeProject) {
          setProject(activeProject);
        } else {
          setProject(fallbackInitialProject);
        }
        setProjects(allProjects);
        setTrashedProjects(initialTrash);
        setIsStorageReady(true);
        if (allProjects.length === 0) {
          setIsProjectsModalOpen(true);
        }
      })
      .catch((err) => {
        console.error('Erro ao inicializar IndexedDB para sessão:', err);
        if (mounted) setIsStorageReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [activeOwner, isAuthenticated, isGuestMode]);

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
  }, [project, isStorageReady, projects.length, activeOwner]);

  // Sincronização em segundo plano com o Google Drive (Debounce de 3.5 segundos)
  useEffect(() => {
    if (!isStorageReady || !isAuthenticated || !user || projects.length === 0) {
      return;
    }

    // Blindagem de segurança: nunca envia para o Google Drive arquivos do Perfil Local
    // ou que pertençam a outro usuário
    if (project.ownerEmail && project.ownerEmail !== user.email) {
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
          ownerEmail: user.email,
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
            ownerEmail: user.email,
          };
        });

        // Grava no IndexedDB sem alterar o updatedAt (evita ciclo repetitivo de auto-save)
        const currentInDb = await getProject(project.id);
        if (currentInDb) {
          const updatedDb = {
            ...currentInDb,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: user.email,
          };
          await saveProject(updatedDb, false);
          const all = await listProjects(user.email);
          setProjects(all);
        }

        // Atualiza em segundo plano uma cópia do PDF compilado no Drive (backup legível para o usuário)
        (async () => {
          try {
            const files = generateTypstFiles(projectToSync);
            const binaryFiles = extractBinaryAssets(projectToSync);
            const pdfResult = await compileToPdf(files, binaryFiles, {
              fontFamily: projectToSync.templateConfig?.fontFamily ?? 'serif',
              customFontFamily: projectToSync.templateConfig?.customFontFamily,
            });
            if (pdfResult.pdf) {
              await saveProjectPdfToDrive(projectToSync, new Uint8Array(pdfResult.pdf), token);
            }
          } catch (pdfErr) {
            console.warn('Erro ao atualizar cópia PDF no Drive:', pdfErr);
          }
        })();
      } catch (err) {
        console.warn('Erro ao sincronizar com Google Drive:', err);
        setRawDriveSyncStatus('error');
      } finally {
        isDriveSyncingRef.current = false;
      }
    }, 3500);

    return () => clearTimeout(driveTimer);
  }, [project, isStorageReady, isAuthenticated, user, projects.length, getValidAccessToken, getProjectContentSignature]);

  /**
   * Garante que o projeto ativo esteja gravado no Google Drive antes de compartilhar.
   */
  const handleEnsureProjectSavedToDrive = async (): Promise<string | null> => {
    try {
      let token = await getValidAccessToken(true);
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

      // Sincroniza cópia do PDF compilado em segundo plano
      (async () => {
        try {
          const files = generateTypstFiles(projectToSync);
          const binaryFiles = extractBinaryAssets(projectToSync);
          const pdfResult = await compileToPdf(files, binaryFiles, {
            fontFamily: projectToSync.templateConfig?.fontFamily ?? 'serif',
            customFontFamily: projectToSync.templateConfig?.customFontFamily,
          });
          if (pdfResult.pdf) {
            await saveProjectPdfToDrive(projectToSync, new Uint8Array(pdfResult.pdf), token);
          }
        } catch (pdfErr) {
          console.warn('Erro ao atualizar cópia PDF no Drive:', pdfErr);
        }
      })();

      setRawDriveSyncStatus('synced');
      return fileId;
    } catch (err) {
      console.error('Falha ao garantir salvamento no Drive:', err);
      return null;
    }
  };

  const handleLoginClick = async (): Promise<string | null> => {
    let token: string | null;
    if (!isAuthConfigured) {
      loginDevMock();
      token = 'mock_dev_token_xyz';
    } else {
      token = await login(false);
    }
    if (token) {
      setIsGuestMode(false);
      try {
        localStorage.removeItem('redija:guestMode');
        sessionStorage.removeItem('redija:guestMode');
      } catch {
        // Ignora
      }
    }
    return token;
  };

  const handleLogout = () => {
    logout();
    setIsGuestMode(false);
    try {
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
    setProjects([]);
    setTrashedProjects([]);
    setProject(fallbackInitialProject);
  };

  const handleExitGuestMode = () => {
    setIsGuestMode(false);
    try {
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
    setProjects([]);
    setTrashedProjects([]);
    setProject(fallbackInitialProject);
  };

  const handleRevokeAccess = async () => {
    await revokeAccess();
    setIsGuestMode(false);
    try {
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
    setProjects([]);
    setTrashedProjects([]);
    setProject(fallbackInitialProject);
  };

  const handleDeleteAccountAndData = async () => {
    try {
      const token = await getValidAccessToken(true);
      if (token) {
        await deleteAllUserDriveProjects(token);
      }
    } catch (err) {
      console.warn('Erro ao deletar arquivos do Google Drive:', err);
    }

    try {
      if (user?.email) {
        const userProjects = await listProjects(user.email);
        for (const p of userProjects) {
          await deleteProject(p.id);
        }
      }
      setProjects([]);
      setTrashedProjects([]);
      setProject(fallbackInitialProject);
    } catch (err) {
      console.warn('Erro ao limpar cache local na exclusão:', err);
    }

    await revokeAccess();
    setIsGuestMode(false);
    try {
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  };

  /**
   * Sincroniza a lista de projetos trazendo arquivos existentes do Google Drive para o Dexie.
   */
  const handleSyncFromDrive = useCallback(async (interactive = false) => {
    if (!isAuthenticated || !user) return;
    setIsSyncingDrive(true);
    try {
      const token = await getValidAccessToken(interactive);
      if (!token) return;

      const driveSummaries = await listDriveProjects(token);
      // Lista APENAS os projetos locais pertencentes a este usuário Google
      const currentProjects = await listProjects(user.email);
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
              remoteLoaded.ownerEmail = user.email;
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
            matchByName.ownerEmail = user.email;
            await saveProject(matchByName, false);
            driveFileIdByProjectIdRef.current[matchByName.id] = summary.id;
            hasNewOrUpdated = true;
          } else {
            try {
              const loaded = await loadProjectFromDrive(summary.id, token);
              loaded.ownerEmail = user.email;
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
        const all = await listProjects(user.email);
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

  // Colaboração em tempo real P2P (Nível 3: WebRTC DataChannels + BroadcastChannel)
  useEffect(() => {
    if (!isAuthenticated || !user || !project.driveFileId) {
      realtimeCollab.disconnect();
      return;
    }

    realtimeCollab.connect(project.driveFileId, user);

    const unsubPresence = realtimeCollab.onPresenceChange((presences) => {
      setActiveCollaborators(presences);
    });

    const unsubRemoteUpdate = realtimeCollab.onRemoteBlockUpdate(({ blockId, content, meta }) => {
      setProject((prev) => {
        const target = prev.blocks.find((b) => b.id === blockId);
        if (!target || target.content === content) return prev;
        return {
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.id === blockId ? { ...b, content, meta: meta ?? b.meta } : b
          ),
        };
      });
    });

    const unsubRemoteSync = realtimeCollab.onRemoteBlocksSync((remoteBlocks) => {
      setProject((prev) => {
        const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
          ...prev,
          blocks: remoteBlocks,
        });
        return hasMergedRemoteChanges ? mergedProject : prev;
      });
    });

    return () => {
      unsubPresence();
      unsubRemoteUpdate();
      unsubRemoteSync();
      realtimeCollab.disconnect();
    };
  }, [isAuthenticated, user, project.driveFileId]);

  const handleMetadataChange = (metadata: DocumentMetadata) => {
    setProject((prev) => {
      if (JSON.stringify(prev.metadata) === JSON.stringify(metadata)) {
        return prev;
      }
      recordHistorySnapshot(prev);
      return { ...prev, metadata };
    });
  };

  const handleChangeSidebarConfig = (sidebarConfig?: SidebarConfig) => {
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
  };

  const handleTemplateConfigChange = (templateConfig: TemplateConfig) => {
    setProject((prev) => {
      if (JSON.stringify(prev.templateConfig) === JSON.stringify(templateConfig)) {
        return prev;
      }
      recordHistorySnapshot(prev, true);

      let nextTemplateType = prev.templateType;
      const p = templateConfig.preset;
      if (p === 'sbc' || p === 'ieee' || p === 'poster' || p === 'universe_custom') {
        nextTemplateType = p;
      } else if (
        (p === 'abnt_classic' || p === 'abnt_2023') &&
        (prev.templateType === 'sbc' ||
          prev.templateType === 'ieee' ||
          prev.templateType === 'poster' ||
          prev.templateType === 'universe_custom')
      ) {
        nextTemplateType = 'tcc';
      } else if (
        p === 'article_2col' &&
        (prev.templateType === 'sbc' ||
          prev.templateType === 'ieee' ||
          prev.templateType === 'poster' ||
          prev.templateType === 'universe_custom')
      ) {
        nextTemplateType = 'artigo';
      }

      return { ...prev, templateType: nextTemplateType, templateConfig };
    });
  };

  const handleBlocksChange = (blocks: Block[]) => {
    setProject((prev) => {
      if (prev.blocks === blocks) return prev;

      const isLengthDifferent = prev.blocks.length !== blocks.length;
      let hasOrderChanged = false;
      let modifiedBlock: Block | null = null;
      let isIdentical = !isLengthDifferent;

      if (!isLengthDifferent) {
        for (let i = 0; i < blocks.length; i++) {
          const pb = prev.blocks[i];
          const nb = blocks[i];
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
        return prev;
      }

      const isStructural = isLengthDifferent || hasOrderChanged;
      const now = Date.now();

      if (isStructural) {
        const updatedBlocks = blocks.map((b) => (b.updatedAt ? b : { ...b, updatedAt: now }));
        recordHistorySnapshot(prev, true);
        realtimeCollab.broadcastBlocksSync(updatedBlocks);
        return { ...prev, blocks: updatedBlocks };
      }

      // Edição pontual de conteúdo ou metadados de bloco existente
      const updatedBlocks = blocks.map((b) =>
        b.id === modifiedBlock?.id ? { ...b, updatedAt: now } : b
      );
      recordHistorySnapshot(prev, false);
      if (modifiedBlock) {
        realtimeCollab.broadcastBlockUpdate(
          modifiedBlock.id,
          modifiedBlock.content,
          modifiedBlock.meta
        );
      }
      return { ...prev, blocks: updatedBlocks };
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
    setActiveProjectId(selected.id, activeOwner);
  };

  const handleCreateProject = async (
    templateType: ProjectTemplateType,
    customName?: string,
    universePackage?: string,
  ) => {
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
      // Gera nome padrão único baseado no template
      const defaultBase =
        templateType === 'tcc'
          ? 'Trabalho de Conclusão de Curso'
          : templateType === 'artigo'
          ? 'Novo Artigo Científico'
          : templateType === 'sbc'
          ? 'Novo Artigo SBC'
          : templateType === 'ieee'
          ? 'Novo Artigo IEEE'
          : templateType === 'poster'
          ? 'Novo Pôster Científico A0'
          : templateType === 'universe_custom'
          ? 'Novo Projeto Typst Universe'
          : templateType === 'relatorio'
          ? 'Novo Relatório Técnico'
          : templateType === 'projeto_pesquisa'
          ? 'Novo Projeto de Pesquisa'
          : 'Novo Documento';
      let candidate = defaultBase;
      let counter = 2;
      while (projects.some((p) => p.name.trim().toLowerCase() === candidate.toLowerCase())) {
        candidate = `${defaultBase} (${counter})`;
        counter++;
      }
      finalName = candidate;
    }

    const newProj = createProjectFromTemplate(templateType, finalName);
    if (universePackage && newProj.templateConfig) {
      newProj.templateConfig.universePackage = universePackage;
    }
    newProj.ownerEmail = activeOwner;
    await saveProject(newProj, false);
    const all = await listProjects(activeOwner);
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setPast([]);
    setFuture([]);
    setProject(newProj);
    setActiveProjectId(newProj.id, activeOwner);
  };

  const handleRenameProject = async (id: string, newName: string) => {
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
  };

  const handleDuplicateProject = async (id: string) => {
    const original = projects.find((p) => p.id === id);
    if (!original) return;
    const cloned = await duplicateProject(id);
    if (!cloned) return;

    // Garante nome único para a duplicata (ex: "Artigo (Cópia)", "Artigo (Cópia 2)")
    const baseCopyName = `${original.name} (Cópia)`;
    let uniqueName = baseCopyName;
    let counter = 2;
    while (projects.some((p) => p.name.trim().toLowerCase() === uniqueName.toLowerCase())) {
      uniqueName = `${original.name} (Cópia ${counter})`;
      counter++;
    }
    cloned.name = uniqueName;
    cloned.ownerEmail = activeOwner;
    await saveProject(cloned, false);
    const all = await listProjects(activeOwner);
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setProject(cloned);
    setActiveProjectId(cloned.id, activeOwner);
  };

  const handleMoveToTrash = async (id: string) => {
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
      setIsProjectsModalOpen(true);
    }
  };

  const handleRestoreFromTrash = async (id: string) => {
    const restored = await restoreProjectFromTrash(id);
    if (!restored) return;
    const all = await listProjects(activeOwner);
    const trashed = await listTrashedProjects(activeOwner);
    setProjects(all);
    setTrashedProjects(trashed);
    skipNextAutoSaveRef.current = true;
    setProject(restored);
    setActiveProjectId(restored.id, activeOwner);
  };

  const handlePermanentDelete = async (id: string) => {
    await deleteProject(id);
    const all = await listProjects(activeOwner);
    const trashed = await listTrashedProjects(activeOwner);
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
      const imported = await importDocumentFile(file);
      imported.ownerEmail = activeOwner;
      await saveProject(imported, false);
      const all = await listProjects(activeOwner);
      setProjects(all);
      skipNextAutoSaveRef.current = true;
      setPast([]);
      setFuture([]);
      setProject(imported);
      setActiveProjectId(imported.id, activeOwner);
      setIsProjectsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar documento.');
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const files = generateTypstFiles(project);
      const binaryFiles = extractBinaryAssets(project);
      const result = await compileToPdf(files, binaryFiles, {
        fontFamily: project.templateConfig?.fontFamily ?? 'serif',
        customFontFamily: project.templateConfig?.customFontFamily,
      });
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

      // Sincroniza em segundo plano uma cópia do PDF compilado no Google Drive se autenticado
      if (isAuthenticated) {
        getValidAccessToken().then((token) => {
          if (token) {
            saveProjectPdfToDrive(project, pdfBytes, token).catch((err) =>
              console.warn('Erro ao sincronizar cópia PDF no Drive:', err),
            );
          }
        });
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const [isExportingProject, setIsExportingProject] = useState(false);

  const handleExportProjectZip = async () => {
    setIsExportingProject(true);
    try {
      const zipBlob = await exportTypstProjectZip(project);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getCleanProjectSlug(project.name)}_typst.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar pacote do projeto:', err);
    } finally {
      setIsExportingProject(false);
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
            localStorage.setItem('redija:guestMode', 'true');
            sessionStorage.setItem('redija:guestMode', 'true');
          } catch {
            // Ignora
          }
        }}
        isLoading={isAuthLoading}
        error={authError}
        isConfigured={isAuthConfigured}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
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
        onOpenBetaNoticeModal={() => setIsBetaNoticeOpen(true)}
        onOpenWelcomeModal={() => {
          setWelcomeInitialTab('overview');
          setIsWelcomeModalOpen(true);
        }}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
        onExportTypst={handleExportTypst}
        onExportProjectZip={handleExportProjectZip}
        isExportingProject={isExportingProject}
        showCode={showCode}
        setShowCode={setShowCode}
        user={user}
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        activeCollaborators={activeCollaborators}
        onLogin={handleLoginClick}
        onLogout={handleLogout}
        isGuestMode={isGuestMode}
        onExitGuestMode={handleExitGuestMode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
      />

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-xs">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Nenhum trabalho criado ainda
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-6 leading-relaxed">
            Comece escolhendo um modelo com estrutura ABNT pré-configurada ou importe um arquivo existente.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsProjectsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Trabalho</span>
            </button>
            <button
              onClick={() => setIsProjectsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Importar Trabalho</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Painel Esquerdo: Metadados ABNT e Referências */}
        {showSidebar && (
          <ErrorBoundary
            fallbackTitle="Instabilidade na Barra de Estrutura"
            fallbackMessage="Ocorreu um erro ao renderizar os metadados ou referências. Seus dados continuam salvos no navegador."
          >
            <Sidebar
              project={project}
              metadata={project.metadata}
              onChangeMetadata={handleMetadataChange}
              onChangeSidebarConfig={handleChangeSidebarConfig}
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
              onOpenAbntGuide={() => {
                setWelcomeInitialTab('abnt');
                setIsWelcomeModalOpen(true);
              }}
              onOpenGuide={(mode) => {
                setWelcomeInitialTab(mode);
                setIsWelcomeModalOpen(true);
              }}
              onMinimize={toggleSidebar}
              widthPx={!showEditor && !showPreview ? window.innerWidth : sidebarWidth}
            />
          </ErrorBoundary>
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
          <ErrorBoundary
            fallbackTitle="Instabilidade no Editor de Texto"
            fallbackMessage="O editor visual encontrou uma falha temporária. Seus parágrafos e citações continuam preservados com segurança."
          >
            <Editor
              blocks={project.blocks}
              metadata={project.metadata}
              references={project.references}
              citationStyle={project.templateConfig?.citationStyle ?? DEFAULT_TEMPLATE_CONFIG.citationStyle}
              citationFormat={project.templateConfig?.citationFormat}
              referenceOrdering={project.templateConfig?.referenceOrdering}
              isFullWidth={!showSidebar && !showPreview}
              activeCollaborators={activeCollaborators}
              onOpenReferenceModal={() => {
                setEditingReference(null);
                setIsModalOpen(true);
              }}
              onChangeBlocks={handleBlocksChange}
              onFocusBlock={(blockId) => realtimeCollab.broadcastCursor(blockId)}
              onMinimize={toggleEditor}
            />
          </ErrorBoundary>
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
          <ErrorBoundary
            fallbackTitle="Instabilidade na Visualização do PDF"
            fallbackMessage="Ocorreu um erro no módulo de pré-visualização. O documento continua são e salvo e pode ser baixado normalmente."
          >
            <PdfPreview
              project={project}
              showCode={showCode}
              onToggleCode={() => setShowCode(!showCode)}
              onDownloadPdf={handleDownloadPdf}
              isExportingPdf={isExportingPdf}
              onExportProjectZip={handleExportProjectZip}
              isExportingProject={isExportingProject}
              widthPx={previewWidth}
              isFullWidth={!showEditor}
              onMinimize={togglePreview}
            />
          </ErrorBoundary>
        )}
      </div>
      )}

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
        onSyncFromDrive={() => handleSyncFromDrive(true)}
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
        initialTab={welcomeInitialTab}
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

      <BetaNoticeModal
        isOpen={isBetaNoticeOpen}
        onClose={() => setIsBetaNoticeOpen(false)}
        onOpenBugReport={() => setIsBugReportOpen(true)}
      />
    </div>
  );
};
