import React, { useState, useEffect, useRef } from 'react';
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
  Link2,
  Copy,
  Lock,
  Radio,
} from 'lucide-react';
import { ShareRole } from '@/types/document';
import { buildProjectShareUrl } from '@/hooks/useAppRoute';
import { CollabConnectionStatus } from '@/core/collaboration/RealtimeCollabManager';
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
  shareRole?: ShareRole;
  collabConnectionStatus?: CollabConnectionStatus;
  getAccessToken: () => Promise<string | null>;
  currentUserEmail?: string;
  onEnsureProjectSavedToDrive: () => Promise<string | null>;
  onCollaboratorsLoaded?: (info: { allowedEmails: string[]; allowAnyone: boolean }) => void;
}

function summarizeCollaboratorPolicy(list: Collaborator[]): {
  allowedEmails: string[];
  allowAnyone: boolean;
} {
  const allowAnyone = list.some((c) => c.type === 'anyone');
  const allowedEmails = Array.from(
    new Set(
      list
        .map((c) => c.emailAddress?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  );
  return { allowedEmails, allowAnyone };
}

function formatShareRoleLabel(role: ShareRole): string {
  switch (role) {
    case 'owner':
      return 'Proprietário';
    case 'writer':
      return 'Editor';
    case 'commenter':
      return 'Comentarista';
    case 'reader':
      return 'Leitor';
  }
}

function formatConnectionStatusLabel(status: CollabConnectionStatus): string {
  switch (status) {
    case 'connected_p2p':
      return 'Tempo real P2P ativo (Criptografado ponta-a-ponta AES-256-GCM)';
    case 'connected_local':
      return 'Canal P2P local pronto (Criptografado ponta-a-ponta)';
    case 'connecting':
      return 'Conectando rede P2P segura...';
    case 'fallback_drive':
      return 'Sincronização automática via Google Drive ativa (Fallback P2P)';
    default:
      return 'Salve no Google Drive para ativar link direto e sala P2P segura';
  }
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectName,
  driveFileId,
  shareRole = 'owner',
  collabConnectionStatus = 'idle',
  getAccessToken,
  currentUserEmail,
  onEnsureProjectSavedToDrive,
  onCollaboratorsLoaded,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'writer' | 'reader'>('writer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onCollaboratorsLoadedRef = useRef(onCollaboratorsLoaded);
  useEffect(() => {
    onCollaboratorsLoadedRef.current = onCollaboratorsLoaded;
  }, [onCollaboratorsLoaded]);

  const isReadOnlyUser = shareRole === 'reader' || shareRole === 'commenter';
  const shareUrl = driveFileId ? buildProjectShareUrl(driveFileId) : null;

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
          onCollaboratorsLoadedRef.current?.(summarizeCollaboratorPolicy(list));
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : 'Não foi possível carregar os colaboradores.';
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

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setError('Não foi possível copiar o link automaticamente. Copie manualmente no campo acima.');
    }
  };

  const handleGenerateLinkNow = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsGeneratingLink(true);
    try {
      const savedId = await onEnsureProjectSavedToDrive();
      if (!savedId) {
        setError('Conecte sua conta Google para enviar o projeto ao Drive e gerar o link direto.');
      } else {
        setSuccessMessage('Projeto salvo no Google Drive e link direto pronto para compartilhar!');
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyUser) return;

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
          'O projeto precisa estar salvo no seu Google Drive antes de convidar colegas.',
        );
      }

      const directUrl = buildProjectShareUrl(fileId);
      await inviteCollaborator(fileId, email, token, {
        role: inviteRole,
        projectName,
        shareUrl: directUrl,
      });
      setEmailInput('');
      setSuccessMessage(
        `Convite enviado para ${email} com o link direto do RedijaApp (${formatShareRoleLabel(inviteRole)})!`,
      );

      const updated = await listCollaborators(fileId, token);
      setCollaborators(updated);
      onCollaboratorsLoadedRef.current?.(summarizeCollaboratorPolicy(updated));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao convidar este usuário. Verifique o e-mail digitado.';
      setError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (perm: Collaborator) => {
    if (!driveFileId || isReadOnlyUser) return;
    if (perm.role === 'owner') return;

    const token = await getAccessToken();
    if (!token) return;

    const confirmRemove = window.confirm(
      `Remover acesso de ${perm.displayName || perm.emailAddress}?`,
    );
    if (!confirmRemove) return;

    try {
      await removeCollaborator(driveFileId, perm.id, token);
      const next = collaborators.filter((c) => c.id !== perm.id);
      setCollaborators(next);
      onCollaboratorsLoadedRef.current?.(summarizeCollaboratorPolicy(next));
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
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status da Sala P2P Criptografada / Drive */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700">
            <Radio
              className={`w-3.5 h-3.5 shrink-0 ${
                collabConnectionStatus === 'connected_p2p' ||
                collabConnectionStatus === 'connected_local'
                  ? 'text-emerald-600'
                  : collabConnectionStatus === 'fallback_drive'
                    ? 'text-blue-600'
                    : 'text-neutral-400'
              }`}
            />
            <span>{formatConnectionStatusLabel(collabConnectionStatus)}</span>
          </div>

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

          {/* Bloco de Link Direto do RedijaApp */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Link direto no RedijaApp</span>
            </label>
            {shareUrl ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              !isReadOnlyUser && (
                <button
                  type="button"
                  disabled={isGeneratingLink}
                  onClick={handleGenerateLinkNow}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isGeneratingLink ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar no Drive e Gerar Link Direto</span>
                </button>
              )
            )}
            <p className="text-[11px] text-neutral-500">
              Apenas as pessoas autorizadas abaixo conseguem abrir este link (não contém senhas na
              URL).
            </p>
          </div>

          {/* Formulário de Convite (oculto em modo somente leitura) */}
          {isReadOnlyUser ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Você possui permissão de <strong>{formatShareRoleLabel(shareRole)}</strong>. Apenas o
                proprietário ou editores autorizados podem convidar novos colegas.
              </span>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-2 pt-2 border-t border-neutral-100">
              <label className="block text-xs font-semibold text-neutral-700">
                Adicionar colega ou orientador (E-mail Google)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
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
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'writer' | 'reader')}
                  aria-label="Nível de permissão do convidado"
                  className="px-2.5 py-2 text-xs font-medium bg-white border border-neutral-300 rounded-lg text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="writer">Editor</option>
                  <option value="reader">Leitor</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !emailInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors shrink-0"
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
                O e-mail de convite incluirá o link direto deste trabalho no RedijaApp.
              </p>
            </form>
          )}

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
                          {formatShareRoleLabel(c.role)}
                        </span>
                        {c.role !== 'owner' && !isReadOnlyUser && (
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
              Arquivo protegido pelo Google Drive e sala P2P criptografada com AES-256-GCM. Apenas os
              usuários autorizados acima possuem a chave da sessão e permissão para ler ou editar.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
