import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  GraduationCap,
  Edit3,
  Eye,
  Crown,
} from 'lucide-react';
import {
  Collaborator,
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
} from '@/core/storage/googleDriveService';
import {
  GoogleDrivePermissionRole,
  ProjectMember,
  collaboratorsToProjectMembers,
} from '@/types/members';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  driveFileId?: string;
  getAccessToken: () => Promise<string | null>;
  currentUserEmail?: string;
  onEnsureProjectSavedToDrive: () => Promise<string | null>;
  onMembersUpdated?: (members: ProjectMember[]) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectName,
  driveFileId,
  getAccessToken,
  currentUserEmail,
  onEnsureProjectSavedToDrive,
  onMembersUpdated,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'writer' | 'commenter' | 'reader'>('commenter');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
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
        if (isMounted && list) {
          setCollaborators(list);
          onMembersUpdated?.(collaboratorsToProjectMembers(list));
        }
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
  }, [isOpen, driveFileId, getAccessToken, onMembersUpdated]);

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

      await inviteCollaborator(fileId, email, roleInput, token);
      setEmailInput('');
      const roleName =
        roleInput === 'commenter'
          ? 'Comentador (Orientador)'
          : roleInput === 'writer'
            ? 'Editor (Coautor)'
            : 'Leitor';
      setSuccessMessage(`Convite como ${roleName} enviado para ${email}!`);

      // Recarrega a lista
      const updated = await listCollaborators(fileId, token);
      setCollaborators(updated);
      onMembersUpdated?.(collaboratorsToProjectMembers(updated));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao convidar este usuário. Verifique o e-mail digitado.';
      setError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (perm: Collaborator, newRole: GoogleDrivePermissionRole) => {
    if (!driveFileId || perm.role === 'owner' || newRole === 'owner') return;

    const token = await getAccessToken();
    if (!token) return;

    setError(null);
    setSuccessMessage(null);
    setUpdatingRoleId(perm.id);

    try {
      await updateCollaboratorRole(driveFileId, perm.id, newRole, token);
      const updated = collaborators.map((c) =>
        c.id === perm.id ? { ...c, role: newRole } : c
      );
      setCollaborators(updated);
      onMembersUpdated?.(collaboratorsToProjectMembers(updated));

      const roleName =
        newRole === 'commenter'
          ? 'Comentador (Orientador)'
          : newRole === 'writer'
            ? 'Editor'
            : 'Leitor';
      setSuccessMessage(`Permissão de ${perm.displayName || perm.emailAddress} atualizada para ${roleName}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível alterar o papel.';
      setError(msg);
    } finally {
      setUpdatingRoleId(null);
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
      const updated = collaborators.filter((c) => c.id !== perm.id);
      setCollaborators(updated);
      onMembersUpdated?.(collaboratorsToProjectMembers(updated));
      setSuccessMessage(`Acesso de ${perm.emailAddress} removido.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível revogar a permissão.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Membros do Projeto & Permissões</h2>
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

          {/* Formulário de Convite com Seletor de Papel */}
          <form onSubmit={handleInvite} className="space-y-3">
            <label className="block text-xs font-semibold text-neutral-700">
              Convidar novo membro (E-mail Google)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="orientador@universidade.edu.br"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Seletor de Papel no Convite */}
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as 'writer' | 'commenter' | 'reader')}
                className="text-xs px-2.5 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
              >
                <option value="commenter">🎓 Comentador (Orientador)</option>
                <option value="writer">✏️ Editor (Coautor)</option>
                <option value="reader">👁️ Leitor (Somente Leitura)</option>
              </select>

              <button
                type="submit"
                disabled={isInviting || !emailInput.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors shrink-0"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Convidar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-neutral-500 pt-1">
              <div className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span><strong>Orientador:</strong> comenta e revisa</span>
              </div>
              <div className="flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Editor:</strong> edita e altera blocos</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span><strong>Leitor:</strong> apenas visualiza o PDF</span>
              </div>
            </div>
          </form>

          {/* Lista de Pessoas com Acesso */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span>Pessoas com acesso ({collaborators.length})</span>
              </h3>
              <span className="text-[11px] text-neutral-400">
                Você pode alterar os papéis a qualquer momento
              </span>
            </div>

            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Consultando permissões no Google Drive...</span>
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center bg-neutral-50 rounded-lg">
                Nenhum colaborador adicionado ainda. Convide seu orientador ou colegas acima!
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
                {collaborators.map((c) => {
                  const isCurrentUser =
                    currentUserEmail &&
                    c.emailAddress?.toLowerCase() === currentUserEmail.toLowerCase();
                  const isUpdating = updatingRoleId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 hover:bg-neutral-50 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {c.photoLink ? (
                          <img
                            src={c.photoLink}
                            alt=""
                            className="w-7 h-7 rounded-full border border-neutral-200 shrink-0 object-cover"
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

                      {/* Dropdown de Papel e Ações */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.role === 'owner' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Crown className="w-3 h-3 text-amber-600" />
                            Proprietário
                          </span>
                        ) : (
                          <>
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <select
                                value={c.role}
                                onChange={(e) =>
                                  handleChangeRole(
                                    c,
                                    e.target.value as GoogleDrivePermissionRole
                                  )
                                }
                                className="text-[11px] font-medium border border-neutral-300 rounded-md px-1.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="commenter">🎓 Comentador</option>
                                <option value="writer">✏️ Editor</option>
                                <option value="reader">👁️ Leitor</option>
                              </select>
                            )}

                            <button
                              onClick={() => handleRemove(c)}
                              title="Remover acesso"
                              className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nota de Segurança */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50/60 text-emerald-800 text-[11px] border border-emerald-100">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              Sincronizado diretamente com a Google Drive API v3. As permissões de Orientador, Editor e
              Leitor entram em vigor imediatamente para quem acessar.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
