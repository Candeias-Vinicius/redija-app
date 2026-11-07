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
} from 'lucide-react';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { checkStoragePersistence } from '@/core/storage/db';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUserProfile | null;
  onLogout: () => void;
  projectsCount: number;
  syncedProjectsCount: number;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  projectsCount,
  syncedProjectsCount,
}) => {
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStoragePersistence().then(setIsPersisted);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/50">
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

        {/* Corpo */}
        <div className="p-6 space-y-5">
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
            <h3 className="font-semibold text-neutral-700">Status de Armazenamento</h3>
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
                <p className="text-lg font-bold text-emerald-700">{syncedProjectsCount}</p>
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

          {/* Botão de Logout / Ações */}
          {user && (
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
              >
                <span>Acessar Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
