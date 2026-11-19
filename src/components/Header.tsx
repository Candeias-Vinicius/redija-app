import React, { useState, useRef, useEffect, useId } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FolderOpen,
  ChevronDown,
  Moon,
  Sun,
  Undo2,
  Redo2,
  Bug,
  FileEdit,
  Eye,
  CloudCheck,
  Cloud,
  Share2,
  LogOut,
  Settings,
  User,
  HardDrive,
  Loader2,
  BookOpen,
  PanelLeft,
  Target,
} from 'lucide-react';
import { type WritingGoalStatus } from '@/core/goals/writingGoals';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { CollaboratorPresence } from '@/core/collaboration/RealtimeCollabManager';
import { GITHUB_REPO_URL } from '@/core/links';
import type { PaneId } from '@/hooks/usePaneLayout';
import { Logo } from './Logo';
import { GitHubIcon } from './GitHubIcon';
import { GoogleLogo } from './GoogleLogo';
import { InfoTooltip } from './ui/InfoTooltip';

interface HeaderProps {
  projectName: string;
  projectsCount: number;
  saveStatus: 'saved' | 'saving';
  driveSyncStatus?: 'synced' | 'syncing' | 'local' | 'error';
  darkMode: boolean;
  onToggleDarkMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isCompact?: boolean;
  showSidebar: boolean;
  showEditor: boolean;
  showPreview: boolean;
  onSelectPane?: (pane: PaneId) => void;
  /** Há um trabalho aberto (abas de painel e histórico só fazem sentido com projeto). */
  hasProject?: boolean;
  /** "home": lista de trabalhos (com busca); "editor": trabalho aberto. */
  view?: 'home' | 'editor';
  /** Volta do editor para a Home. */
  onGoHome?: () => void;
  /** Campo de busca exibido no header da Home. */
  homeSearch?: React.ReactNode;
  onOpenBugReportModal: () => void;
  onOpenBetaNoticeModal?: () => void;
  onOpenTemplateCustomizer?: () => void;
  onOpenWelcomeModal?: () => void;
  onOpenFullDocs?: () => void;
  onDownloadPdf?: () => void;
  isExportingPdf?: boolean;
  onDownloadDocx?: () => void;
  isExportingDocx?: boolean;
  onExportTypst?: () => void;
  onExportProjectZip?: () => void;
  isExportingProject?: boolean;
  showCode?: boolean;
  setShowCode?: (val: boolean) => void;
  // Google Auth & Collab
  user: GoogleUserProfile | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  activeCollaborators?: CollaboratorPresence[];
  onLogin: () => void;
  onLogout: () => void;
  onOpenShareModal: () => void;
  onOpenGoalsModal?: () => void;
  goalStatus?: WritingGoalStatus;
  onOpenAccountSettings: () => void;
  isGuestMode?: boolean;
  onExitGuestMode?: () => void;
  /** Exibe o botão "Entrar" (oculto enquanto o aviso de backup já oferece o login). */
  showLoginButton?: boolean;
}

type PaneTab = { id: PaneId; label: string; icon: React.ReactNode; active: boolean };

const ICON_BUTTON =
  'touch-target flex items-center justify-center p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-sunken transition-colors';

const MENU_ITEM =
  'w-full flex items-center gap-2 px-3.5 py-2 touch-target text-slate-700 dark:text-slate-200 hover:bg-surface-sunken transition-colors text-left';

export const Header: React.FC<HeaderProps> = ({
  projectName,
  projectsCount,
  saveStatus,
  driveSyncStatus = 'local',
  darkMode,
  onToggleDarkMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isCompact = false,
  showSidebar,
  showEditor,
  showPreview,
  onSelectPane,
  hasProject = true,
  view = 'editor',
  onGoHome,
  homeSearch,
  onOpenBugReportModal,
  onOpenBetaNoticeModal,
  onOpenFullDocs,
  user,
  isAuthenticated,
  isAuthLoading,
  activeCollaborators = [],
  onLogin,
  onLogout,
  onOpenShareModal,
  onOpenGoalsModal,
  goalStatus,
  onOpenAccountSettings,
  isGuestMode = false,
  onExitGuestMode,
  showLoginButton = true,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuId = useId();

  // Fecha o menu ao clicar fora ou com Esc (devolvendo o foco ao botão)
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        userMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const paneTabs: PaneTab[] = [
    {
      id: 'sidebar',
      label: 'Estrutura',
      icon: <PanelLeft className="w-3.5 h-3.5" />,
      active: showSidebar,
    },
    {
      id: 'editor',
      label: 'Texto',
      icon: <FileEdit className="w-3.5 h-3.5" />,
      active: showEditor,
    },
    {
      id: 'preview',
      label: 'PDF',
      icon: <Eye className="w-3.5 h-3.5" />,
      active: showPreview,
    },
  ];

  const handlePaneTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSelectPane) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const currentIndex = paneTabs.findIndex((tab) => tab.active);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = paneTabs[(currentIndex + delta + paneTabs.length) % paneTabs.length];
    onSelectPane(next.id);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
    buttons[paneTabs.indexOf(next)]?.focus();
    event.preventDefault();
  };

  const paneSwitcher = (
    <div
      className="flex-1 flex items-center gap-0.5 sm:gap-1 bg-surface-sunken rounded-lg p-0.5"
      role="tablist"
      aria-label="Painéis do workspace"
      onKeyDown={handlePaneTabsKeyDown}
    >
      {paneTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.active}
          tabIndex={tab.active ? undefined : -1}
          onClick={() => onSelectPane?.(tab.id)}
          className={`touch-target flex flex-1 sm:flex-none items-center justify-center gap-1 px-2 py-1.5 sm:py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
            tab.active
              ? 'bg-surface border-transparent shadow-xs text-brand-800 dark:text-brand-300'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const undoRedo = (
    <div
      className={`flex items-center gap-0.5 ${isCompact ? '' : 'pl-1 border-l border-line'}`}
      role="group"
      aria-label="Histórico de edição"
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={`${ICON_BUTTON} disabled:opacity-30 disabled:pointer-events-none`}
        title="Desfazer alteração (Ctrl+Z)"
        aria-label="Desfazer alteração"
        aria-keyshortcuts="Control+Z"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className={`${ICON_BUTTON} disabled:opacity-30 disabled:pointer-events-none`}
        title="Refazer alteração (Ctrl+Y)"
        aria-label="Refazer alteração"
        aria-keyshortcuts="Control+Y"
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );

  // Status de salvamento: visível em todas as larguras (texto a partir de xl)
  const isSaving = driveSyncStatus === 'syncing' || saveStatus === 'saving';
  const statusText = isSaving
    ? 'Salvando alterações…'
    : driveSyncStatus === 'synced'
      ? 'Salvo no Google Drive'
      : driveSyncStatus === 'error'
        ? 'Sessão do Drive expirada: reconecte sua conta Google'
        : 'Salvo neste navegador';

  const saveStatusIndicator = (
    <div className="flex items-center">
      <span role="status" aria-live="polite" className="sr-only">
        {statusText}
      </span>
      {isSaving ? (
        <div
          className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/60"
          title={statusText}
          aria-hidden="true"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden xl:inline">Salvando…</span>
        </div>
      ) : driveSyncStatus === 'synced' ? (
        <div
          className="flex items-center gap-1 text-xs text-brand-800 dark:text-brand-300 px-1.5 py-1"
          title={statusText}
          aria-hidden="true"
        >
          <CloudCheck className="w-4 h-4 text-brand-700 dark:text-brand-400" />
          <span className="hidden xl:inline">Salvo no Drive</span>
        </div>
      ) : driveSyncStatus === 'error' ? (
        <button
          type="button"
          onClick={onLogin}
          className="touch-target flex items-center gap-1 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-1 rounded-full border border-amber-300 dark:border-amber-800 transition-colors"
          title={statusText}
        >
          <Cloud className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span className="hidden md:inline">Reconectar Drive</span>
          <span className="sr-only md:hidden">Reconectar Drive</span>
        </button>
      ) : (
        <div
          className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 px-1.5 py-1"
          title={statusText}
          aria-hidden="true"
        >
          <CheckCircle2 className="w-4 h-4 text-brand-700 dark:text-brand-400" />
          <span className="hidden xl:inline">Salvo local</span>
        </div>
      )}
    </div>
  );

  const appearanceItem = (
    <button type="button" onClick={onToggleDarkMode} className={`${MENU_ITEM} justify-between`}>
      <span className="flex items-center gap-2">
        {darkMode ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : (
          <Moon className="w-4 h-4 text-slate-500" />
        )}
        <span>Aparência</span>
      </span>
      <span className="text-xs font-medium bg-surface-sunken text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
        {darkMode ? 'Escuro' : 'Claro'}
      </span>
    </button>
  );

  const docsItems = (
    <>
      <a
        href="/docs"
        onClick={(e) => {
          setIsUserMenuOpen(false);
          if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            onOpenFullDocs();
          }
        }}
        className={MENU_ITEM}
      >
        <BookOpen className="w-4 h-4 text-brand-700 dark:text-brand-400" />
        <span>Documentação</span>
      </a>
      <button
        type="button"
        onClick={() => {
          setIsUserMenuOpen(false);
          onOpenBugReportModal();
        }}
        className={MENU_ITEM}
      >
        <Bug className="w-4 h-4 text-slate-500" />
        <span>Relatar problema ou sugestão</span>
      </button>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setIsUserMenuOpen(false)}
        className={MENU_ITEM}
      >
        <GitHubIcon className="w-4 h-4 text-slate-500" />
        <span>GitHub (Código Aberto)</span>
      </a>
    </>
  );

  const menuPanelClass =
    'absolute right-0 mt-2 rounded-xl bg-surface shadow-xl border border-line py-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-700';

  return (
    <header className="border-b border-line bg-surface sticky top-0 z-30 transition-colors">
      <div className="h-12 sm:h-14 px-2 sm:px-3 flex items-center justify-between gap-2">
        {/* Lado Esquerdo: Marca, Projeto e Navegação de Painéis */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
          <Logo
            size="sm"
            onBetaClick={onOpenBetaNoticeModal}
            className="shrink-0"
            wordmarkClassName="hidden sm:flex"
            betaBadgeClassName="hidden md:inline-flex"
          />

          {view === 'home' ? (
            homeSearch
          ) : (
            <>
              {/* Voltar para a Home + nome do trabalho aberto */}
              <button
                type="button"
                onClick={onGoHome}
                className="touch-target flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-md hover:bg-surface-sunken text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                title={`Voltar para Meus trabalhos (${projectsCount})`}
                aria-label="Voltar para Meus trabalhos"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">Meus trabalhos</span>
              </button>
              <span className="text-slate-300 dark:text-slate-600 hidden lg:inline" aria-hidden="true">
                /
              </span>
              <p
                className="min-w-0 flex items-center gap-1.5 text-sm font-medium text-fg"
                title={projectName}
              >
                <FolderOpen className="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0 hidden sm:block" aria-hidden="true" />
                <span className="truncate">{projectName}</span>
              </p>
            </>
          )}

          {!isCompact && hasProject && view === 'editor' && undoRedo}
        </div>

        {/* Lado Direito: Status, Ações e Perfil */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {saveStatusIndicator}

          {/* Presença de Colaboradores em Tempo Real (Nível 3 P2P) */}
          {activeCollaborators.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 animate-in fade-in duration-200"
              title={`${activeCollaborators.length} colaborador(es) editando ao vivo agora`}
              role="status"
              aria-label={`${activeCollaborators.length} colaborador(es) online`}
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              <div className="flex items-center -space-x-1.5">
                {activeCollaborators.slice(0, 3).map((c) => (
                  <div
                    key={c.peerId}
                    title={`${c.user.name} (${c.user.email}): Online agora`}
                    className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-slate-900 overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0"
                  >
                    {c.user.picture ? (
                      <img src={c.user.picture} alt={c.user.name} className="w-full h-full object-cover" />
                    ) : (
                      c.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-brand-800 dark:text-brand-300 hidden md:inline">
                {activeCollaborators.length} online
              </span>
            </div>
          )}

          {/* Prazos e Metas (RDJ-06: só no editor) */}
          {view === 'editor' && onOpenGoalsModal && (
            <button
              type="button"
              onClick={onOpenGoalsModal}
              className={`touch-target flex items-center justify-center gap-1.5 p-1.5 md:px-2.5 text-sm font-medium rounded-lg border transition-colors ${
                goalStatus?.state === 'today_reached' || goalStatus?.state === 'total_reached'
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60'
                  : goalStatus?.state === 'deadline_passed'
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100/80'
                    : 'border-line bg-surface text-slate-700 dark:text-slate-200 hover:bg-surface-sunken'
              }`}
              title={goalStatus?.statusMessage ?? 'Abrir painel de prazos e metas de escrita'}
              aria-label="Abrir painel de prazos e metas"
            >
              <Target className="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">
                {goalStatus?.state === 'today_reached'
                  ? 'Meta concluída'
                  : goalStatus?.state === 'total_reached'
                    ? 'Meta total atingida'
                    : goalStatus?.state === 'deadline_passed'
                      ? 'Prazo encerrado'
                      : goalStatus?.state === 'in_progress' && goalStatus.dailyTarget
                        ? `${Math.max(0, goalStatus.todayNetWords).toLocaleString('pt-BR')}/${goalStatus.dailyTarget.toLocaleString('pt-BR')}`
                        : 'Metas'}
              </span>
            </button>
          )}

          {/* Compartilhar (ação do trabalho aberto: só no editor) */}
          {view === 'editor' && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="touch-target flex items-center justify-center gap-1.5 p-1.5 md:px-2.5 text-sm font-medium rounded-lg border border-line bg-surface text-slate-700 dark:text-slate-200 hover:bg-surface-sunken transition-colors"
            title="Compartilhar projeto via e-mail do Google"
            aria-label="Compartilhar trabalho"
          >
            <Share2 className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="hidden md:inline">Compartilhar</span>
          </button>
          )}

          {/* Perfil do Usuário / Login (o menu também traz Ajuda: documentação e relatar problema) */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                ref={userMenuButtonRef}
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="touch-target flex items-center justify-center gap-1 p-0.5 rounded-full hover:bg-surface-sunken transition-colors"
                title={`Conectado como ${user.name}`}
                aria-label={`Menu da conta de ${user.name}`}
                aria-expanded={isUserMenuOpen}
                aria-controls={userMenuId}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-7 h-7 rounded-full border border-line shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isUserMenuOpen && (
                <div id={userMenuId} className={`${menuPanelClass} w-64`}>
                  <div className="px-3.5 py-2">
                    <p className="font-semibold text-fg truncate">{user.name}</p>
                    <p className="text-xs text-fg-muted truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    {appearanceItem}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAccountSettings();
                      }}
                      className={MENU_ITEM}
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Configurações da Conta</span>
                    </button>
                    {docsItems}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className={`${MENU_ITEM} !text-red-700 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/40`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair da Conta Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {showLoginButton && (
                // Botão no padrão visual do Google (cores e "G" oficiais) para deixar claro
                // que a conexão é com a conta Google; no celular fica só o "G".
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isAuthLoading}
                  className="touch-target flex items-center justify-center gap-2 p-1.5 sm:px-3 sm:py-1.5 text-sm font-medium rounded-full border border-[#747775] bg-[#ffffff] text-[#1f1f1f] hover:bg-[#f8f9fa] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f20] disabled:opacity-60 transition-colors"
                  title="Conectar sua conta Google para salvar no Drive e colaborar"
                  aria-label="Conectar com a conta Google"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
                  ) : (
                    <GoogleLogo />
                  )}
                  <span className="hidden sm:inline">Conectar</span>
                </button>
              )}

              {/* Menu Perfil Local */}
              <div className="relative" ref={userMenuRef}>
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="touch-target flex items-center justify-center gap-1.5 px-2 py-1 rounded-full border border-line bg-surface-sunken hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-fg"
                  title={isGuestMode ? 'Sessão Local Ativa (Navegador)' : 'Sessão Local (Navegador)'}
                  aria-label="Menu do perfil local"
                  aria-expanded={isUserMenuOpen}
                  aria-controls={userMenuId}
                >
                  <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isUserMenuOpen && (
                  <div id={userMenuId} className={`${menuPanelClass} w-72`}>
                    <div className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center shrink-0">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-fg truncate">Perfil Local</p>
                          <p className="text-xs text-fg-muted flex items-center gap-1">
                            <span>Salvo neste dispositivo</span>
                            <InfoTooltip
                              label="Sobre o perfil local"
                              align="end"
                              text="Seus trabalhos locais ficam salvos isolados. Ao sair, outro colega pode logar com a conta dele sem acessar seus arquivos."
                            />
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      {!showLoginButton && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogin();
                          }}
                          className={MENU_ITEM}
                        >
                          <GoogleLogo />
                          <span>Conectar conta Google</span>
                        </button>
                      )}
                      {appearanceItem}
                      {docsItems}
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onExitGuestMode?.();
                        }}
                        className={`${MENU_ITEM} font-medium !text-red-700 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/40`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair do Perfil Local</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segunda linha no compacto: abas Estrutura | Texto | PDF e histórico de edição */}
      {isCompact && hasProject && view === 'editor' && (
        <div className="px-2 pb-2 pt-0 flex items-center gap-1.5">
          {paneSwitcher}
          {undoRedo}
        </div>
      )}
    </header>
  );
};
