import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentProject } from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { compileProjectToPdf } from '@/core/typst/projectCompiler';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import {
  getProject,
  listAllProjectsForOwner,
  listProjects,
  moveProjectToTrash,
  restoreProjectFromTrash,
  saveProject,
  setProjectDriveTrashSync,
} from '@/core/storage/db';
import {
  planDriveTrashReconciliation,
  readDriveTombstones,
  removeDriveTombstone,
  resolveRestoredProjectName,
} from '@/core/storage/driveTrash';
import { pushTrashStateToDrive } from '@/core/storage/driveTrashSync';
import { subscribeCustomTemplateMutations } from '@/core/storage/customTemplates';
import {
  CUSTOM_TEMPLATES_SYNC_DEBOUNCE_MS,
  syncCustomTemplatesWithDrive,
} from '@/core/storage/customTemplatesSync';
import { subscribeReferenceLibraryMutations } from '@/core/storage/referenceLibrary';
import {
  REFERENCE_LIBRARY_SYNC_DEBOUNCE_MS,
  syncReferenceLibraryWithDrive,
} from '@/core/storage/referenceLibrarySync';
import {
  deleteDriveProject,
  listDriveProjects,
  listTrashedDriveProjectIds,
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

/** Modelos personalizados da conta ↔ `redija-modelos.json` no Drive (nunca o perfil local). */
function syncCustomTemplatesInBackground(ownerEmail: string, token: string): void {
  syncCustomTemplatesWithDrive(ownerEmail, token).catch((err) => {
    console.warn('Não foi possível sincronizar os modelos personalizados com o Drive:', err);
  });
}

/** Biblioteca de referências da conta ↔ `redija-biblioteca.json` no Drive (RDJ-07.4). */
function syncReferenceLibraryInBackground(ownerEmail: string, token: string): void {
  syncReferenceLibraryWithDrive(ownerEmail, token).catch((err) => {
    console.warn('Não foi possível sincronizar a biblioteca de referências com o Drive:', err);
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
  /** Chamado quando a sincronização move projetos para dentro/fora da lixeira local. */
  onTrashStateChanged?: () => void | Promise<void>;
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
  onTrashStateChanged,
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

      // Projeto que acabou de ir para a lixeira não deve ser reenviado (nem recriado) no Drive.
      const stored = await getProject(project.id);
      if (stored?.deletedAt) {
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

        // Modelos personalizados e biblioteca de referências seguem em paralelo.
        syncCustomTemplatesInBackground(user.email, token);
        syncReferenceLibraryInBackground(user.email, token);

        const [driveSummaries, trashedDriveIds] = await Promise.all([
          listDriveProjects(token),
          listTrashedDriveProjectIds(token).catch((err) => {
            console.warn('Não foi possível consultar a lixeira do Drive:', err);
            return null;
          }),
        ]);
        const activeDriveIds = new Set(driveSummaries.map((s) => s.id));
        let hasNewOrUpdated = false;
        let hasTrashChanges = false;

        // 1. Exclusões definitivas pendentes / arquivos compartilhados escondidos pelo usuário
        const tombstones = readDriveTombstones(user.email);
        for (const [fileId, tomb] of Object.entries(tombstones)) {
          const isStillOnDrive =
            activeDriveIds.has(fileId) || Boolean(trashedDriveIds?.has(fileId));
          if (!isStillOnDrive) {
            if (trashedDriveIds) removeDriveTombstone(user.email, fileId);
            continue;
          }
          if (tomb.mode === 'delete') {
            try {
              await deleteDriveProject(fileId, token, tomb.projectId);
              removeDriveTombstone(user.email, fileId);
            } catch (err) {
              console.warn('Exclusão definitiva no Drive ainda pendente:', err);
            }
          }
        }
        const tombstonedFileIds = new Set(Object.keys(tombstones));

        // 2. Lixeira local × lixeira do Drive (pendências, exclusões/restaurações de outro dispositivo)
        const localBeforeTrashSync = await listAllProjectsForOwner(user.email);
        const trashPlan = planDriveTrashReconciliation(
          localBeforeTrashSync,
          activeDriveIds,
          trashedDriveIds ?? new Set<string>(),
        );
        for (const action of trashPlan.actions) {
          // Sem a lista da lixeira do Drive só é seguro reenviar exclusões pendentes.
          if (!trashedDriveIds && action.kind !== 'retry-drive-trash') continue;
          const target = action.project;
          switch (action.kind) {
            case 'retry-drive-trash':
              await pushTrashStateToDrive(target, true, token);
              break;
            case 'retry-drive-restore':
              await pushTrashStateToDrive(target, false, token);
              break;
            case 'mark-synced':
              await setProjectDriveTrashSync(target.id, target.deletedAt ? 'synced' : null);
              break;
            case 'trash-locally':
              await moveProjectToTrash(target.id, 'synced');
              hasTrashChanges = true;
              break;
            case 'restore-locally': {
              const activeNames = (await listProjects(user.email)).map((p) => p.name);
              const freeName = resolveRestoredProjectName(target.name, activeNames);
              await restoreProjectFromTrash(target.id, {
                name: freeName !== target.name ? freeName : undefined,
              });
              hasTrashChanges = true;
              break;
            }
          }
        }

        // 3. Importa/mescla os arquivos ativos do Drive, ignorando tudo que o usuário excluiu
        const allLocal = await listAllProjectsForOwner(user.email);
        const currentProjects = allLocal.filter((p) => !p.deletedAt);
        const trashedLocal = allLocal.filter((p) => Boolean(p.deletedAt));
        const seenKeys = new Set<string>();

        for (const summary of driveSummaries) {
          if (tombstonedFileIds.has(summary.id) || trashPlan.skipFileIds.has(summary.id)) {
            continue;
          }
          if (
            trashedLocal.some(
              (p) => p.driveFileId === summary.id || p.id === summary.redijaProjectId,
            )
          ) {
            continue;
          }

          const normName = summary.name.trim().toLowerCase();
          // Arquivos com o mesmo `redijaProjectId` são o mesmo projeto (fica o mais recente).
          // Só arquivos legados, sem esse vínculo, são deduplicados pelo nome.
          const dedupeKey = summary.redijaProjectId
            ? `id:${summary.redijaProjectId}`
            : `name:${normName}`;
          if (seenKeys.has(dedupeKey)) {
            continue;
          }
          seenKeys.add(dedupeKey);

          const existsLocally =
            currentProjects.find((p) => p.driveFileId === summary.id) ??
            (summary.redijaProjectId
              ? currentProjects.find((p) => p.id === summary.redijaProjectId)
              : undefined);
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
            // Vínculo por nome só para arquivos legados: um arquivo que já pertence a outro
            // projeto (`redijaProjectId`) nunca é "adotado" por um homônimo local.
            const matchByName = summary.redijaProjectId
              ? undefined
              : currentProjects.find(
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
                const existingRecord = await getProject(loaded.id);
                if (existingRecord?.deletedAt) {
                  // Mesmo projeto já está na lixeira local: nunca reimportar.
                  continue;
                }
                loaded.ownerEmail = user.email;
                loaded.deletedAt = null;
                loaded.driveTrashSync = null;
                loaded.isSharedWithMe = summary.isSharedWithMe;
                if (summary.sharedBy) loaded.sharedBy = summary.sharedBy;
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
        if (hasTrashChanges) {
          await onTrashStateChanged?.();
        }
      } catch (err) {
        console.error('Erro ao listar projetos do Drive:', err);
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [
      isAuthenticated,
      getValidAccessToken,
      user,
      project.id,
      project.driveFileId,
      setProjects,
      setProject,
      onTrashStateChanged,
    ],
  );

  // Envia ao Drive os modelos personalizados adicionados, removidos ou restaurados (com debounce).
  // Só reage ao dono logado: alterações no perfil local nunca saem deste navegador.
  useEffect(() => {
    if (!isAuthenticated || !user || !isStorageReady) return;
    const ownerEmail = user.email;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeCustomTemplateMutations((changedOwner) => {
      if (changedOwner !== ownerEmail) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const token = await getValidAccessToken();
        if (token) syncCustomTemplatesInBackground(ownerEmail, token);
      }, CUSTOM_TEMPLATES_SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer) {
        // Alteração ainda não enviada: envia já (se ainda houver sessão) em vez de descartar.
        clearTimeout(timer);
        void getValidAccessToken().then((token) => {
          if (token) syncCustomTemplatesInBackground(ownerEmail, token);
        });
      }
    };
  }, [isAuthenticated, user, isStorageReady, getValidAccessToken]);

  // Envia ao Drive as alterações na biblioteca de referências (RDJ-07.4).
  useEffect(() => {
    if (!isAuthenticated || !user || !isStorageReady) return;
    const ownerEmail = user.email;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeReferenceLibraryMutations((changedOwner) => {
      if (changedOwner !== ownerEmail) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const token = await getValidAccessToken();
        if (token) syncReferenceLibraryInBackground(ownerEmail, token);
      }, REFERENCE_LIBRARY_SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        void getValidAccessToken().then((token) => {
          if (token) syncReferenceLibraryInBackground(ownerEmail, token);
        });
      }
    };
  }, [isAuthenticated, user, isStorageReady, getValidAccessToken]);

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
        void handleSyncFromDrive();
      }
    };
    const handleOnline = () => {
      void handleSyncFromDrive();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, handleSyncFromDrive]);

  return {
    driveSyncStatus,
    isSyncingDrive,
    handleSyncFromDrive,
    handleEnsureProjectSavedToDrive,
  };
}
