import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Code2,
  FileDown,
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
  PanelLeft,
  FileEdit,
  Eye,
  Cloud,
  CloudCheck,
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
  onExportTypst,
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
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu de usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-900 tracking-tight">Redija</span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                ABNT
              </span>
            </div>
          </div>
        </div>

        <span className="text-neutral-300">/</span>

        <button
          onClick={onOpenProjectsModal}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-100 text-sm font-medium text-neutral-700 transition-colors"
          title="Alternar ou criar trabalho acadêmico"
        >
          <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="max-w-xs truncate">{projectName}</span>
          <span className="text-[10px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded-full">
            {projectsCount}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        {/* Botões Desfazer / Refazer (Ctrl+Z / Ctrl+Y) */}
        <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Desfazer alteração no documento (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Refazer alteração no documento (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Alternadores de Abas Visíveis (Minimizar / Restaurar qualquer aba) */}
        <div className="hidden lg:flex items-center gap-1 ml-1 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showSidebar
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showSidebar ? 'Minimizar aba Estrutura & Referências' : 'Mostrar aba Estrutura & Referências'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span>Estrutura</span>
          </button>

          <button
            type="button"
            onClick={onToggleEditor}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showEditor
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showEditor ? 'Minimizar aba Texto' : 'Mostrar aba Texto'}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            onClick={onTogglePreview}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showPreview
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showPreview ? 'Minimizar aba PDF' : 'Mostrar aba PDF'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status de Sincronização Local / Nuvem */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 mr-1">
          {driveSyncStatus === 'syncing' || saveStatus === 'saving' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>{driveSyncStatus === 'syncing' ? 'Sincronizando Drive...' : 'Salvando...'}</span>
            </>
          ) : driveSyncStatus === 'synced' ? (
            <div
              className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-default"
              title="Este projeto está salvo e atualizado com segurança no seu Google Drive"
            >
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-[11px]">Salvo no Drive</span>
            </div>
          ) : driveSyncStatus === 'error' ? (
            <div
              className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-default"
              title="Não foi possível sincronizar com o Drive no momento. O documento continua salvo localmente."
            >
              <Cloud className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px]">Salvo localmente (offline)</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 text-neutral-600 cursor-default"
              title="Salvo apenas no cache deste navegador. Conecte sua conta Google para backup automático."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Salvo no navegador</span>
            </div>
          )}
        </div>

        {/* Botão Compartilhar */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          title="Compartilhar trabalho com colegas ou orientador"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Compartilhar</span>
        </button>

        <button
          onClick={onToggleDarkMode}
          className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
          title={
            darkMode
              ? 'Alternar para Modo Claro (Diurno)'
              : 'Alternar para Modo Escuro Ergonômico (Noturno)'
          }
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onOpenWelcomeModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          title="Documentação das Normas ABNT atendidas e guia rápido"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden xl:inline">Normas ABNT</span>
        </button>

        <button
          onClick={onOpenBugReportModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 transition-colors"
          title="Relatar um problema técnico, erro de formatação ou enviar sugestão"
        >
          <Bug className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Relatar Problema</span>
        </button>

        <button
          onClick={onOpenTemplateCustomizer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 transition-colors"
          title="Personalizar norma (ABNT, APA, Artigo 2 colunas), fonte, margens e brasão da universidade"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
          <span>Norma & Layout</span>
        </button>

        <button
          onClick={() => setShowCode(!showCode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            showCode
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          }`}
          title="Ver o código Typst gerado por baixo dos panos"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showCode ? 'Ocultar Typst' : 'Ver Typst'}</span>
        </button>

        <button
          onClick={onExportTypst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          title="Baixar arquivo-fonte .typ"
        >
          <FileDown className="w-3.5 h-3.5 text-neutral-500" />
          <span>Exportar .typ</span>
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-sm transition-colors"
          title="Compilar e baixar o PDF final nas normas da ABNT"
        >
          {isExportingPdf ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </>
          )}
        </button>

        {/* Separador e Área do Usuário / Login Google */}
        <div className="h-5 w-px bg-neutral-200 ml-1 mr-0.5" />

        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-neutral-100 transition-colors"
              title={`Conectado como ${user.name}`}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-neutral-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {/* Dropdown do Usuário */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-neutral-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-neutral-100">
                  <p className="font-semibold text-neutral-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAccountSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Configurações da Conta</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sair da Conta Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            disabled={isAuthLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 shadow-sm transition-all"
            title="Conectar com sua conta Google para salvar no Drive"
          >
            {isAuthLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">Entrar com Google</span>
          </button>
        )}
      </div>
    </header>
  );
};
