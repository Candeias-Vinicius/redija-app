import React, { useState, useEffect, useCallback } from 'react';
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
import { ImportTemplateConfirmModal } from '@/components/ImportTemplateConfirmModal';
import { BackupNoticeBanner } from '@/components/BackupNoticeBanner';
import { LoginScreen } from '@/components/LoginScreen';
import { DocsPage } from '@/components/docs/DocsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGoogleAuth } from '@/core/auth/GoogleAuthContext';
import { isBetaNoticeDismissed } from '@/core/version';
import { AcademicReference, DEFAULT_TEMPLATE_CONFIG, DocumentProject } from '@/types/document';
import { type ContextualGuideMode } from '@/core/templates/templateCapabilities';
import { useAppRoute } from '@/hooks/useAppRoute';
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
    handleExportBackup,
    handleImportBackup,
    pendingImportProject,
    importFileName,
    handleConfirmImport,
    handleCancelImport,
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
                onFocusBlock={broadcastCursor}
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

      <ImportTemplateConfirmModal
        isOpen={Boolean(pendingImportProject)}
        importedProject={pendingImportProject}
        fileName={importFileName}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
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
    </div>
  );
};
