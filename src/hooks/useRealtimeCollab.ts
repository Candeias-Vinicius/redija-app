import React, { useState, useEffect, useCallback } from 'react';
import { Block, DocumentProject } from '@/types/document';
import { CommentAuthor, CommentReply, CommentThread } from '@/types/comments';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import {
  realtimeCollab,
  CollaboratorPresence,
} from '@/core/collaboration/RealtimeCollabManager';

interface UseRealtimeCollabOptions {
  isAuthenticated: boolean;
  user: GoogleUserProfile | null;
  driveFileId?: string;
  setProject: React.Dispatch<React.SetStateAction<DocumentProject>>;
}

export function useRealtimeCollab({
  isAuthenticated,
  user,
  driveFileId,
  setProject,
}: UseRealtimeCollabOptions) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorPresence[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user || !driveFileId) {
      realtimeCollab.disconnect();
      return;
    }

    realtimeCollab.connect(driveFileId, user);

    const unsubPresence = realtimeCollab.onPresenceChange((presences) => {
      setActiveCollaborators(presences);
    });

    const unsubRemoteUpdate = realtimeCollab.onRemoteBlockUpdate(({ blockId, content, meta }) => {
      setProject((prev) => {
        const target = prev.blocks.find((b) => b.id === blockId);
        if (!target || target.content === content) return prev;
        return {
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.id === blockId ? { ...b, content, meta: meta ?? b.meta } : b,
          ),
        };
      });
    });

    const unsubRemoteSync = realtimeCollab.onRemoteBlocksSync((remoteBlocks) => {
      setProject((prev) => {
        const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
          ...prev,
          blocks: remoteBlocks,
        });
        return hasMergedRemoteChanges ? mergedProject : prev;
      });
    });

    const unsubRemoteCommentAdd = realtimeCollab.onRemoteCommentAdd((thread) => {
      setProject((prev) => {
        if ((prev.comments || []).some((c) => c.id === thread.id)) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), thread],
        };
      });
    });

    const unsubRemoteCommentReply = realtimeCollab.onRemoteCommentReply((threadId, reply) => {
      setProject((prev) => {
        const nextComments = (prev.comments || []).map((t) => {
          if (t.id !== threadId) return t;
          if ((t.replies || []).some((r) => r.id === reply.id)) return t;
          return { ...t, replies: [...(t.replies || []), reply] };
        });
        return { ...prev, comments: nextComments };
      });
    });

    const unsubRemoteCommentResolve = realtimeCollab.onRemoteCommentResolve(
      (threadId, resolved, resolvedBy) => {
        setProject((prev) => {
          const nextComments = (prev.comments || []).map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              resolved,
              resolvedAt: resolved ? new Date().toISOString() : undefined,
              resolvedBy: resolved ? resolvedBy : undefined,
            };
          });
          return { ...prev, comments: nextComments };
        });
      }
    );

    const unsubRemoteCommentDelete = realtimeCollab.onRemoteCommentDelete((threadId) => {
      setProject((prev) => {
        const nextComments = (prev.comments || []).filter((t) => t.id !== threadId);
        return { ...prev, comments: nextComments };
      });
    });

    return () => {
      unsubPresence();
      unsubRemoteUpdate();
      unsubRemoteSync();
      unsubRemoteCommentAdd();
      unsubRemoteCommentReply();
      unsubRemoteCommentResolve();
      unsubRemoteCommentDelete();
      realtimeCollab.disconnect();
    };
  }, [isAuthenticated, user, driveFileId, setProject]);

  const broadcastCursor = useCallback((blockId: string) => {
    realtimeCollab.broadcastCursor(blockId);
  }, []);

  const broadcastBlocksSync = useCallback((blocks: Block[]) => {
    realtimeCollab.broadcastBlocksSync(blocks);
  }, []);

  const broadcastBlockUpdate = useCallback(
    (blockId: string, content: string, meta?: Block['meta']) => {
      realtimeCollab.broadcastBlockUpdate(blockId, content, meta);
    },
    [],
  );

  const broadcastCommentAdd = useCallback((thread: CommentThread) => {
    realtimeCollab.broadcastCommentAdd(thread);
  }, []);

  const broadcastCommentReply = useCallback((threadId: string, reply: CommentReply) => {
    realtimeCollab.broadcastCommentReply(threadId, reply);
  }, []);

  const broadcastCommentResolve = useCallback(
    (threadId: string, resolved: boolean, resolvedBy?: CommentAuthor) => {
      realtimeCollab.broadcastCommentResolve(threadId, resolved, resolvedBy);
    },
    []
  );

  const broadcastCommentDelete = useCallback((threadId: string) => {
    realtimeCollab.broadcastCommentDelete(threadId);
  }, []);

  return {
    activeCollaborators,
    broadcastCursor,
    broadcastBlocksSync,
    broadcastBlockUpdate,
    broadcastCommentAdd,
    broadcastCommentReply,
    broadcastCommentResolve,
    broadcastCommentDelete,
  };
}
