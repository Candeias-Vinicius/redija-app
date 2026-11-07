import React, { useState, useEffect } from 'react';
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

    const confirm = window.confirm(`Remover acesso de ${perm.displayName || perm.emailAddress}?`);
    if (!confirm) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Compartilhar Trabalho</h2>
              <p className="text-xs text-neutral-500 truncate max-w-xs">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          {/* Mensagens de Sucesso / Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulário de Convite */}
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">
              Adicionar colega ou orientador (E-mail Google)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isInviting || !emailInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Convidar</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              O colega receberá autorização no Google Drive e o projeto aparecerá no Redija dele.
            </p>
          </form>

          {/* Lista de Pessoas com Acesso */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-neutral-500" />
              <span>Pessoas com acesso</span>
            </h3>

            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Consultando permissões no Google Drive...</span>
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center bg-neutral-50 rounded-lg">
                Nenhum colaborador adicionado ainda. Convide alguém acima!
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-lg">
                {collaborators.map((c) => {
                  const isCurrentUser =
                    currentUserEmail &&
                    c.emailAddress?.toLowerCase() === currentUserEmail.toLowerCase();

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 hover:bg-neutral-50 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.photoLink ? (
                          <img
                            src={c.photoLink}
                            alt=""
                            className="w-7 h-7 rounded-full border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                            {(c.displayName || c.emailAddress || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate flex items-center gap-1.5">
                            <span>{c.displayName || c.emailAddress}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-normal">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate">{c.emailAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                          {c.role === 'owner' ? 'Proprietário' : 'Editor'}
                        </span>
                        {c.role !== 'owner' && (
                          <button
                            onClick={() => handleRemove(c)}
                            title="Remover acesso"
                            className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nota de Segurança */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/60 text-emerald-800 text-[11px] border border-emerald-100">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              O arquivo é protegido pelo Google Drive. Apenas os e-mails autorizados acima têm
              permissão para visualizar ou editar.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
