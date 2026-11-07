import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Code2,
  CheckCircle2,
  Loader2,
  FolderOpen,
  ChevronDown,
  HelpCircle,
  Sliders,
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
} from 'lucide-react';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';

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
  showSidebar: boolean;
  showEditor: boolean;
  showPreview: boolean;
  onToggleSidebar: () => void;
  onToggleEditor: () => void;
  onTogglePreview: () => void;
  onOpenProjectsModal: () => void;
  onOpenTemplateCustomizer: () => void;
  onOpenBugReportModal: () => void;
  onOpenWelcomeModal: () => void;
  onDownloadPdf: () => void;
  isExportingPdf: boolean;
  onExportTypst: () => void;
  showCode: boolean;
  setShowCode: (val: boolean) => void;
  // Google Auth & Collab
  user: GoogleUserProfile | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenShareModal: () => void;
  onOpenAccountSettings: () => void;
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
  showSidebar,
  showEditor,
  showPreview,
  onToggleSidebar,
  onToggleEditor,
  onTogglePreview,
  onOpenProjectsModal,
  onOpenTemplateCustomizer,
  onOpenBugReportModal,
  onOpenWelcomeModal,
  onDownloadPdf,
  isExportingPdf,
  showCode,
  setShowCode,
  user,
  isAuthenticated,
  isAuthLoading,
  onLogin,
  onLogout,
  onOpenShareModal,
  onOpenAccountSettings,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setIsOptionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Lado Esquerdo: Marca, Projeto e Navegação de Abas */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            R
          </div>
          <span className="font-bold text-sm text-neutral-900 dark:text-white tracking-tight hidden sm:inline">
            Redija
          </span>
          <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.2 rounded uppercase tracking-wider hidden sm:inline">
            ABNT
          </span>
        </div>

        <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">/</span>

        {/* Seletor de Projetos */}
        <button
          onClick={onOpenProjectsModal}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors min-w-0 max-w-[200px] lg:max-w-xs"
          title="Alternar ou criar trabalho acadêmico"
        >
          <FolderOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{projectName}</span>
          <span className="text-[10px] bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1 rounded-full shrink-0">
            {projectsCount}
          </span>
          <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
        </button>

        {/* Botões Desfazer / Refazer (Ctrl+Z / Ctrl+Y) */}
        <div className="hidden md:flex items-center gap-0.5 pl-1.5 border-l border-neutral-200 dark:border-neutral-800">
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

        {/* Alternadores de Abas Visíveis */}
        <div className="hidden xl:flex items-center gap-1 pl-1.5 border-l border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              showSidebar
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
            title="Alternar aba Estrutura"
          >
            <span>Estrutura</span>
          </button>

          <button
            type="button"
            onClick={onToggleEditor}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              showEditor
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
            title="Alternar aba Texto"
          >
            <FileEdit className="w-3 h-3" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            onClick={onTogglePreview}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              showPreview
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
            title="Alternar aba PDF"
          >
            <Eye className="w-3 h-3" />
            <span>PDF</span>
          </button>
        </div>
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
            <div
              className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 cursor-default"
              title="Salvo localmente. Não foi possível sincronizar com o Drive no momento."
            >
              <Cloud className="w-3 h-3 text-amber-600" />
              <span>Salvo local</span>
            </div>
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

        {/* Botão Compartilhar */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          title="Compartilhar projeto via e-mail do Google"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>

        {/* Menu Dropdown de Opções (Agrupa Norma & Layout, Ver Typst, Guia ABNT, Relatar Problema) */}
        <div className="relative" ref={optionsMenuRef}>
          <button
            onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title="Normas, visualização e opções do documento"
          >
            <Sliders className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Opções</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isOptionsMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onOpenTemplateCustomizer();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Norma & Layout</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      ABNT, APA, margens, fontes e brasão
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    setShowCode(!showCode);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Code2 className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {showCode ? 'Ocultar Typst' : 'Ver Código Typst'}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Código-fonte gerado em tempo real
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onOpenWelcomeModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Guia de Normas ABNT</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      NBR 14724, 10520 e 6023 atendidas
                    </p>
                  </div>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onOpenBugReportModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-colors text-left"
                >
                  <Bug className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Relatar problema ou sugestão</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Destaque CTA: Baixar PDF */}
        <button
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-xs transition-colors shrink-0"
          title="Compilar e baixar o PDF final nas normas ABNT"
        >
          {isExportingPdf ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </>
          )}
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
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white rounded-lg transition-colors"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onLogin}
              disabled={isAuthLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-700 shadow-xs transition-all"
              title="Conectar com conta Google"
            >
              {isAuthLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">Entrar com Google</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
