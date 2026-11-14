import React, { useState, useRef, useEffect } from 'react';
import {
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
  LogIn,
  LogOut,
  Settings,
  User,
  HardDrive,
  Loader2,
  BookOpen,
  PanelLeft,
} from 'lucide-react';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { CollaboratorPresence } from '@/core/collaboration/RealtimeCollabManager';
import { GITHUB_REPO_URL } from '@/core/links';
import type { PaneId } from '@/hooks/usePaneLayout';
import { Logo } from './Logo';
import { GitHubIcon } from './GitHubIcon';

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
  onToggleSidebar: () => void;
  onToggleEditor: () => void;
  onTogglePreview: () => void;
  onOpenProjectsModal: () => void;
  onOpenBugReportModal: () => void;
  onOpenBetaNoticeModal?: () => void;
  onOpenTemplateCustomizer?: () => void;
  onOpenWelcomeModal?: () => void;
  onOpenFullDocs?: () => void;
  onDownloadPdf?: () => void;
  isExportingPdf?: boolean;
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
  onOpenAccountSettings: () => void;
  isGuestMode?: boolean;
  onExitGuestMode?: () => void;
}

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
  onToggleSidebar,
  onToggleEditor,
  onTogglePreview,
  onOpenProjectsModal,
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
  onOpenAccountSettings,
  isGuestMode = false,
  onExitGuestMode,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paneSwitcher = (
    <div
      className={`flex items-center gap-0.5 sm:gap-1 ${
        isCompact
          ? 'w-full bg-neutral-100 dark:bg-neutral-800/80 rounded-lg p-0.5'
          : 'pl-1.5 border-l border-neutral-200 dark:border-neutral-800'
      }`}
      role={isCompact ? 'tablist' : undefined}
      aria-label="Painéis do workspace"
    >
      <button
        type="button"
        role={isCompact ? 'tab' : undefined}
        aria-selected={isCompact ? showSidebar : undefined}
        onClick={() => (isCompact && onSelectPane ? onSelectPane('sidebar') : onToggleSidebar())}
        className={`flex flex-1 sm:flex-none items-center justify-center gap-1 px-2 py-1.5 sm:py-0.5 rounded text-[11px] font-medium border transition-colors ${
          showSidebar
            ? isCompact
              ? 'bg-white dark:bg-neutral-900 border-transparent shadow-xs text-emerald-800 dark:text-emerald-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : isCompact
              ? 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
        title="Painel Estrutura"
      >
        <PanelLeft className="w-3.5 h-3.5" />
        <span>Estrutura</span>
      </button>

      <button
        type="button"
        role={isCompact ? 'tab' : undefined}
        aria-selected={isCompact ? showEditor : undefined}
        onClick={() => (isCompact && onSelectPane ? onSelectPane('editor') : onToggleEditor())}
        className={`flex flex-1 sm:flex-none items-center justify-center gap-1 px-2 py-1.5 sm:py-0.5 rounded text-[11px] font-medium border transition-colors ${
          showEditor
            ? isCompact
              ? 'bg-white dark:bg-neutral-900 border-transparent shadow-xs text-emerald-800 dark:text-emerald-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : isCompact
              ? 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
        title="Painel Texto"
      >
        <FileEdit className="w-3.5 h-3.5" />
        <span>Texto</span>
      </button>

      <button
        type="button"
        role={isCompact ? 'tab' : undefined}
        aria-selected={isCompact ? showPreview : undefined}
        onClick={() => (isCompact && onSelectPane ? onSelectPane('preview') : onTogglePreview())}
        className={`flex flex-1 sm:flex-none items-center justify-center gap-1 px-2 py-1.5 sm:py-0.5 rounded text-[11px] font-medium border transition-colors ${
          showPreview
            ? isCompact
              ? 'bg-white dark:bg-neutral-900 border-transparent shadow-xs text-emerald-800 dark:text-emerald-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : isCompact
              ? 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
        title="Painel PDF"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>PDF</span>
      </button>
    </div>
  );

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30 transition-colors">
      <div className="h-12 sm:h-14 px-2 sm:px-3 flex items-center justify-between gap-2">
      {/* Lado Esquerdo: Marca, Projeto e Navegação de Abas */}
      <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
        <Logo size="sm" onBetaClick={onOpenBetaNoticeModal} />

        <span className="text-neutral-300 dark:text-neutral-700 hidden md:inline">/</span>

        {/* Seletor de Projetos */}
        <button
          onClick={onOpenProjectsModal}
          className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors min-w-0 max-w-[140px] sm:max-w-[160px] lg:max-w-xs"
          title="Alternar ou criar trabalho acadêmico"
        >
          <FolderOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate hidden md:inline">{projectName}</span>
          <span className="text-[10px] bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1 rounded-full shrink-0 hidden md:inline">
            {projectsCount}
          </span>
          <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
        </button>

        {/* Botões Desfazer / Refazer */}
        <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Desfazer alteração (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Refazer alteração (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alternadores de painéis — desktop inline */}
        {!isCompact && paneSwitcher}
      </div>

      {/* Lado Direito: Ações Principais e Perfil */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Status de Sincronização Local / Nuvem */}
        <div className="hidden lg:flex items-center mr-1">
          {driveSyncStatus === 'syncing' || saveStatus === 'saving' ? (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sincronizando...</span>
            </div>
          ) : driveSyncStatus === 'synced' ? (
            <div
              className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 cursor-default"
              title="Salvo com segurança no seu Google Drive"
            >
              <CloudCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Salvo no Drive</span>
            </div>
          ) : driveSyncStatus === 'error' ? (
            <button
              onClick={onLogin}
              className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
              title="Sessão do Drive expirada. Clique para reconectar sua conta Google."
            >
              <Cloud className="w-3 h-3 text-amber-600" />
              <span>Reconectar Drive</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 px-2 py-0.5 cursor-default"
              title="Salvo apenas neste navegador."
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span className="hidden xl:inline">Salvo local</span>
            </div>
          )}
        </div>

        {/* Presença de Colaboradores em Tempo Real (Nível 3 P2P) */}
        {activeCollaborators.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-200"
            title={`${activeCollaborators.length} colaborador(es) editando ao vivo agora`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex items-center -space-x-1.5">
              {activeCollaborators.slice(0, 3).map((c) => (
                <div
                  key={c.peerId}
                  title={`${c.user.name} (${c.user.email}): Online agora`}
                  className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-neutral-900 overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-700 dark:text-neutral-200 shrink-0"
                >
                  {c.user.picture ? (
                    <img
                      src={c.user.picture}
                      alt={c.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    c.user.name.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 hidden md:inline">
              {activeCollaborators.length === 1
                ? '1 online'
                : `${activeCollaborators.length} online`}
            </span>
          </div>
        )}

        {/* Botão Compartilhar */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          title="Compartilhar projeto via e-mail do Google"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
          <span className="hidden md:inline">Compartilhar</span>
        </button>

        {/* Botão Relatar Problema (Direto) */}
        <button
          type="button"
          onClick={onOpenBugReportModal}
          className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-colors"
          title="Relatar problema ou sugestão"
        >
          <Bug className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
          <span className="hidden md:inline">Relatar Problema</span>
        </button>

        {/* Separador */}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

        {/* Perfil do Usuário / Login */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1 p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={`Conectado como ${user.name}`}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Dropdown do Usuário */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="px-3.5 py-2">
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {user.email}
                  </p>
                </div>

                <div className="py-1">
                  {/* Alternador de Modo Claro / Escuro dentro do perfil */}
                  <button
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {darkMode ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <span>Aparência</span>
                    </div>
                    <span className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">
                      {darkMode ? 'Escuro' : 'Claro'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAccountSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Configurações da Conta</span>
                  </button>

                  <a
                    href="/docs"
                    onClick={(e) => {
                      setIsUserMenuOpen(false);
                      if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault();
                        onOpenFullDocs();
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Documentação (/docs)</span>
                  </a>

                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <GitHubIcon className="w-3.5 h-3.5 text-neutral-500" />
                    <span>GitHub (Código Aberto)</span>
                  </a>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sair da Conta Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Botão rápido para conectar com Google */}
            <button
              onClick={onLogin}
              disabled={isAuthLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-700 shadow-xs transition-all"
              title="Conectar com conta Google para sincronizar e colaborar"
            >
              {isAuthLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">Entrar</span>
            </button>

            {/* Menu Perfil Local */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 transition-colors text-neutral-800 dark:text-neutral-200"
                title={isGuestMode ? "Sessão Local Ativa (Navegador)" : "Sessão Local (Navegador)"}
              >
                <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-[10px] font-bold">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium hidden sm:inline">Perfil Local</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-neutral-100 dark:divide-neutral-800">
                  <div className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate">
                          Perfil Local
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Salvo neste dispositivo
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-lg">
                      Seus trabalhos locais ficam salvos isolados. Ao sair, outro colega pode logar com a conta dele sem acessar seus arquivos.
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={onToggleDarkMode}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {darkMode ? (
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-neutral-500" />
                        )}
                        <span>Aparência</span>
                      </div>
                      <span className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">
                        {darkMode ? 'Escuro' : 'Claro'}
                      </span>
                    </button>

                    <a
                      href="/docs"
                      onClick={(e) => {
                        setIsUserMenuOpen(false);
                        if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          e.preventDefault();
                          onOpenFullDocs();
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Documentação (/docs)</span>
                    </a>

                    <a
                      href={GITHUB_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      <GitHubIcon className="w-3.5 h-3.5 text-neutral-500" />
                      <span>GitHub (Código Aberto)</span>
                    </a>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onExitGuestMode?.();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
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

      {/* Segunda linha no compacto: abas Estrutura | Texto | PDF em largura total */}
      {isCompact && (
        <div className="px-2 pb-2 pt-0">{paneSwitcher}</div>
      )}
    </header>
  );
};
