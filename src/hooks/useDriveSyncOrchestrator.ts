import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentProject } from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { CollabConnectionStatus } from '@/core/collaboration/RealtimeCollabManager';
import { compileProjectToPdf } from '@/core/typst/projectCompiler';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import { getProject, listProjects, saveProject, setActiveProjectId } from '@/core/storage/db';
import { validateProjectQuota } from '@/core/storage/imageQuota';
import { normalizeProject } from '@/core/storage/schemaNormalizer';
import {
  DriveAccessError,
  getDriveFileModifiedTime,
  listDriveProjects,
  loadProjectFromDrive,
  loadSharedProjectFromDrive,
  saveProjectPdfToDrive,
  saveProjectToDrive,
} from '@/core/storage/googleDriveService';
import { openDriveFilePicker, PickerNotConfiguredError } from '@/core/storage/googlePickerService';

const DRIVE_FALLBACK_POLL_INTERVAL_MS = 12_000;

export function getProjectContentSignature(p: DocumentProject): string {
  return JSON.stringify({
    name: p.name,
    templateType: p.templateType,
    metadata: p.metadata,
    blocks: p.blocks,
    references: p.references,
    templateConfig: p.templateConfig,
    sidebarConfig: p.sidebarConfig,
    deletedBlockTimestamps: p.deletedBlockTimestamps,
    blocksOrderUpdatedAt: p.blocksOrderUpdatedAt,
    metadataUpdatedAt: p.metadataUpdatedAt,
    referencesUpdatedAt: p.referencesUpdatedAt,
  });
}

function syncPdfCopyToDriveInBackground(projectToSync: DocumentProject, token: string): void {
  if (
    projectToSync.isSharedWithMe ||
    projectToSync.shareRole === 'reader' ||
    projectToSync.shareRole === 'commenter'
  ) {
    return;
  }
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
  collabConnectionStatus?: CollabConnectionStatus;
  isSharedOrCollabActive?: boolean;
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
  collabConnectionStatus = 'idle',
  isSharedOrCollabActive = false,
}: UseDriveSyncOrchestratorOptions) {
  const [rawDriveSyncStatus, setRawDriveSyncStatus] = useState<'synced' | 'syncing' | 'error'>(
    'synced',
  );
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isOpeningShared, setIsOpeningShared] = useState(false);
  const [sharedAccessError, setSharedAccessError] = useState<string | null>(null);

  const driveSyncStatus: 'local' | 'synced' | 'syncing' | 'error' =
    !isAuthenticated || !user ? 'local' : rawDriveSyncStatus;

  const isDriveSyncingRef = useRef(false);
  const driveFileIdByProjectIdRef = useRef<Record<string, string>>({});
  const lastSyncedSignatureRef = useRef<Record<string, string>>({});
  const latestProjectRef = useRef<DocumentProject>(project);
  useEffect(() => {
    latestProjectRef.current = project;
  }, [project]);

  const clearSharedAccessError = useCallback(() => setSharedAccessError(null), []);

  // Sincronização em segundo plano com o Google Drive (Debounce de 3.5 segundos)
  useEffect(() => {
    if (!isStorageReady || !isAuthenticated || !user || projectsCount === 0) {
      return;
    }

    // Nunca envia projetos locais de outro usuário nem projetos em modo somente leitura
    if (project.ownerEmail && project.ownerEmail !== user.email) {
      return;
    }
    if (project.shareRole === 'reader' || project.shareRole === 'commenter') {
      return;
    }

    const driveTimer = setTimeout(async () => {
      if (isDriveSyncingRef.current) {
        return;
      }

      const knownFileId = project.driveFileId || driveFileIdByProjectIdRef.current[project.id];
      const signature = getProjectContentSignature(project);

      if (
        knownFileId &&
        project.collabSecret &&
        lastSyncedSignatureRef.current[project.id] === signature
      ) {
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
          ownerEmail: project.ownerEmail || user.email,
        };

        const { fileId, modifiedTime, collabSecret } = await saveProjectToDrive(
          projectToSync,
          token,
        );
        driveFileIdByProjectIdRef.current[project.id] = fileId;
        lastSyncedSignatureRef.current[project.id] = signature;
        setRawDriveSyncStatus('synced');

        setProject((prev) => {
          if (prev.id !== project.id) return prev;
          return {
            ...prev,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            collabSecret,
            ownerEmail: prev.ownerEmail || user.email,
          };
        });

        const currentInDb = await getProject(project.id);
        if (currentInDb) {
          await saveProject(
            {
              ...currentInDb,
              driveFileId: fileId,
              driveSyncedAt: modifiedTime,
              collabSecret,
              ownerEmail: currentInDb.ownerEmail || user.email,
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
    const activeProj = latestProjectRef.current;
    if (activeProj.shareRole === 'reader' || activeProj.shareRole === 'commenter') {
      return activeProj.driveFileId ?? null;
    }

    try {
      let token = await getValidAccessToken(true);
      if (!token) {
        token = await login(false);
      }
      if (!token) return null;

      const knownFileId = activeProj.driveFileId || driveFileIdByProjectIdRef.current[activeProj.id];
      const projectToSync: DocumentProject = {
        ...activeProj,
        driveFileId: knownFileId,
      };

      setRawDriveSyncStatus('syncing');
      const { fileId, modifiedTime, collabSecret } = await saveProjectToDrive(
        projectToSync,
        token,
      );
      driveFileIdByProjectIdRef.current[activeProj.id] = fileId;
      lastSyncedSignatureRef.current[activeProj.id] = getProjectContentSignature(activeProj);

      setProject((prev) => {
        if (prev.id !== activeProj.id) return prev;
        return {
          ...prev,
          driveFileId: fileId,
          driveSyncedAt: modifiedTime,
          collabSecret,
          ownerEmail: prev.ownerEmail || user?.email,
        };
      });

      const currentInDb = await getProject(activeProj.id);
      if (currentInDb) {
        await saveProject(
          {
            ...currentInDb,
            driveFileId: fileId,
            driveSyncedAt: modifiedTime,
            collabSecret,
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
  }, [user, login, getValidAccessToken, setProject, setProjects]);

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
        let activeUpdatedCandidate: DocumentProject | null = null;
        const seenFileIds = new Set<string>();
        const activeId = latestProjectRef.current.id;

        for (const summary of driveSummaries) {
          if (seenFileIds.has(summary.id)) {
            continue;
          }
          seenFileIds.add(summary.id);

          const normName = summary.name.trim().toLowerCase();
          const existsLocally = currentProjects.find((p) => p.driveFileId === summary.id);

          if (existsLocally) {
            driveFileIdByProjectIdRef.current[existsLocally.id] = summary.id;
            const remoteTime = new Date(summary.modifiedTime).getTime();
            const localTime = new Date(
              existsLocally.driveSyncedAt || existsLocally.updatedAt,
            ).getTime();

            const summaryRole =
              summary.role ??
              existsLocally.shareRole ??
              (summary.isSharedWithMe ? 'writer' : 'owner');
            const metadataChanged =
              Boolean(summary.isSharedWithMe) !== Boolean(existsLocally.isSharedWithMe) ||
              summaryRole !== existsLocally.shareRole ||
              (summary.sharedBy?.email &&
                summary.sharedBy.email !== existsLocally.sharedBy?.email);

            if (remoteTime > localTime + 2000 || metadataChanged || !existsLocally.collabSecret) {
              try {
                const remoteLoaded = await loadProjectFromDrive(summary.id, token);
                remoteLoaded.ownerEmail = user.email;
                remoteLoaded.isSharedWithMe = summary.isSharedWithMe;
                remoteLoaded.sharedBy = summary.sharedBy ?? existsLocally.sharedBy;
                remoteLoaded.shareRole = summaryRole;

                const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(
                  existsLocally,
                  remoteLoaded,
                );

                const mergedWithMeta: DocumentProject = {
                  ...mergedProject,
                  driveSyncedAt: summary.modifiedTime || mergedProject.driveSyncedAt,
                  isSharedWithMe: summary.isSharedWithMe,
                  sharedBy: summary.sharedBy ?? mergedProject.sharedBy,
                  shareRole: summaryRole,
                };

                if (hasMergedRemoteChanges || metadataChanged) {
                  await saveProject(mergedWithMeta, false);
                  lastSyncedSignatureRef.current[mergedWithMeta.id] =
                    getProjectContentSignature(mergedWithMeta);
                  hasNewOrUpdated = true;
                  if (mergedWithMeta.id === activeId) {
                    activeUpdatedCandidate = mergedWithMeta;
                  }
                }
              } catch (err) {
                console.warn(`Erro ao mesclar alterações do Drive para ${summary.name}:`, err);
              }
            }
          } else {
            // Apenas vincula por nome a projeto local não sincronizado quando o arquivo é próprio do usuário
            const matchByName = !summary.isSharedWithMe
              ? currentProjects.find(
                  (p) => !p.driveFileId && p.name.trim().toLowerCase() === normName,
                )
              : undefined;

            if (matchByName) {
              const linked: DocumentProject = {
                ...matchByName,
                driveFileId: summary.id,
                driveSyncedAt: summary.modifiedTime,
                ownerEmail: user.email,
                isSharedWithMe: false,
                shareRole: 'owner',
              };
              await saveProject(linked, false);
              driveFileIdByProjectIdRef.current[linked.id] = summary.id;
              lastSyncedSignatureRef.current[linked.id] = getProjectContentSignature(linked);
              hasNewOrUpdated = true;
              if (linked.id === activeId) {
                activeUpdatedCandidate = linked;
              }
            } else {
              try {
                const loaded = await loadProjectFromDrive(summary.id, token);
                const idConflict = currentProjects.some((p) => p.id === loaded.id);
                const normalized = normalizeProject({
                  ...loaded,
                  id: idConflict ? crypto.randomUUID() : loaded.id,
                  ownerEmail: user.email,
                  driveFileId: summary.id,
                  driveSyncedAt: summary.modifiedTime || loaded.driveSyncedAt,
                  isSharedWithMe: summary.isSharedWithMe,
                  sharedBy: summary.sharedBy,
                  shareRole: summary.role ?? (summary.isSharedWithMe ? 'writer' : 'owner'),
                });
                const quotaCheck = validateProjectQuota(normalized);
                if (!quotaCheck.valid) {
                  console.warn(`Projeto ${summary.name} ignorado por exceder cota de imagens.`);
                  continue;
                }
                await saveProject(normalized, false);
                driveFileIdByProjectIdRef.current[normalized.id] = summary.id;
                lastSyncedSignatureRef.current[normalized.id] =
                  getProjectContentSignature(normalized);
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
          if (activeUpdatedCandidate) {
            setProject((prev) =>
              prev.id === activeUpdatedCandidate!.id ? activeUpdatedCandidate! : prev,
            );
          } else {
            const activeInAll = all.find((p) => p.id === activeId);
            if (
              activeInAll &&
              activeInAll.driveFileId &&
              activeInAll.driveFileId !== latestProjectRef.current.driveFileId
            ) {
              setProject(activeInAll);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao listar projetos do Drive:', err);
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [isAuthenticated, getValidAccessToken, user, setProjects, setProject],
  );

  /**
   * Abre um arquivo compartilhado ou externo do Google Drive pelo seu `fileId`.
   * Se bloqueado pelo escopo estrito `drive.file`, retorna `'needs_picker'` para abertura via Picker.
   */
  const openSharedDriveProject = useCallback(
    async (fileId: string): Promise<'opened' | 'needs_picker' | 'error'> => {
      if (!isAuthenticated || !user) {
        return 'error';
      }

      setSharedAccessError(null);
      setIsOpeningShared(true);
      try {
        const token = await getValidAccessToken(true);
        if (!token) {
          setSharedAccessError(
            'Não foi possível autenticar sua conta Google para abrir o arquivo compartilhado.',
          );
          return 'error';
        }

        const loaded = await loadSharedProjectFromDrive(fileId, token, user.email);
        const currentProjects = await listProjects(user.email);
        const existingByFileId = currentProjects.find((p) => p.driveFileId === fileId);

        let finalProject: DocumentProject;
        if (existingByFileId) {
          const { mergedProject } = autoMergeProjects(existingByFileId, loaded);
          finalProject = normalizeProject({
            ...mergedProject,
            driveFileId: fileId,
            driveSyncedAt: loaded.driveSyncedAt || mergedProject.driveSyncedAt,
            ownerEmail: user.email,
            isSharedWithMe: loaded.isSharedWithMe,
            sharedBy: loaded.sharedBy ?? existingByFileId.sharedBy,
            shareRole: loaded.shareRole,
            collabSecret: loaded.collabSecret || existingByFileId.collabSecret,
          });
        } else {
          const idConflict = currentProjects.some((p) => p.id === loaded.id);
          finalProject = normalizeProject({
            ...loaded,
            id: idConflict ? crypto.randomUUID() : loaded.id,
            ownerEmail: user.email,
          });
        }

        const quotaCheck = validateProjectQuota(finalProject);
        if (!quotaCheck.valid) {
          setSharedAccessError(
            quotaCheck.error || 'O projeto compartilhado excede o limite de imagens suportado.',
          );
          return 'error';
        }

        await saveProject(finalProject, false);
        const all = await listProjects(user.email);
        setProjects(all);
        driveFileIdByProjectIdRef.current[finalProject.id] = fileId;
        lastSyncedSignatureRef.current[finalProject.id] = getProjectContentSignature(finalProject);
        setProject(finalProject);
        setActiveProjectId(finalProject.id, user.email);
        setRawDriveSyncStatus('synced');
        return 'opened';
      } catch (err) {
        if (err instanceof DriveAccessError && err.code === 'NOT_FOUND_OR_SCOPE') {
          return 'needs_picker';
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao abrir projeto compartilhado no Google Drive.';
        setSharedAccessError(message);
        return 'error';
      } finally {
        setIsOpeningShared(false);
      }
    },
    [isAuthenticated, user, getValidAccessToken, setProjects, setProject],
  );

  /**
   * Abre o Google Picker oficial ("Compartilhados comigo" / "Meu Drive") para conceder autorização
   * estrita (`drive.file`) ao arquivo `.redija` escolhido e carregá-lo imediatamente no editor.
   */
  const openSharedViaPicker = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    setSharedAccessError(null);
    setIsOpeningShared(true);
    try {
      const token = await getValidAccessToken(true);
      if (!token) {
        setSharedAccessError('Sessão Google expirada. Entre novamente para selecionar o arquivo.');
        return false;
      }

      const picked = await openDriveFilePicker(token);
      if (!picked) {
        return false;
      }

      if (picked.mimeType === 'application/pdf' || picked.name.toLowerCase().endsWith('.pdf')) {
        setSharedAccessError(
          'Você selecionou a cópia em PDF. Selecione o arquivo ".redija" no Google Drive para abrir no editor.',
        );
        return false;
      }

      const outcome = await openSharedDriveProject(picked.fileId);
      if (outcome === 'needs_picker') {
        setSharedAccessError(
          'O Google Drive não concedeu leitura para o arquivo selecionado. Confirme se você escolheu o arquivo .redija correto.',
        );
        return false;
      }
      return outcome === 'opened';
    } catch (err) {
      if (err instanceof PickerNotConfiguredError) {
        setSharedAccessError(err.message);
        return false;
      }
      const message =
        err instanceof Error ? err.message : 'Não foi possível abrir o seletor do Google Drive.';
      setSharedAccessError(message);
      return false;
    } finally {
      setIsOpeningShared(false);
    }
  }, [isAuthenticated, user, getValidAccessToken, openSharedDriveProject]);

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

  // Polling adaptativo leve (12s) quando o arquivo é compartilhado ou P2P caiu para fallback Drive
  const shouldPollDriveFallback =
    isAuthenticated &&
    Boolean(user) &&
    isStorageReady &&
    Boolean(project.driveFileId) &&
    (Boolean(project.isSharedWithMe) ||
      collabConnectionStatus === 'fallback_drive' ||
      isSharedOrCollabActive);

  useEffect(() => {
    if (!shouldPollDriveFallback || !user || !project.driveFileId) {
      return;
    }

    const activeFileId = project.driveFileId;
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible' || isDriveSyncingRef.current) {
        return;
      }

      try {
        const token = await getValidAccessToken(false);
        if (!token) return;

        const remoteModified = await getDriveFileModifiedTime(activeFileId, token);
        if (!remoteModified) return;

        const current = latestProjectRef.current;
        if (current.driveFileId !== activeFileId) return;

        const remoteTs = new Date(remoteModified).getTime();
        const localSyncedTs = new Date(current.driveSyncedAt || 0).getTime();
        if (!Number.isFinite(remoteTs) || remoteTs <= localSyncedTs + 1500) {
          return;
        }

        const remoteLoaded = await loadSharedProjectFromDrive(activeFileId, token, user.email);
        const latestNow = latestProjectRef.current;
        if (latestNow.driveFileId !== activeFileId) return;

        const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(latestNow, remoteLoaded);
        const roleChanged =
          remoteLoaded.shareRole !== undefined && remoteLoaded.shareRole !== latestNow.shareRole;

        if (!hasMergedRemoteChanges && !roleChanged) {
          // Apenas atualiza driveSyncedAt para não consultar novamente sem alterações
          setProject((prev) =>
            prev.id === latestNow.id
              ? { ...prev, driveSyncedAt: remoteModified || prev.driveSyncedAt }
              : prev,
          );
          return;
        }

        const mergedFinal: DocumentProject = {
          ...mergedProject,
          driveSyncedAt: remoteModified || mergedProject.driveSyncedAt,
          ownerEmail: latestNow.ownerEmail || user.email,
          shareRole: remoteLoaded.shareRole ?? mergedProject.shareRole,
          isSharedWithMe: remoteLoaded.isSharedWithMe ?? mergedProject.isSharedWithMe,
          sharedBy: remoteLoaded.sharedBy ?? mergedProject.sharedBy,
        };

        lastSyncedSignatureRef.current[mergedFinal.id] = getProjectContentSignature(mergedFinal);
        await saveProject(mergedFinal, false);
        const all = await listProjects(user.email);
        setProjects(all);
        setProject((prev) => (prev.id === mergedFinal.id ? mergedFinal : prev));
      } catch (err) {
        if (err instanceof DriveAccessError && err.code === 'AUTH_EXPIRED') {
          setRawDriveSyncStatus('error');
        }
      }
    }, DRIVE_FALLBACK_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [
    shouldPollDriveFallback,
    user,
    project.driveFileId,
    getValidAccessToken,
    setProject,
    setProjects,
  ]);

  return {
    driveSyncStatus,
    isSyncingDrive,
    isOpeningShared,
    sharedAccessError,
    clearSharedAccessError,
    handleSyncFromDrive,
    handleEnsureProjectSavedToDrive,
    openSharedDriveProject,
    openSharedViaPicker,
  };
}
