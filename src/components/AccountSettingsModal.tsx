import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  LogOut,
  HardDrive,
  Cloud,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { checkStoragePersistence } from '@/core/storage/db';
import { listDriveProjects } from '@/core/storage/googleDriveService';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUserProfile | null;
  onLogout: () => void;
  onRevokeAccess: () => Promise<void>;
  onDeleteAccountAndData: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  projectsCount: number;
  syncedProjectsCount: number;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onRevokeAccess,
  onDeleteAccountAndData,
  getAccessToken,
  projectsCount,
  syncedProjectsCount,
}) => {
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [liveDriveCount, setLiveDriveCount] = useState<number | null>(null);
  const [isLoadingDriveCount, setIsLoadingDriveCount] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Verifica persistência de armazenamento
  useEffect(() => {
    if (isOpen) {
      checkStoragePersistence().then(setIsPersisted);
    }
  }, [isOpen]);

  // Consulta quantidade real de arquivos salvos diretamente na API do Google Drive
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const driveFiles = token ? await listDriveProjects(token) : [];
        if (isMounted) {
          const ownFiles = driveFiles.filter((f) => !f.isSharedWithMe);
          setLiveDriveCount(ownFiles.length);
        }
      } catch (err) {
        console.warn('Erro ao consultar contagem do Drive:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDriveCount(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user, getAccessToken]);

  if (!isOpen) return null;

  const handleRevoke = async () => {
    if (isRevoking) return;
    setIsRevoking(true);
    try {
      await onRevokeAccess();
      onClose();
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'deletar conta' || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteAccountAndData();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const effectiveDriveCount =
    liveDriveCount !== null ? liveDriveCount : syncedProjectsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-neutral-900">Configurações da Conta</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Cartão de Perfil */}
          {user ? (
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border border-neutral-200 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900 truncate">{user.name}</p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Conectado com Google</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Modo Convidado (Não conectado)</span>
              </p>
              <p className="text-neutral-600">
                Seus trabalhos estão salvos apenas no cache deste navegador.
              </p>
            </div>
          )}

          {/* Estatísticas de Armazenamento */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-700">Status de Armazenamento</h3>
              {user && (
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                >
                  <span>Abrir Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg border border-neutral-200 bg-white">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Projetos Locais</span>
                </div>
                <p className="text-lg font-bold text-neutral-900">{projectsCount}</p>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 bg-white">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No Google Drive</span>
                </div>
                <p className="text-lg font-bold text-emerald-700">
                  {isLoadingDriveCount ? (
                    <span className="text-sm font-normal text-neutral-400">Consultando...</span>
                  ) : (
                    effectiveDriveCount
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Blindagem de Dados Locais */}
          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Proteção contra Limpeza Automática</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isPersisted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {isPersisted ? 'Ativa' : 'Padrão'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              O navegador foi solicitado a priorizar seus documentos e não deletá-los mesmo se o
              disco do computador estiver cheio.
            </p>
          </div>

          {/* Seção de Permissões e Sessão */}
          {user && (
            <div className="space-y-3 pt-2 border-t border-neutral-100 text-xs">
              <h3 className="font-semibold text-neutral-700">Sessão e Permissões</h3>

              {/* Revogar Permissões do Google */}
              <div className="p-3 rounded-lg border border-neutral-200 bg-white space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Revogar Permissões do Google</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      Desconecta o app e instrui o Google a esquecer as autorizações de acesso concedidas. No próximo acesso, a tela de permissões será exibida novamente.
                    </p>
                  </div>
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="shrink-0 px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isRevoking && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Revogar</span>
                  </button>
                </div>
              </div>

              {/* Botão de Sair Simples */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white">
                <div>
                  <p className="font-medium text-neutral-900">Encerrar Sessão</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Sai deste dispositivo mantendo suas permissões e arquivos intactos.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-neutral-700 hover:bg-neutral-100 border border-neutral-300 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>

              {/* Zona de Perigo: Excluir Conta */}
              <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/40 space-y-3">
                <div className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Excluir Conta e Dados</p>
                    <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                      Exclui permanentemente todos os projetos (<code className="font-mono">.redija</code>) salvos no seu Google Drive, limpa o cache local e revoga as permissões.
                    </p>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-1.5 text-xs font-semibold rounded-lg text-red-700 hover:text-red-800 bg-white hover:bg-red-50 border border-red-300 transition-colors"
                  >
                    Excluir Conta e Dados do Drive
                  </button>
                ) : (
                  <div className="space-y-2.5 pt-2 border-t border-red-200 animate-in fade-in duration-100">
                    <p className="text-[11px] font-medium text-red-900">
                      Para confirmar a exclusão definitiva, digite <strong className="font-bold underline">deletar conta</strong> abaixo:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="deletar conta"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-red-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        disabled={isDeleting}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg text-neutral-600 bg-white hover:bg-neutral-100 border border-neutral-300 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText.trim().toLowerCase() !== 'deletar conta' || isDeleting}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Confirmar Exclusão</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
