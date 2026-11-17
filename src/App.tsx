import React, { useState, useEffect, useCallback } from 'react';
import { FileEdit, FolderOpen, PanelLeftOpen, PanelRightOpen, Plus, Upload } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { ProjectsModal } from '@/components/ProjectsModal';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TemplateCustomizerModal } from '@/components/TemplateCustomizerModal';
import { BugReportModal } from '@/components/BugReportModal';
import { BetaNoticeModal, BetaNoticeToast } from '@/components/BetaNoticeModal';
import { ShareModal } from '@/components/ShareModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { DocsPage } from '@/components/docs/DocsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PaneRestoreRail } from '@/components/ui/PaneRestoreRail';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import { isBetaNoticeDismissed } from '@/core/version';
import { dismissBackupNotice, isBackupNoticeDismissed } from '@/core/backupNotice';
import { AcademicReference, DEFAULT_TEMPLATE_CONFIG, DocumentProject } from '@/types/document';
import { type ContextualGuideMode } from '@/core/templates/templateCapabilities';
import { useAppRoute } from '@/hooks/useAppRoute';
import { MIN_PREVIEW_WIDTH, MIN_SIDEBAR_WIDTH, usePaneLayout } from '@/hooks/usePaneLayout';
import { useUndoRedoHistory } from '@/hooks/useUndoRedoHistory';
import { useRealtimeCollab } from '@/hooks/useRealtimeCollab';
import {
  FALLBACK_INITIAL_PROJECT,
  useProjectWorkspace,
} from '@/hooks/useProjectWorkspace';
import { useDriveSyncOrchestrator } from '@/hooks/useDriveSyncOrchestrator';
import { useDocumentExport } from '@/hooks/useDocumentExport';
import { readInitialGuestMode, useAuthSession } from '@/hooks/useAuthSession';

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
  const { route, sectionId, navigateTo } = useAppRoute();
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

  const openProjectsModal = useCallback(() => setIsProjectsModalOpen(true), []);
  const closeProjectsModal = useCallback(() => setIsProjectsModalOpen(false), []);
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
  } = useProjectWorkspace({
    project,
    setProject,
    activeOwner,
    isSessionActive,
    recordHistorySnapshot,
    clearHistory,
    onBroadcastBlocksSync: broadcastBlocksSync,
    onBroadcastBlockUpdate: broadcastBlockUpdate,
    onEmptyWorkspace: openProjectsModal,
    onProjectImported: closeProjectsModal,
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
    isExportingProject,
    handleDownloadPdf,
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

  // Aviso do Beta no primeiro acesso: não modal e somente depois que o modal de
  // projetos fechou, para não empilhar interrupções na entrada.
  useEffect(() => {
    if (route !== 'docs' && isSessionActive && !isProjectsModalOpen && !isBetaNoticeDismissed()) {
      const timer = setTimeout(() => {
        if (!isBetaNoticeDismissed()) {
          setIsBetaToastVisible(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isSessionActive, route, isProjectsModalOpen]);

  const showBackupNotice = !isAuthenticated && isBackupNoticeVisible;

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
        onOpenProjectsModal={openProjectsModal}
        onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
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
        onLogin={handleLoginClick}
        onLogout={handleLogout}
        isGuestMode={isGuestMode}
        onExitGuestMode={handleExitGuestMode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        showLoginButton={!showBackupNotice}
      />

      {projects.length === 0 ? (
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-muted text-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center mb-4 shadow-xs">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Nenhum trabalho criado ainda
          </h2>
          <p className="text-sm text-fg-muted max-w-sm mb-6 leading-relaxed">
            Comece escolhendo um modelo com estrutura ABNT pré-configurada ou importe um arquivo existente.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-sm sm:max-w-none">
            <button
              onClick={openProjectsModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Trabalho</span>
            </button>
            <button
              onClick={openProjectsModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4 text-brand-700" />
              <span>Importar Trabalho</span>
            </button>
          </div>
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
