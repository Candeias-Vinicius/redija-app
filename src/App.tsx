import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Plus, Share2, Upload, X } from 'lucide-react';
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
import { SharedDriveAccessModal } from '@/components/SharedDriveAccessModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { DocsPage } from '@/components/docs/DocsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import { listCollaborators } from '@/core/storage/googleDriveService';
import { isGooglePickerConfigured } from '@/core/storage/googlePickerService';
import { isBetaNoticeDismissed } from '@/core/version';
import { AcademicReference, DEFAULT_TEMPLATE_CONFIG, DocumentProject } from '@/types/document';
import { type ContextualGuideMode } from '@/core/templates/templateCapabilities';
import {
  clearSharedDriveFileFromLocation,
  extractSharedDriveFileIdFromLocation,
  useAppRoute,
} from '@/hooks/useAppRoute';
import { usePaneLayout } from '@/hooks/usePaneLayout';
import { useUndoRedoHistory } from '@/hooks/useUndoRedoHistory';
import { useRealtimeCollab } from '@/hooks/useRealtimeCollab';
import {
  FALLBACK_INITIAL_PROJECT,
  useProjectWorkspace,
} from '@/hooks/useProjectWorkspace';
import { useDriveSyncOrchestrator } from '@/hooks/useDriveSyncOrchestrator';
import { useDocumentExport } from '@/hooks/useDocumentExport';
import { readInitialGuestMode, useAuthSession } from '@/hooks/useAuthSession';

const PENDING_DRIVE_FILE_STORAGE_KEY = 'redija:pendingDriveFileId';

function readInitialPendingDriveFileId(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = extractSharedDriveFileIdFromLocation(window.location.search);
  if (fromUrl) {
    try {
      sessionStorage.setItem(PENDING_DRIVE_FILE_STORAGE_KEY, fromUrl);
    } catch {
      // Ignora indisponibilidade de sessionStorage
    }
    return fromUrl;
  }
  try {
    const stored = sessionStorage.getItem(PENDING_DRIVE_FILE_STORAGE_KEY);
    return stored ? extractSharedDriveFileIdFromLocation(`?driveFileId=${stored}`) : null;
  } catch {
    return null;
  }
}

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(FALLBACK_INITIAL_PROJECT);

  // Estado de modais e interface local
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [pendingSharedFileId, setPendingSharedFileId] = useState<string | null>(
    readInitialPendingDriveFileId,
  );
  const [sharedAccessModal, setSharedAccessModal] = useState<{
    isOpen: boolean;
    fileId: string | null;
  }>({ isOpen: false, fileId: null });
  const [collabPolicy, setCollabPolicy] = useState<{
    projectId: string;
    fileId: string;
    allowedEmails: string[];
    allowAnyone: boolean;
  } | null>(null);

  const attemptedSharedAttemptKeyRef = useRef<string | null>(null);
  const sharedBackupImportInputRef = useRef<HTMLInputElement | null>(null);

  // Autenticação Google e perfil convidado local
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
  const [isGuestMode, setIsGuestMode] = useState<boolean>(readInitialGuestMode);

  const activeOwner = isAuthenticated && user ? user.email : 'local';
  const isSessionActive = isAuthenticated || isGuestMode;
  const isProjectReadOnly = project.shareRole === 'reader' || project.shareRole === 'commenter';
  const { route, sectionId, navigateTo } = useAppRoute();
  const handleOpenFullDocs = useCallback(
    (targetSectionId?: string) => navigateTo('/docs', targetSectionId),
    [navigateTo],
  );

  // Hooks de domínio & orquestração
  const {
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
    toggleDarkMode,
  } = usePaneLayout();

  const {
    canUndo,
    canRedo,
    recordHistorySnapshot,
    handleUndo,
    handleRedo,
    clearHistory,
  } = useUndoRedoHistory(setProject, isProjectReadOnly);

  const hasMatchingCollabPolicy =
    collabPolicy !== null &&
    collabPolicy.projectId === project.id &&
    Boolean(project.driveFileId) &&
    collabPolicy.fileId === project.driveFileId;
  const activeAllowedEmails = hasMatchingCollabPolicy ? collabPolicy.allowedEmails : undefined;
  const activeAllowAnyone = hasMatchingCollabPolicy ? collabPolicy.allowAnyone : false;
  const isSharedOrCollabActive = Boolean(
    project.isSharedWithMe ||
      (hasMatchingCollabPolicy &&
        (collabPolicy.allowAnyone || collabPolicy.allowedEmails.length > 1)),
  );

  const {
    activeCollaborators,
    collabConnectionStatus,
    broadcastCursor,
    broadcastBlocksSync,
    broadcastBlockUpdate,
    broadcastMetadataUpdate,
    broadcastReferencesUpdate,
  } = useRealtimeCollab({
    isAuthenticated,
    user,
    project,
    setProject,
    allowedEmails: activeAllowedEmails,
    allowAnyone: activeAllowAnyone,
  });

  const openProjectsModal = useCallback(() => setIsProjectsModalOpen(true), []);
  const closeProjectsModal = useCallback(() => setIsProjectsModalOpen(false), []);
  const clearEditingReference = useCallback(() => setEditingReference(null), []);

  const isHandlingSharedFlowRef = useRef(
    Boolean(pendingSharedFileId) || sharedAccessModal.isOpen,
  );
  useEffect(() => {
    isHandlingSharedFlowRef.current = Boolean(pendingSharedFileId) || sharedAccessModal.isOpen;
  }, [pendingSharedFileId, sharedAccessModal.isOpen]);

  const handleEmptyWorkspace = useCallback(() => {
    if (!isHandlingSharedFlowRef.current) {
      setIsProjectsModalOpen(true);
    }
  }, []);

  const {
    projects,
    setProjects,
    trashedProjects,
    isStorageReady,
    saveStatus,
    isReadOnly,
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
  } = useProjectWorkspace({
    project,
    setProject,
    activeOwner,
    isSessionActive,
    recordHistorySnapshot,
    clearHistory,
    onBroadcastBlocksSync: broadcastBlocksSync,
    onBroadcastBlockUpdate: broadcastBlockUpdate,
    onBroadcastMetadataUpdate: broadcastMetadataUpdate,
    onBroadcastReferencesUpdate: broadcastReferencesUpdate,
    onEmptyWorkspace: handleEmptyWorkspace,
    onProjectImported: closeProjectsModal,
    onReferenceUpdated: clearEditingReference,
  });

  const {
    driveSyncStatus,
    isSyncingDrive,
    isOpeningShared,
    sharedAccessError,
    clearSharedAccessError,
    handleSyncFromDrive,
    handleEnsureProjectSavedToDrive,
    openSharedDriveProject,
    openSharedViaPicker,
  } = useDriveSyncOrchestrator({
    project,
    setProject,
    projectsCount: projects.length,
    setProjects,
    isStorageReady,
    isAuthenticated,
    user,
    login,
    getValidAccessToken,
    collabConnectionStatus,
    isSharedOrCollabActive,
  });

  const {
    isExportingPdf,
    isExportingProject,
    handleDownloadPdf,
    handleExportProjectZip,
    handleExportTypst,
  } = useDocumentExport({
    project,
    isAuthenticated,
    getValidAccessToken,
  });

  const dismissPendingSharedDriveFile = useCallback(() => {
    setPendingSharedFileId(null);
    clearSharedDriveFileFromLocation();
    try {
      sessionStorage.removeItem(PENDING_DRIVE_FILE_STORAGE_KEY);
    } catch {
      // Ignora
    }
  }, []);

  const handleCollaboratorsLoaded = useCallback(
    ({ allowedEmails, allowAnyone }: { allowedEmails: string[]; allowAnyone: boolean }) => {
      if (!project.driveFileId) return;
      setCollabPolicy({
        projectId: project.id,
        fileId: project.driveFileId,
        allowedEmails,
        allowAnyone,
      });
    },
    [project.id, project.driveFileId],
  );

  // Carrega política de colaboradores silenciosamente para alimentar a lista branca P2P e fallback Drive
  const activeProjectIdForPolicy = project.id;
  const activeDriveFileIdForPolicy = project.driveFileId;
  useEffect(() => {
    if (!isAuthenticated || !isStorageReady || !activeDriveFileIdForPolicy) {
      return;
    }

    let isMounted = true;
    getValidAccessToken(false)
      .then((token) => {
        if (!isMounted || !token) return null;
        return listCollaborators(activeDriveFileIdForPolicy, token);
      })
      .then((list) => {
        if (!isMounted || !list) return;
        const allowAnyone = list.some((c) => c.type === 'anyone');
        const allowedEmails = Array.from(
          new Set(
            list
              .map((c) => c.emailAddress?.trim().toLowerCase())
              .filter((email): email is string => Boolean(email)),
          ),
        );
        setCollabPolicy({
          projectId: activeProjectIdForPolicy,
          fileId: activeDriveFileIdForPolicy,
          allowedEmails,
          allowAnyone,
        });
      })
      .catch(() => {
        // Permissões podem não ser listáveis por leitores; isSharedWithMe segue garantindo o fallback
      });

    return () => {
      isMounted = false;
    };
  }, [
    isAuthenticated,
    isStorageReady,
    activeProjectIdForPolicy,
    activeDriveFileIdForPolicy,
    getValidAccessToken,
  ]);

  // Processa links diretos ?driveFileId=... automaticamente após autenticar e montar armazenamento local
  useEffect(() => {
    if (!isAuthenticated || !user || !isStorageReady || !pendingSharedFileId) {
      return;
    }
    const attemptKey = `${user.email}:${pendingSharedFileId}`;
    if (attemptedSharedAttemptKeyRef.current === attemptKey) {
      return;
    }
    attemptedSharedAttemptKeyRef.current = attemptKey;

    let isMounted = true;
    openSharedDriveProject(pendingSharedFileId).then((outcome) => {
      if (!isMounted) return;
      const targetId = pendingSharedFileId;
      dismissPendingSharedDriveFile();
      closeProjectsModal();
      if (outcome === 'opened') {
        clearHistory();
      } else if (outcome === 'needs_picker') {
        clearSharedAccessError();
        setSharedAccessModal({ isOpen: true, fileId: targetId });
      } else {
        setSharedAccessModal({ isOpen: true, fileId: targetId });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isAuthenticated,
    user,
    isStorageReady,
    pendingSharedFileId,
    openSharedDriveProject,
    dismissPendingSharedDriveFile,
    closeProjectsModal,
    clearHistory,
    clearSharedAccessError,
  ]);

  const handleResetSessionWorkspace = useCallback(() => {
    resetWorkspaceState();
    clearHistory();
    setCollabPolicy(null);
    setSharedAccessModal({ isOpen: false, fileId: null });
    attemptedSharedAttemptKeyRef.current = null;
  }, [resetWorkspaceState, clearHistory]);

  const {
    handleEnterGuestMode,
    handleLoginClick,
    handleLogout,
    handleExitGuestMode,
    handleRevokeAccess,
    handleDeleteAccountAndData,
  } = useAuthSession({
    user,
    isConfigured: isAuthConfigured,
    login,
    loginDevMock,
    logout,
    revokeAccess,
    getValidAccessToken,
    setIsGuestMode,
    onResetWorkspace: handleResetSessionWorkspace,
  });

  // Exibição do aviso de boas-vindas do Beta no primeiro acesso do usuário
  useEffect(() => {
    if (route !== 'docs' && isSessionActive && !isBetaNoticeDismissed()) {
      const timer = setTimeout(() => {
        if (!isBetaNoticeDismissed()) {
          setIsBetaNoticeOpen(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isSessionActive, route]);

  if (route === 'docs') {
    return (
      <DocsPage
        isDark={darkMode}
        onToggleDarkMode={toggleDarkMode}
        isSessionActive={isSessionActive}
        initialSectionId={sectionId}
        onNavigateApp={() => navigateTo('/')}
      />
    );
  }

  if (!isSessionActive) {
    return (
      <LoginScreen
        onLogin={() => login(false)}
        onLoginDevMock={loginDevMock}
        onContinueAsGuest={handleEnterGuestMode}
        onOpenFullDocs={handleOpenFullDocs}
        isLoading={isAuthLoading}
        error={authError}
        isConfigured={isAuthConfigured}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        pendingSharedDriveFileId={pendingSharedFileId}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 select-none overflow-hidden">
      {/* Banner para quem abriu link ?driveFileId=... enquanto navega em Modo Local */}
      {!isAuthenticated && pendingSharedFileId && (
        <div className="bg-emerald-950 text-emerald-50 px-4 py-2 text-xs flex items-center justify-between border-b border-emerald-800/80 z-20">
          <div className="flex items-center gap-2.5 mx-auto max-w-5xl">
            <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Você abriu um link de trabalho compartilhado. Conecte sua conta Google para acessá-lo no editor.
            </span>
            <button
              type="button"
              onClick={handleLoginClick}
              disabled={isAuthLoading}
              className="ml-2 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-[11px] transition-colors shrink-0 cursor-pointer"
            >
              Conectar Google para Abrir
            </button>
          </div>
          <button
            type="button"
            onClick={dismissPendingSharedDriveFile}
            className="p-1 text-emerald-300 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
            title="Dispensar convite"
            aria-label="Dispensar convite"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        onToggleDarkMode={toggleDarkMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showSidebar={showSidebar}
        showEditor={showEditor}
        showPreview={showPreview}
        onToggleSidebar={toggleSidebar}
        onToggleEditor={toggleEditor}
        onTogglePreview={togglePreview}
        onOpenProjectsModal={openProjectsModal}
        onOpenTemplateCustomizer={() => {
          if (!isReadOnly) setIsCustomizerOpen(true);
        }}
        onOpenBugReportModal={() => setIsBugReportOpen(true)}
        onOpenBetaNoticeModal={() => setIsBetaNoticeOpen(true)}
        onOpenWelcomeModal={() => {
          setWelcomeInitialTab('overview');
          setIsWelcomeModalOpen(true);
        }}
        onOpenFullDocs={() => handleOpenFullDocs()}
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
        collabConnectionStatus={collabConnectionStatus}
        isReadOnly={isReadOnly}
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
              onClick={openProjectsModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Trabalho</span>
            </button>
            <button
              onClick={openProjectsModal}
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
                readOnly={isReadOnly}
                onChangeMetadata={handleMetadataChange}
                onChangeSidebarConfig={handleChangeSidebarConfig}
                references={project.references}
                onOpenReferenceModal={() => {
                  if (isReadOnly) return;
                  setEditingReference(null);
                  setIsModalOpen(true);
                }}
                onEditReference={(ref) => {
                  if (isReadOnly) return;
                  setEditingReference(ref);
                  setIsModalOpen(true);
                }}
                onRemoveReference={handleRemoveReference}
                onOpenTemplateCustomizer={() => {
                  if (!isReadOnly) setIsCustomizerOpen(true);
                }}
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
                readOnly={isReadOnly}
                activeCollaborators={activeCollaborators}
                onOpenReferenceModal={() => {
                  if (isReadOnly) return;
                  setEditingReference(null);
                  setIsModalOpen(true);
                }}
                onChangeBlocks={handleBlocksChange}
                onFocusBlock={broadcastCursor}
                onMinimize={toggleEditor}
                onDuplicateProject={() => handleDuplicateProject(project.id)}
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
        isOpen={isModalOpen && !isReadOnly}
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
        onClose={closeProjectsModal}
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
        onOpenSharedFromPicker={() => {
          clearSharedAccessError();
          closeProjectsModal();
          setSharedAccessModal({ isOpen: true, fileId: null });
        }}
        isOpeningShared={isOpeningShared}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectName={project.name}
        driveFileId={project.driveFileId}
        shareRole={project.shareRole ?? (project.isSharedWithMe ? 'writer' : 'owner')}
        collabConnectionStatus={collabConnectionStatus}
        getAccessToken={getValidAccessToken}
        currentUserEmail={user?.email}
        onEnsureProjectSavedToDrive={handleEnsureProjectSavedToDrive}
        onCollaboratorsLoaded={handleCollaboratorsLoaded}
      />

      <SharedDriveAccessModal
        isOpen={sharedAccessModal.isOpen}
        fileId={sharedAccessModal.fileId}
        isOpening={isOpeningShared}
        error={sharedAccessError}
        isPickerConfigured={isGooglePickerConfigured()}
        onSelectViaPicker={async () => {
          const ok = await openSharedViaPicker();
          if (ok) {
            clearHistory();
          }
          return ok;
        }}
        onRetryDirectLoad={
          sharedAccessModal.fileId
            ? async () => {
                const targetId = sharedAccessModal.fileId;
                if (!targetId) return;
                const outcome = await openSharedDriveProject(targetId);
                if (outcome === 'opened') {
                  clearHistory();
                  setSharedAccessModal({ isOpen: false, fileId: null });
                }
              }
            : undefined
        }
        onImportLocalFile={() => sharedBackupImportInputRef.current?.click()}
        onClose={() => {
          clearSharedAccessError();
          setSharedAccessModal({ isOpen: false, fileId: null });
        }}
      />

      <input
        ref={sharedBackupImportInputRef}
        type="file"
        accept=".redija,.json,.docx,.zip,.typ,.tex"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportBackup(file);
            e.target.value = '';
          }
        }}
        className="hidden"
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
        onOpenFullDocs={() => handleOpenFullDocs()}
      />

      <TemplateCustomizerModal
        isOpen={isCustomizerOpen && !isReadOnly}
        onClose={() => setIsCustomizerOpen(false)}
        config={project.templateConfig ?? DEFAULT_TEMPLATE_CONFIG}
        metadata={project.metadata}
        templateType={project.templateType}
        blocks={project.blocks}
        onApply={handleApplyTemplateCustomizer}
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
