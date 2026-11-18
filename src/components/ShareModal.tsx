import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  X,
  Share2,
  Users,
  UserPlus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import {
  Collaborator,
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
} from '@/core/storage/googleDriveService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  driveFileId?: string;
  getAccessToken: () => Promise<string | null>;
  currentUserEmail?: string;
  onEnsureProjectSavedToDrive: () => Promise<string | null>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectName,
  driveFileId,
  getAccessToken,
  currentUserEmail,
  onEnsureProjectSavedToDrive,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Confirmação em dois passos na própria linha (substitui window.confirm)
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  // Carrega a lista de colaboradores ao abrir o modal
  useEffect(() => {
    if (!isOpen || !driveFileId) return;

    let isMounted = true;

    getAccessToken()
      .then((token) => {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);
        if (!token) throw new Error('Não foi possível obter credenciais do Google.');
        return listCollaborators(driveFileId, token);
      })
      .then((list) => {
        if (isMounted && list) setCollaborators(list);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Não foi possível carregar os colaboradores.';
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, driveFileId, getAccessToken]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    setError(null);
    setSuccessMessage(null);
    setIsInviting(true);

    try {
      let fileId = driveFileId;
      let token = await getAccessToken();

      // Se o projeto ainda não foi enviado ao Drive pela primeira vez, salva agora
      if (!fileId) {
        fileId = (await onEnsureProjectSavedToDrive()) || undefined;
        token = await getAccessToken();
      }

      if (!fileId || !token) {
        throw new Error(
          'O projeto precisa estar salvo no seu Google Drive antes de convidar colegas.'
        );
      }

      await inviteCollaborator(fileId, email, token);
      setEmailInput('');
      setSuccessMessage(`Convite enviado com sucesso para ${email}!`);

      // Recarrega a lista
      const updated = await listCollaborators(fileId, token);
      setCollaborators(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao convidar este usuário. Verifique o e-mail digitado.';
      setError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (perm: Collaborator) => {
    if (!driveFileId) return;
    if (perm.role === 'owner') return;

    const token = await getAccessToken();
    if (!token) return;

    try {
      await removeCollaborator(driveFileId, perm.id, token);
      setCollaborators((prev) => prev.filter((c) => c.id !== perm.id));
      setSuccessMessage(`Acesso de ${perm.emailAddress} removido.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível revogar a permissão.';
      setError(msg);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="share-modal-title">
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-4 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="share-modal-title" className="text-base font-semibold text-slate-900">Compartilhar Trabalho</h2>
              <p className="text-xs text-slate-500 truncate max-w-[14rem] sm:max-w-xs">{projectName}</p>
            </div>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Mensagens de Sucesso / Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulário de Convite */}
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Adicionar colega ou orientador (E-mail Google)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={isInviting || !emailInput.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white transition-colors w-full sm:w-auto shrink-0"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Convidar</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              O colega receberá autorização no Google Drive e o projeto aparecerá no Redija dele.
            </p>
          </form>

          {/* Lista de Pessoas com Acesso */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Pessoas com acesso</span>
            </h3>

            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                <span>Consultando permissões no Google Drive...</span>
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-lg">
                Nenhum colaborador adicionado ainda. Convide alguém acima!
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {collaborators.map((c) => {
                  const isCurrentUser =
                    currentUserEmail &&
                    c.emailAddress?.toLowerCase() === currentUserEmail.toLowerCase();

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.photoLink ? (
                          <img
                            src={c.photoLink}
                            alt=""
                            className="w-7 h-7 rounded-full border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center shrink-0 text-xs">
                            {(c.displayName || c.emailAddress || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate flex items-center gap-1.5">
                            <span>{c.displayName || c.emailAddress}</span>
                            {isCurrentUser && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{c.emailAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {c.role === 'owner' ? 'Proprietário' : 'Editor'}
                        </span>
                        {c.role !== 'owner' &&
                          (pendingRemovalId === c.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingRemovalId(null);
                                  void handleRemove(c);
                                }}
                                className="touch-target px-2 py-1 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                              >
                                Remover
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingRemovalId(null)}
                                className="touch-target px-2 py-1 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                Cancelar
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingRemovalId(c.id)}
                              title="Remover acesso"
                              aria-label={`Remover acesso de ${c.displayName || c.emailAddress}`}
                              className="touch-target p-1 text-slate-500 hover:text-red-600 rounded transition-colors flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nota de Segurança */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-50/60 text-brand-800 text-xs border border-brand-100">
            <ShieldCheck className="w-4 h-4 shrink-0 text-brand-700 mt-0.5" />
            <span>
              O arquivo é protegido pelo Google Drive. Apenas os e-mails autorizados acima têm
              permissão para visualizar ou editar.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
