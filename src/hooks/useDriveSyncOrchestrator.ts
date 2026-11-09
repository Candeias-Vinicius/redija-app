import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentProject } from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { compileProjectToPdf } from '@/core/typst/projectCompiler';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import { getProject, listProjects, saveProject } from '@/core/storage/db';
import {
  listDriveProjects,
  loadProjectFromDrive,
  saveProjectPdfToDrive,
  saveProjectToDrive,
} from '@/core/storage/googleDriveService';

export function getProjectContentSignature(p: DocumentProject): string {
  return JSON.stringify({
    name: p.name,
    templateType: p.templateType,
    metadata: p.metadata,
    blocks: p.blocks,
    references: p.references,
    templateConfig: p.templateConfig,
    sidebarConfig: p.sidebarConfig,
  });
}

function syncPdfCopyToDriveInBackground(projectToSync: DocumentProject, token: string): void {
  compileProjectToPdf(projectToSync)
    .then((pdfResult) => {
      if (pdfResult.pdf) {
        return saveProjectPdfToDrive(projectToSync, new Uint8Array(pdfResult.pdf), token);
      }
      return undefined;
    })
    .catch((pdfErr) => {
      console.warn('Erro ao atualizar cópia PDF no Drive:', pdfErr);
    });
}

interface UseDriveSyncOrchestratorOptions {
  project: DocumentProject;
  setProject: React.Dispatch<React.SetStateAction<DocumentProject>>;
  projectsCount: number;
  setProjects: React.Dispatch<React.SetStateAction<DocumentProject[]>>;
  isStorageReady: boolean;
  isAuthenticated: boolean;
  user: GoogleUserProfile | null;
  login: (promptConsent?: boolean) => Promise<string | null>;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
}

export function useDriveSyncOrchestrator({
  project,
  setProject,
  projectsCount,
  setProjects,
  isStorageReady,
  isAuthenticated,
  user,
  login,
  getValidAccessToken,
}: UseDriveSyncOrchestratorOptions) {
  const [rawDriveSyncStatus, setRawDriveSyncStatus] = useState<'synced' | 'syncing' | 'error'>(
    'synced',
  );
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const driveSyncStatus: 'local' | 'synced' | 'syncing' | 'error' =
    !isAuthenticated || !user ? 'local' : rawDriveSyncStatus;

  const isDriveSyncingRef = useRef(false);
  const driveFileIdByProjectIdRef = useRef<Record<string, string>>({});
  const lastSyncedSignatureRef = useRef<Record<string, string>>({});

  // Sincronização em segundo plano com o Google Drive (Debounce de 3.5 segundos)
  useEffect(() => {
    if (!isStorageReady || !isAuthenticated || !user || projectsCount === 0) {
      return;
    }

    // Blindagem de segurança: nunca envia para o Google Drive arquivos do Perfil Local
    // ou que pertençam a outro usuário
    if (project.ownerEmail && project.ownerEmail !== user.email) {
      return;
    }

    const driveTimer = setTimeout(async () => {
      if (isDriveSyncingRef.current) {
        return;
      }

      const knownFileId = project.driveFileId || driveFileIdByProjectIdRef.current[project.id];
      const signature = getProjectContentSignature(project);

      if (knownFileId && lastSyncedSignatureRef.current[project.id] === signature) {
        return;
      }

      isDriveSyncingRef.current = true;
      setRawDriveSyncStatus('syncing');

      try {
        const token = await getValidAccessToken();
        if (!token) {
          setRawDriveSyncStatus('error');
          return;
        }

        const projectToSync: DocumentProject = {
          ...project,
          driveFileId: knownFileId,
          ownerEmail: user.email,
        };

        const { fileId, modifiedTime } = await saveProjectToDrive(projectToSync, token);
        driveFileIdByProjectIdRef.current[project.id] = fileId;
        lastSyncedSignatureRef.current[project.id] = signature;
        setRawDriveSyncStatus('synced');

        setProject((prev) => {
          if (prev.id !== project.id) return prev;
          return {
            ...prev,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: user.email,
          };
        });

        const currentInDb = await getProject(project.id);
        if (currentInDb) {
          await saveProject(
            {
              ...currentInDb,
              driveFileId: fileId,
              driveSyncedAt: modifiedTime,
              ownerEmail: user.email,
            },
            false,
          );
          const all = await listProjects(user.email);
          setProjects(all);
        }

        syncPdfCopyToDriveInBackground(projectToSync, token);
      } catch (err) {
        console.warn('Erro ao sincronizar com Google Drive:', err);
        setRawDriveSyncStatus('error');
      } finally {
        isDriveSyncingRef.current = false;
      }
    }, 3500);

    return () => clearTimeout(driveTimer);
  }, [
    project,
    isStorageReady,
    isAuthenticated,
    user,
    projectsCount,
    getValidAccessToken,
    setProject,
    setProjects,
  ]);

  /**
   * Garante que o projeto ativo esteja gravado no Google Drive antes de compartilhar.
   */
  const handleEnsureProjectSavedToDrive = useCallback(async (): Promise<string | null> => {
    try {
      let token = await getValidAccessToken(true);
      if (!token) {
        token = await login(false);
      }
      if (!token) return null;

      const knownFileId = project.driveFileId || driveFileIdByProjectIdRef.current[project.id];
      const projectToSync: DocumentProject = {
        ...project,
        driveFileId: knownFileId,
      };

      setRawDriveSyncStatus('syncing');
      const { fileId, modifiedTime } = await saveProjectToDrive(projectToSync, token);
      driveFileIdByProjectIdRef.current[project.id] = fileId;
      lastSyncedSignatureRef.current[project.id] = getProjectContentSignature(project);

      setProject((prev) => ({
        ...prev,
        driveFileId: fileId,
        driveSyncedAt: modifiedTime,
        ownerEmail: prev.ownerEmail || user?.email,
      }));

      const currentInDb = await getProject(project.id);
      if (currentInDb) {
        await saveProject(
          {
            ...currentInDb,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            ownerEmail: currentInDb.ownerEmail || user?.email,
          },
          false,
        );
        const all = await listProjects(user?.email);
        setProjects(all);
      }

      syncPdfCopyToDriveInBackground(projectToSync, token);

      setRawDriveSyncStatus('synced');
      return fileId;
    } catch (err) {
      console.error('Falha ao garantir salvamento no Drive:', err);
      return null;
    }
  }, [project, user, login, getValidAccessToken, setProject, setProjects]);

  /**
   * Sincroniza a lista de projetos trazendo arquivos existentes do Google Drive para o Dexie.
   */
  const handleSyncFromDrive = useCallback(
    async (interactive = false) => {
      if (!isAuthenticated || !user) return;
      setIsSyncingDrive(true);
      try {
        const token = await getValidAccessToken(interactive);
        if (!token) return;

        const driveSummaries = await listDriveProjects(token);
        const currentProjects = await listProjects(user.email);
        let hasNewOrUpdated = false;
        const seenNames = new Set<string>();

        for (const summary of driveSummaries) {
          const normName = summary.name.trim().toLowerCase();
          if (seenNames.has(normName)) {
            continue;
          }
          seenNames.add(normName);

          const existsLocally = currentProjects.find((p) => p.driveFileId === summary.id);
          if (existsLocally) {
            driveFileIdByProjectIdRef.current[existsLocally.id] = summary.id;
            const remoteTime = new Date(summary.modifiedTime).getTime();
            const localTime = new Date(
              existsLocally.driveSyncedAt || existsLocally.updatedAt,
            ).getTime();
            if (remoteTime > localTime + 2000) {
              try {
                const remoteLoaded = await loadProjectFromDrive(summary.id, token);
                remoteLoaded.ownerEmail = user.email;
                const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(
                  existsLocally,
                  remoteLoaded,
                );
                if (hasMergedRemoteChanges) {
                  await saveProject(mergedProject, false);
                  hasNewOrUpdated = true;
                }
              } catch (err) {
                console.warn(`Erro ao mesclar alterações do Drive para ${summary.name}:`, err);
              }
            }
          } else {
            const matchByName = currentProjects.find(
              (p) => !p.driveFileId && p.name.trim().toLowerCase() === normName,
            );
            if (matchByName) {
              matchByName.driveFileId = summary.id;
              matchByName.driveSyncedAt = summary.modifiedTime;
              matchByName.ownerEmail = user.email;
              await saveProject(matchByName, false);
              driveFileIdByProjectIdRef.current[matchByName.id] = summary.id;
              hasNewOrUpdated = true;
            } else {
              try {
                const loaded = await loadProjectFromDrive(summary.id, token);
                loaded.ownerEmail = user.email;
                await saveProject(loaded, false);
                driveFileIdByProjectIdRef.current[loaded.id] = summary.id;
                hasNewOrUpdated = true;
              } catch (err) {
                console.warn(`Não foi possível carregar projeto ${summary.name}:`, err);
              }
            }
          }
        }

        if (hasNewOrUpdated) {
          const all = await listProjects(user.email);
          setProjects(all);
          const activeUpdated = all.find((p) => p.id === project.id);
          if (activeUpdated && activeUpdated.driveFileId !== project.driveFileId) {
            setProject(activeUpdated);
          }
        }
      } catch (err) {
        console.error('Erro ao listar projetos do Drive:', err);
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [isAuthenticated, getValidAccessToken, user, project.id, project.driveFileId, setProjects, setProject],
  );

  // Sincroniza projetos do Google Drive automaticamente em segundo plano ao logar
  useEffect(() => {
    if (!isAuthenticated || !isStorageReady) return;

    let isMounted = true;
    (async () => {
      await Promise.resolve();
      if (isMounted) {
        await handleSyncFromDrive();
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isStorageReady, handleSyncFromDrive]);

  // Sincronização inteligente ao voltar para a aba do navegador
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncFromDrive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, handleSyncFromDrive]);

  return {
    driveSyncStatus,
    isSyncingDrive,
    handleSyncFromDrive,
    handleEnsureProjectSavedToDrive,
  };
}
