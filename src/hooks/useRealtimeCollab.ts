import React, { useState, useEffect, useCallback } from 'react';
import { Block, DocumentProject } from '@/types/document';
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

    return () => {
      unsubPresence();
      unsubRemoteUpdate();
      unsubRemoteSync();
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

  return {
    activeCollaborators,
    broadcastCursor,
    broadcastBlocksSync,
    broadcastBlockUpdate,
  };
}
