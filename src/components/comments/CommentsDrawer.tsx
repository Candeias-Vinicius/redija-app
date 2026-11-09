import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  CornerDownRight,
  Filter,
  GraduationCap,
  Edit3,
  Crown,
  Quote,
} from 'lucide-react';
import { CommentThread, CommentAuthor } from '@/types/comments';
import { ProjectRole } from '@/types/members';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: CommentThread[];
  activeCommentId?: string | null;
  currentUser: CommentAuthor;
  canComment: boolean;
  onAddReply: (threadId: string, content: string) => void;
  onToggleResolve: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onSelectThread: (threadId: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  isOpen,
  onClose,
  comments,
  activeCommentId,
  currentUser,
  canComment,
  onAddReply,
  onToggleResolve,
  onDeleteThread,
  onSelectThread,
}) => {
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const pendingCount = useMemo(() => comments.filter((c) => !c.resolved).length, [comments]);
  const resolvedCount = useMemo(() => comments.filter((c) => c.resolved).length, [comments]);

  const filteredComments = useMemo(() => {
    if (filter === 'pending') return comments.filter((c) => !c.resolved);
    if (filter === 'resolved') return comments.filter((c) => c.resolved);
    return comments;
  }, [comments, filter]);

  if (!isOpen) return null;

  const handleSendReply = (threadId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = replyDrafts[threadId]?.trim();
    if (!content) return;
    onAddReply(threadId, content);
    setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
  };

  const renderRoleBadge = (role: ProjectRole) => {
    if (role === 'owner') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded">
          <Crown className="w-2.5 h-2.5 text-amber-600" />
          Proprietário
        </span>
      );
    }
    if (role === 'commenter') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded">
          <GraduationCap className="w-2.5 h-2.5 text-indigo-600" />
          Orientador
        </span>
      );
    }
    if (role === 'editor') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
          <Edit3 className="w-2.5 h-2.5 text-emerald-600" />
          Editor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded">
        Leitor
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-80 md:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full shadow-lg z-30 shrink-0 animate-in slide-in-from-right duration-200">
      {/* Cabeçalho do Painel */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Comentários Ancorados
            </h2>
            <p className="text-[11px] text-neutral-500">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} • {resolvedCount} resolvido{resolvedCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Fechar painel de comentários"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 flex items-center gap-1.5 text-xs">
        <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Pendentes ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Resolvidos ({resolvedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            filter === 'all'
              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Todos ({comments.length})
        </button>
      </div>

      {/* Lista de Threads de Comentários */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 dark:text-neutral-500 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
            <p className="font-medium">
              {filter === 'pending'
                ? 'Nenhum comentário pendente.'
                : filter === 'resolved'
                  ? 'Nenhum comentário resolvido ainda.'
                  : 'Nenhum comentário no trabalho.'}
            </p>
            {canComment && filter === 'pending' && (
              <p className="text-[11px] max-w-xs mx-auto text-neutral-400">
                Selecione qualquer trecho de texto no editor e clique no botão de balão para adicionar um apontamento.
              </p>
            )}
          </div>
        ) : (
          filteredComments.map((thread) => {
            const isActive = activeCommentId === thread.id;
            const isAuthorOrOwner =
              currentUser.email === thread.author.email || currentUser.role === 'owner';

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`rounded-xl border transition-all text-xs cursor-pointer ${
                  isActive
                    ? 'border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-400/20 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-850'
                } ${thread.resolved ? 'opacity-70 bg-neutral-50 dark:bg-neutral-900' : ''}`}
              >
                {/* Trecho Citado */}
                {thread.highlightedText && (
                  <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 bg-amber-50/40 dark:bg-amber-950/20 rounded-t-xl flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                    <Quote className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">&ldquo;{thread.highlightedText}&rdquo;</span>
                  </div>
                )}

                {/* Conteúdo Principal do Comentário */}
                <div className="p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {thread.author.picture ? (
                        <img
                          src={thread.author.picture}
                          alt=""
                          className="w-6 h-6 rounded-full border border-neutral-200 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {thread.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {thread.author.name}
                          </span>
                          {renderRoleBadge(thread.author.role)}
                        </div>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(thread.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Ações: Resolver / Deletar */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onToggleResolve(thread.id)}
                        className={`p-1 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
                          thread.resolved
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'text-neutral-400 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                        title={thread.resolved ? 'Reabrir apontamento' : 'Marcar como resolvido'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{thread.resolved ? 'Resolvido' : 'Resolver'}</span>
                      </button>

                      {isAuthorOrOwner && (
                        <button
                          type="button"
                          onClick={() => onDeleteThread(thread.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                          title="Excluir apontamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {thread.content}
                  </p>

                  {/* Respostas Encadeadas */}
                  {thread.replies && thread.replies.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2 pl-2">
                      {thread.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2 text-[11px]">
                          <CornerDownRight className="w-3 h-3 text-neutral-400 shrink-0 mt-1" />
                          <div className="flex-1 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  {reply.author.name}
                                </span>
                                {renderRoleBadge(reply.author.role)}
                              </div>
                              <span className="text-[10px] text-neutral-400">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário de Resposta */}
                  {canComment && !thread.resolved && (
                    <form
                      onSubmit={(e) => handleSendReply(thread.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={replyDrafts[thread.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                        placeholder="Responder apontamento..."
                        className="flex-1 text-[11px] px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={!replyDrafts[thread.id]?.trim()}
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
                        title="Enviar resposta"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
