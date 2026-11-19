import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FileEdit, Loader2, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { HomePage } from '@/components/home/HomePage';
import {
  DeleteForeverDialog,
  RenameProjectDialog,
  StorageInfoDialog,
} from '@/components/home/ProjectDialogs';
import { toast } from '@/components/ui/toastStore';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TemplateCustomizerModal } from '@/components/TemplateCustomizerModal';
import { ReadinessCheckModal } from '@/components/ReadinessCheckModal';
import { BugReportModal } from '@/components/BugReportModal';
import { BetaNoticeModal, BetaNoticeToast } from '@/components/BetaNoticeModal';
import { ShareModal } from '@/components/ShareModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { DocsPage } from '@/components/docs/DocsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ImportProgressModal } from '@/components/import/ImportProgressModal';
import { IMPORT_ACCEPT } from '@/core/storage/documentImporter';
import { PaneRestoreRail } from '@/components/ui/PaneRestoreRail';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import { isBetaNoticeDismissed } from '@/core/version';
import { dismissBackupNotice, isBackupNoticeDismissed } from '@/core/backupNotice';
import {
  AcademicReference,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import {
  getTemplateCapabilities,
  type ContextualGuideMode,
} from '@/core/templates/templateCapabilities';
import { runDocumentLinter } from '@/core/transpiler/linters';
import {
  buildReadinessReport,
  type ChecklistNavigationTarget,
} from '@/core/transpiler/readiness';
import { scrollBehavior } from '@/core/motion';
import { useAppRoute } from '@/hooks/useAppRoute';
import { MIN_PREVIEW_WIDTH, MIN_SIDEBAR_WIDTH, usePaneLayout } from '@/hooks/usePaneLayout';
import { useUndoRedoHistory } from '@/hooks/useUndoRedoHistory';
import { useRealtimeCollab } from '@/hooks/useRealtimeCollab';
import {
  FALLBACK_INITIAL_PROJECT,
  useProjectWorkspace,
} from '@/hooks/useProjectWorkspace';
import { useDriveSyncOrchestrator } from '@/hooks/useDriveSyncOrchestrator';
import { downloadProjectPdf, useDocumentExport } from '@/hooks/useDocumentExport';
import { useCustomTemplates } from '@/hooks/useCustomTemplates';
import { uniqueProjectName } from '@/components/home/homeUtils';
import { readInitialGuestMode, useAuthSession } from '@/hooks/useAuthSession';

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(FALLBACK_INITIAL_PROJECT);

  // Estado de modais e interface local
  const [showCode, setShowCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<AcademicReference | null>(null);
  // Home (lista de trabalhos) e seus diálogos
  const [renameTarget, setRenameTarget] = useState<DocumentProject | null>(null);
  const [storageTarget, setStorageTarget] = useState<DocumentProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentProject | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [welcomeInitialTab, setWelcomeInitialTab] = useState<'overview' | ContextualGuideMode>(
    'overview',
  );
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isReadinessCheckOpen, setIsReadinessCheckOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isBetaNoticeOpen, setIsBetaNoticeOpen] = useState(false);
  const [isBetaToastVisible, setIsBetaToastVisible] = useState(false);
  const [isBackupNoticeVisible, setIsBackupNoticeVisible] = useState<boolean>(
    () => !isBackupNoticeDismissed(),
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

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
  const { route, sectionId, projectId, navigateTo, openProjectRoute, goHomeRoute } = useAppRoute();
  const handleOpenFullDocs = useCallback(
    (targetSectionId?: string) => navigateTo('/docs', targetSectionId),
    [navigateTo],
  );

  // Hooks de domínio & orquestração
  const {
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
    toggleDarkMode,
  } = usePaneLayout();

  const {
    canUndo,
    canRedo,
    recordHistorySnapshot,
    handleUndo,
    handleRedo,
    clearHistory,
  } = useUndoRedoHistory(setProject);

  const {
    activeCollaborators,
    broadcastCursor,
    broadcastBlocksSync,
    broadcastBlockUpdate,
  } = useRealtimeCollab({
    isAuthenticated,
    user,
    driveFileId: project.driveFileId,
    setProject,
  });

  // Sem trabalhos, a própria Home mostra o estado vazio (não há modal para abrir)
  const handleEmptyWorkspace = useCallback(() => {}, []);
  const handleProjectImported = useCallback(
    (imported: DocumentProject) => {
      openProjectRoute(imported.id);
    },
    [openProjectRoute],
  );
  const clearEditingReference = useCallback(() => setEditingReference(null), []);

  const {
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
    reloadProjectLists,
    handleExportBackup,
    handleImportBackup,
    importState,
    cancelImport,
  } = useProjectWorkspace({
    project,
    setProject,
    activeOwner,
    isSessionActive,
    recordHistorySnapshot,
    clearHistory,
    onBroadcastBlocksSync: broadcastBlocksSync,
    onBroadcastBlockUpdate: broadcastBlockUpdate,
    onEmptyWorkspace: handleEmptyWorkspace,
    onProjectImported: handleProjectImported,
    onReferenceUpdated: clearEditingReference,
    getDriveAccessToken: isAuthenticated && user ? getValidAccessToken : null,
  });

  const {
    driveSyncStatus,
    isSyncingDrive,
    handleSyncFromDrive,
    handleEnsureProjectSavedToDrive,
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
    onTrashStateChanged: reloadProjectLists,
  });

  const {
    isExportingPdf,
    isExportingDocx,
    isExportingProject,
    handleDownloadPdf,
    handleDownloadDocx,
    handleExportProjectZip,
    handleExportTypst,
  } = useDocumentExport({
    project,
    isAuthenticated,
    getValidAccessToken,
  });

  const handleResetSessionWorkspace = useCallback(() => {
    resetWorkspaceState();
    clearHistory();
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

  // Aviso do Beta no primeiro acesso: não modal, para não interromper a entrada.
  useEffect(() => {
    if (route !== 'docs' && isSessionActive && !isBetaNoticeDismissed()) {
      const timer = setTimeout(() => {
        if (!isBetaNoticeDismissed()) {
          setIsBetaToastVisible(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isSessionActive, route]);

  const showBackupNotice = !isAuthenticated && isBackupNoticeVisible;

  // Editor = URL com ?p=<id>; sem ele, a Home é a tela inicial
  const isEditorView = route === 'app' && Boolean(projectId);
  const isEditorReady = isEditorView && project.id === projectId;

  // Sincroniza o trabalho aberto com a URL (links diretos, voltar/avançar do navegador)
  useEffect(() => {
    if (!isSessionActive || !isStorageReady || !projectId || project.id === projectId) return;
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      handleSelectProject(target);
    } else {
      goHomeRoute({ replace: true });
      toast.info('Esse trabalho não está mais disponível.');
    }
  }, [isSessionActive, isStorageReady, projectId, project.id, projects, handleSelectProject, goHomeRoute]);

  const openProject = useCallback(
    (target: DocumentProject) => {
      handleSelectProject(target);
      openProjectRoute(target.id);
    },
    [handleSelectProject, openProjectRoute],
  );

  const goHome = useCallback(() => goHomeRoute(), [goHomeRoute]);

  const createAndOpenProject = useCallback(
    async (templateType: ProjectTemplateType, name?: string, universePackage?: string) => {
      const created = await handleCreateProject(templateType, name, universePackage);
      if (created) openProjectRoute(created.id);
    },
    [handleCreateProject, openProjectRoute],
  );

  const customTemplates = useCustomTemplates(activeOwner);

  const createFromCustomTemplate = useCallback(
    (template: { name: string; packageId: string }, name?: string) =>
      void createAndOpenProject(
        'universe_custom',
        name || uniqueProjectName(template.name, projects.map((p) => p.name)),
        template.packageId,
      ),
    [projects, createAndOpenProject],
  );

  const openImportPicker = useCallback(() => importInputRef.current?.click(), []);

  const handleDownloadFromHome = useCallback(
    async (target: DocumentProject) => {
      if (downloadingId) return;
      setDownloadingId(target.id);
      try {
        await downloadProjectPdf(target, { isAuthenticated, getValidAccessToken });
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, isAuthenticated, getValidAccessToken],
  );

  const handleDuplicateFromHome = useCallback(
    async (target: DocumentProject) => {
      const copy = await handleDuplicateProject(target.id, { activate: false });
      if (copy) toast.success(`Cópia criada: "${copy.name}".`);
    },
    [handleDuplicateProject],
  );

  const handleMoveToTrashFromHome = useCallback(
    async (target: DocumentProject) => {
      await handleMoveToTrash(target.id);
      toast.info(`"${target.name}" foi movido para a Lixeira.`, {
        action: {
          label: 'Desfazer',
          onClick: () => void handleRestoreFromTrash(target.id, { activate: false }),
        },
      });
    },
    [handleMoveToTrash, handleRestoreFromTrash],
  );

  const handleRestoreFromHome = useCallback(
    async (target: DocumentProject) => {
      await handleRestoreFromTrash(target.id, { activate: false });
      toast.success(`"${target.name}" voltou para Meus trabalhos.`);
    },
    [handleRestoreFromTrash],
  );

  const readinessReport = useMemo(() => {
    const caps = getTemplateCapabilities(project);
    const lint = runDocumentLinter(project, caps);
    return buildReadinessReport(project, caps, lint);
  }, [project]);

  const handleNavigateToChecklistTarget = useCallback(
    (target: ChecklistNavigationTarget) => {
      if (target.kind === 'customizer') {
        setIsCustomizerOpen(true);
        return;
      }

      if (target.kind === 'block') {
        if (isCompact) selectPane('editor');
        else if (!showEditor) toggleEditor();
      } else {
        if (isCompact) selectPane('sidebar');
        else if (!showSidebar) toggleSidebar();
      }

      const highlightAndFocus = (el: HTMLElement | null) => {
        if (!el) return;
        el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
        el.classList.add('ring-2', 'ring-brand-600', 'ring-offset-2');
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-brand-600', 'ring-offset-2');
        }, 2200);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (target.kind === 'block') {
            const el = document.querySelector<HTMLElement>(`[data-block-id="${target.blockId}"]`);
            highlightAndFocus(el);
          } else if (target.kind === 'sidebar-field') {
            const el = document.getElementById(target.elementId);
            highlightAndFocus(el);
          } else if (target.kind === 'references') {
            const el = target.referenceId
              ? document.querySelector<HTMLElement>(`[data-ref-id="${target.referenceId}"]`)
              : document.getElementById('sidebar-references');
            highlightAndFocus(el ?? document.getElementById('sidebar-references'));
          }
        });
      });
    },
    [isCompact, selectPane, showEditor, toggleEditor, showSidebar, toggleSidebar],
  );

  const handleResizerKeyDown = (pane: 'sidebar' | 'preview') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16;
    // Divisor da sidebar: seta para a direita alarga; divisor do PDF: seta para a esquerda alarga.
    const grow = pane === 'sidebar' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = pane === 'sidebar' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow) nudgePane(pane, step);
    else if (e.key === shrink) nudgePane(pane, -step);
    else if (e.key === 'Home') nudgePane(pane, -10000);
    else if (e.key === 'End') nudgePane(pane, 10000);
    else return;
    e.preventDefault();
  };

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
      />
    );
  }

  return (
    <div
      data-theme-compat
      className={`h-dvh flex flex-col bg-surface-sunken overflow-hidden ${
        resizingPane ? 'select-none cursor-col-resize' : ''
      }`}
    >
      {/* Alerta de Recomendação de Backup para Usuários sem Login */}
      {showBackupNotice && (
        <BackupNoticeBanner
          onLogin={handleLoginClick}
          onLoginDevMock={loginDevMock}
          isConfigured={isAuthConfigured}
          isLoading={isAuthLoading}
          onDismiss={() => {
            dismissBackupNotice();
            setIsBackupNoticeVisible(false);
          }}
        />
      )}

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
        isCompact={isCompact}
        showSidebar={showSidebar}
        showEditor={showEditor}
        showPreview={showPreview}
        onSelectPane={selectPane}
        hasProject={projects.length > 0}
        view={isEditorView ? 'editor' : 'home'}
        onGoHome={goHome}
        onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
        onOpenReadinessCheck={() => setIsReadinessCheckOpen(true)}
        readinessScore={readinessReport.scoreResult}
        onOpenBugReportModal={() => setIsBugReportOpen(true)}
        onOpenBetaNoticeModal={() => setIsBetaNoticeOpen(true)}
        onOpenWelcomeModal={() => {
          setWelcomeInitialTab('overview');
          setIsWelcomeModalOpen(true);
        }}
        onOpenFullDocs={() => handleOpenFullDocs()}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
        onDownloadDocx={handleDownloadDocx}
        isExportingDocx={isExportingDocx}
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
        showLoginButton={!showBackupNotice}
      />

      {!isEditorView ? (
        <HomePage
          projects={projects}
          trashedProjects={trashedProjects}
          lastOpenedProjectId={project.id}
          isStorageReady={isStorageReady}
          isAuthenticated={isAuthenticated}
          downloadingId={downloadingId}
          isSyncingDrive={isSyncingDrive}
          onSyncFromDrive={() => void handleSyncFromDrive(true)}
          onQuickCreate={(type, name) => void createAndOpenProject(type, name)}
          customTemplates={customTemplates.templates}
          onAddCustomTemplate={customTemplates.add}
          onRemoveCustomTemplate={(template) => {
            customTemplates.remove(template.id);
            toast.info(`Modelo "${template.name}" removido.`, {
              action: { label: 'Desfazer', onClick: () => customTemplates.restore(template) },
            });
          }}
          onCreateFromCustom={createFromCustomTemplate}
          onImport={openImportPicker}
          onOpen={openProject}
          onDownloadPdf={(p) => void handleDownloadFromHome(p)}
          onDuplicate={(p) => void handleDuplicateFromHome(p)}
          onRename={setRenameTarget}
          onShowStorage={setStorageTarget}
          onMoveToTrash={(p) => void handleMoveToTrashFromHome(p)}
          onRestore={(p) => void handleRestoreFromHome(p)}
          onDeleteForever={setDeleteTarget}
          onConnectGoogle={handleLoginClick}
        />
      ) : !isEditorReady ? (
        <main className="flex-1 flex items-center justify-center gap-2 text-sm text-fg-muted" aria-busy="true">
          <Loader2 className="w-4 h-4 animate-spin" />
          Abrindo trabalho…
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden min-h-0" aria-label="Área de trabalho">
          {/* Painel minimizado no desktop: barra fina para restaurar */}
          {!isCompact && !showSidebar && (
            <PaneRestoreRail
              side="left"
              label="Estrutura"
              icon={<PanelLeftOpen className="w-4 h-4" />}
              onRestore={toggleSidebar}
            />
          )}

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
                onOpenReadinessCheck={() => setIsReadinessCheckOpen(true)}
                readinessReport={readinessReport}
                onOpenAbntGuide={() => {
                  setWelcomeInitialTab('abnt');
                  setIsWelcomeModalOpen(true);
                }}
                onOpenGuide={(mode) => {
                  setWelcomeInitialTab(mode);
                  setIsWelcomeModalOpen(true);
                }}
                onMinimize={isCompact || (!showEditor && !showPreview) ? undefined : toggleSidebar}
                onMaximize={isCompact ? undefined : () => focusPane('sidebar')}
                onRestoreLayout={restoreAllPanes}
                isMaximized={!isCompact && !showEditor && !showPreview}
                isCompact={isCompact}
                widthPx={isCompact || (!showEditor && !showPreview) ? undefined : sidebarWidth}
              />
            </ErrorBoundary>
          )}

          {/* Divisor Redimensionável: Sidebar <-> Editor */}
          {!isCompact && showSidebar && (showEditor || showPreview) && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar barra lateral"
              aria-valuenow={sidebarWidth}
              aria-valuemin={MIN_SIDEBAR_WIDTH}
              aria-valuemax={sidebarMax}
              tabIndex={0}
              onKeyDown={handleResizerKeyDown('sidebar')}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                setResizingPane('sidebar');
              }}
              title="Arraste ou use as setas para redimensionar a barra lateral"
              className={`relative w-1.5 cursor-col-resize shrink-0 touch-none flex items-center justify-center transition-colors group before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-[''] focus-visible:bg-brand-500 ${
                resizingPane === 'sidebar'
                  ? 'bg-brand-500'
                  : 'bg-slate-200/60 dark:bg-slate-700/60 hover:bg-brand-500/60'
              }`}
            >
              <div className="w-0.5 h-8 rounded-full bg-slate-400/60 group-hover:bg-white" />
            </div>
          )}

          {!isCompact && !showEditor && (
            <PaneRestoreRail
              side="center"
              label="Texto"
              icon={<FileEdit className="w-4 h-4" />}
              onRestore={toggleEditor}
            />
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
                isFullWidth={isCompact || (!showSidebar && !showPreview)}
                isCompact={isCompact}
                activeCollaborators={activeCollaborators}
                onOpenReferenceModal={() => {
                  setEditingReference(null);
                  setIsModalOpen(true);
                }}
                onChangeBlocks={handleBlocksChange}
                onFocusBlock={broadcastCursor}
                onMinimize={isCompact || (!showSidebar && !showPreview) ? undefined : toggleEditor}
                onMaximize={isCompact ? undefined : () => focusPane('editor')}
                onRestoreLayout={restoreAllPanes}
                isMaximized={!isCompact && !showSidebar && !showPreview}
              />
            </ErrorBoundary>
          )}

          {/* Divisor Redimensionável: Editor <-> Preview PDF */}
          {!isCompact && showEditor && showPreview && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar painel do PDF"
              aria-valuenow={previewWidth}
              aria-valuemin={MIN_PREVIEW_WIDTH}
              aria-valuemax={previewMax}
              tabIndex={0}
              onKeyDown={handleResizerKeyDown('preview')}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                setResizingPane('preview');
              }}
              title="Arraste ou use as setas para redimensionar o painel do PDF"
              className={`relative w-1.5 cursor-col-resize shrink-0 touch-none flex items-center justify-center transition-colors group before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-[''] focus-visible:bg-brand-500 ${
                resizingPane === 'preview'
                  ? 'bg-brand-500'
                  : 'bg-slate-200/60 dark:bg-slate-700/60 hover:bg-brand-500/60'
              }`}
            >
              <div className="w-0.5 h-8 rounded-full bg-slate-400/60 group-hover:bg-white" />
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
                onDownloadDocx={handleDownloadDocx}
                isExportingDocx={isExportingDocx}
                onExportProjectZip={handleExportProjectZip}
                onExportTypst={handleExportTypst}
                isExportingProject={isExportingProject}
                widthPx={previewWidth}
                isFullWidth={isCompact || !showEditor}
                isCompact={isCompact}
                onMinimize={isCompact || (!showSidebar && !showEditor) ? undefined : togglePreview}
                onMaximize={isCompact ? undefined : () => focusPane('preview')}
                onRestoreLayout={restoreAllPanes}
                isMaximized={!isCompact && !showSidebar && !showEditor}
              />
            </ErrorBoundary>
          )}

          {!isCompact && !showPreview && (
            <PaneRestoreRail
              side="right"
              label="PDF"
              icon={<PanelRightOpen className="w-4 h-4" />}
              onRestore={togglePreview}
            />
          )}
        </main>
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

      {/* Importação (Home e diálogo de novo trabalho) */}
      <input
        ref={importInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportBackup(file);
          e.target.value = '';
        }}
      />
      {importState && <ImportProgressModal state={importState} onCancel={cancelImport} />}

      <RenameProjectDialog
        project={renameTarget}
        existingNames={projects.map((p) => p.name)}
        onClose={() => setRenameTarget(null)}
        onRename={(target, newName) => {
          void handleRenameProject(target.id, newName);
          setRenameTarget(null);
        }}
      />

      <StorageInfoDialog
        project={storageTarget}
        ownerLabel={isAuthenticated && user ? `conta ${user.email}` : 'perfil local'}
        isAuthenticated={isAuthenticated}
        onClose={() => setStorageTarget(null)}
        onExportBackup={handleExportBackup}
      />

      <DeleteForeverDialog
        project={deleteTarget}
        removesFromDrive={Boolean(
          isAuthenticated && deleteTarget?.driveFileId && !deleteTarget?.isSharedWithMe,
        )}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => {
          void handlePermanentDelete(target.id);
          setDeleteTarget(null);
          toast.info(`"${target.name}" foi excluído permanentemente.`);
        }}
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
        onOpenFullDocs={() => handleOpenFullDocs()}
      />

      <TemplateCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={project.templateConfig ?? DEFAULT_TEMPLATE_CONFIG}
        metadata={project.metadata}
        templateType={project.templateType}
        blocks={project.blocks}
        onApply={handleApplyTemplateCustomizer}
      />

      <ReadinessCheckModal
        isOpen={isReadinessCheckOpen}
        projectName={project.name}
        report={readinessReport}
        isExportingPdf={isExportingPdf}
        onClose={() => setIsReadinessCheckOpen(false)}
        onDownloadPdf={() => void handleDownloadPdf()}
        onNavigateToTarget={handleNavigateToChecklistTarget}
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

      {isBetaToastVisible && !isBetaNoticeOpen && (
        <BetaNoticeToast
          onLearnMore={() => setIsBetaNoticeOpen(true)}
          onDismiss={() => setIsBetaToastVisible(false)}
        />
      )}
    </div>
  );
};
