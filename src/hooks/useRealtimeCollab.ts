import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AcademicReference,
  Block,
  DocumentMetadata,
  DocumentProject,
  ShareRole,
} from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { autoMergeProjects, mergeDeletedBlockTimestamps } from '@/core/storage/projectMerger';
import {
  realtimeCollab,
  CollaboratorPresence,
  CollabConnectionStatus,
  CollabProjectSnapshot,
} from '@/core/collaboration/RealtimeCollabManager';

interface UseRealtimeCollabOptions {
  isAuthenticated: boolean;
  user: GoogleUserProfile | null;
  project: DocumentProject;
  setProject: React.Dispatch<React.SetStateAction<DocumentProject>>;
  allowedEmails?: string[];
  allowAnyone?: boolean;
}

export function useRealtimeCollab({
  isAuthenticated,
  user,
  project,
  setProject,
  allowedEmails,
  allowAnyone,
}: UseRealtimeCollabOptions) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorPresence[]>([]);
  const [collabConnectionStatus, setCollabConnectionStatus] =
    useState<CollabConnectionStatus>('idle');

  const latestSnapshotRef = useRef<CollabProjectSnapshot | null>(null);
  useEffect(() => {
    latestSnapshotRef.current = {
      blocks: project.blocks,
      deletedBlockTimestamps: project.deletedBlockTimestamps,
      blocksOrderUpdatedAt: project.blocksOrderUpdatedAt,
      metadata: project.metadata,
      metadataUpdatedAt: project.metadataUpdatedAt,
      references: project.references,
      referencesUpdatedAt: project.referencesUpdatedAt,
    };
  }, [
    project.blocks,
    project.deletedBlockTimestamps,
    project.blocksOrderUpdatedAt,
    project.metadata,
    project.metadataUpdatedAt,
    project.references,
    project.referencesUpdatedAt,
  ]);

  const driveFileId = project.driveFileId;
  const collabSecret = project.collabSecret;
  const shareRole: ShareRole = project.shareRole ?? (project.isSharedWithMe ? 'writer' : 'owner');

  const latestPolicyRef = useRef({ shareRole, allowedEmails, allowAnyone });
  useEffect(() => {
    latestPolicyRef.current = { shareRole, allowedEmails, allowAnyone };
  }, [shareRole, allowedEmails, allowAnyone]);

  useEffect(() => {
    if (!isAuthenticated || !user || !driveFileId) {
      realtimeCollab.disconnect();
      return;
    }

    const initialPolicy = latestPolicyRef.current;
    realtimeCollab.connect(driveFileId, user, {
      collabSecret,
      role: initialPolicy.shareRole,
      allowedEmails: initialPolicy.allowedEmails,
      allowAnyone: initialPolicy.allowAnyone,
      getLatestSnapshot: () => latestSnapshotRef.current,
    });

    const unsubPresence = realtimeCollab.onPresenceChange((presences) => {
      setActiveCollaborators(presences);
    });

    const unsubStatus = realtimeCollab.onStatusChange((status) => {
      setCollabConnectionStatus(status);
    });

    const unsubRemoteUpdate = realtimeCollab.onRemoteBlockUpdate(
      ({ blockId, content, updatedAt, meta }) => {
        setProject((prev) => {
          const target = prev.blocks.find((b) => b.id === blockId);
          if (!target) return prev;
          if (
            typeof updatedAt === 'number' &&
            typeof target.updatedAt === 'number' &&
            target.updatedAt > updatedAt
          ) {
            return prev;
          }
          const sameContent = target.content === content;
          const sameMeta = !meta || JSON.stringify(target.meta) === JSON.stringify(meta);
          if (sameContent && sameMeta) return prev;
          return {
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    content,
                    updatedAt: updatedAt ?? Date.now(),
                    meta: meta ?? b.meta,
                  }
                : b,
            ),
          };
        });
      },
    );

    const unsubRemoteSync = realtimeCollab.onRemoteBlocksSync(
      ({ blocks: remoteBlocks, deletedBlockTimestamps, blocksOrderUpdatedAt }) => {
        setProject((prev) => {
          const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
            ...prev,
            blocks: remoteBlocks,
            deletedBlockTimestamps: mergeDeletedBlockTimestamps(
              prev.deletedBlockTimestamps,
              deletedBlockTimestamps,
            ),
            blocksOrderUpdatedAt: blocksOrderUpdatedAt ?? prev.blocksOrderUpdatedAt,
          });
          return hasMergedRemoteChanges ? mergedProject : prev;
        });
      },
    );

    const unsubRemoteMetadata = realtimeCollab.onRemoteMetadataUpdate(
      ({ metadata, metadataUpdatedAt }) => {
        setProject((prev) => {
          const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
            ...prev,
            metadata,
            metadataUpdatedAt,
          });
          return hasMergedRemoteChanges ? mergedProject : prev;
        });
      },
    );

    const unsubRemoteRefs = realtimeCollab.onRemoteReferencesUpdate(
      ({ references, referencesUpdatedAt }) => {
        setProject((prev) => {
          const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
            ...prev,
            references,
            referencesUpdatedAt,
          });
          return hasMergedRemoteChanges ? mergedProject : prev;
        });
      },
    );

    const unsubProjectSync = realtimeCollab.onRemoteProjectSync((snapshot) => {
      setProject((prev) => {
        const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(prev, {
          ...prev,
          blocks: snapshot.blocks,
          deletedBlockTimestamps: snapshot.deletedBlockTimestamps,
          blocksOrderUpdatedAt: snapshot.blocksOrderUpdatedAt,
          ...(snapshot.metadata ? { metadata: snapshot.metadata } : {}),
          metadataUpdatedAt: snapshot.metadataUpdatedAt,
          ...(snapshot.references ? { references: snapshot.references } : {}),
          referencesUpdatedAt: snapshot.referencesUpdatedAt,
        });
        return hasMergedRemoteChanges ? mergedProject : prev;
      });
    });

    return () => {
      unsubPresence();
      unsubStatus();
      unsubRemoteUpdate();
      unsubRemoteSync();
      unsubRemoteMetadata();
      unsubRemoteRefs();
      unsubProjectSync();
      realtimeCollab.disconnect();
    };
  }, [isAuthenticated, user, driveFileId, collabSecret, setProject]);

  useEffect(() => {
    if (!isAuthenticated || !user || !driveFileId) return;
    realtimeCollab.updatePermissions({
      role: shareRole,
      allowedEmails,
      allowAnyone,
    });
  }, [isAuthenticated, user, driveFileId, shareRole, allowedEmails, allowAnyone]);

  const broadcastCursor = useCallback((blockId: string) => {
    realtimeCollab.broadcastCursor(blockId);
  }, []);

  const broadcastBlocksSync = useCallback(
    (
      blocks: Block[],
      deletedBlockTimestamps?: Record<string, number>,
      blocksOrderUpdatedAt?: number,
    ) => {
      realtimeCollab.broadcastBlocksSync(blocks, deletedBlockTimestamps, blocksOrderUpdatedAt);
    },
    [],
  );

  const broadcastBlockUpdate = useCallback(
    (blockId: string, content: string, meta?: Block['meta'], updatedAt?: number) => {
      realtimeCollab.broadcastBlockUpdate(blockId, content, meta, updatedAt);
    },
    [],
  );

  const broadcastMetadataUpdate = useCallback(
    (metadata: DocumentMetadata, metadataUpdatedAt: number) => {
      realtimeCollab.broadcastMetadataUpdate(metadata, metadataUpdatedAt);
    },
    [],
  );

  const broadcastReferencesUpdate = useCallback(
    (references: AcademicReference[], referencesUpdatedAt: number) => {
      realtimeCollab.broadcastReferencesUpdate(references, referencesUpdatedAt);
    },
    [],
  );

  const effectiveActiveCollaborators =
    !isAuthenticated || !user || !driveFileId ? [] : activeCollaborators;
  const effectiveCollabStatus: CollabConnectionStatus =
    !isAuthenticated || !user || !driveFileId ? 'idle' : collabConnectionStatus;

  return {
    activeCollaborators: effectiveActiveCollaborators,
    collabConnectionStatus: effectiveCollabStatus,
    broadcastCursor,
    broadcastBlocksSync,
    broadcastBlockUpdate,
    broadcastMetadataUpdate,
    broadcastReferencesUpdate,
  };
}
