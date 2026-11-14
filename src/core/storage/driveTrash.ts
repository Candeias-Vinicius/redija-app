// =====================================================================
// RedijaApp: Regras da Lixeira sincronizada com o Google Drive
// =====================================================================
//
// A fonte da verdade da lixeira é a lixeira nativa do Google Drive (`trashed = true`):
// - Excluir um projeto → o arquivo `.redija` vai para a lixeira do Drive (some em todo dispositivo).
// - Restaurar → o arquivo sai da lixeira do Drive.
// - Excluir de vez → DELETE no Drive.
//
// O estado local (`deletedAt` + `driveTrashSync`) serve de reserva enquanto o Drive não confirma
// (ex.: sem internet). As funções deste módulo são puras para poderem ser testadas isoladamente.

import { DocumentProject } from '@/types/document';

export type DriveTrashAction =
  /** Lixeira local ainda não chegou ao Drive: tentar de novo. */
  | { kind: 'retry-drive-trash'; project: DocumentProject }
  /** Restauração local ainda não chegou ao Drive: tentar de novo. */
  | { kind: 'retry-drive-restore'; project: DocumentProject }
  /** Drive já reflete o estado local: só atualizar a marcação. */
  | { kind: 'mark-synced'; project: DocumentProject }
  /** Projeto foi para a lixeira em outro dispositivo (ou direto no Drive). */
  | { kind: 'trash-locally'; project: DocumentProject }
  /** Projeto foi restaurado em outro dispositivo (ou direto no Drive). */
  | { kind: 'restore-locally'; project: DocumentProject };

export interface DriveTrashPlan {
  actions: DriveTrashAction[];
  /** Arquivos do Drive que a sincronização NÃO deve importar nem mesclar. */
  skipFileIds: Set<string>;
}

/**
 * Compara a lixeira local com o Drive e decide o que fazer com cada projeto vinculado.
 *
 * @param localProjects projetos locais do usuário, INCLUINDO os que estão na lixeira
 * @param activeDriveIds arquivos `.redija` ativos no Drive
 * @param trashedDriveIds arquivos `.redija` na lixeira do Drive
 */
export function planDriveTrashReconciliation(
  localProjects: DocumentProject[],
  activeDriveIds: Set<string>,
  trashedDriveIds: Set<string>,
): DriveTrashPlan {
  const actions: DriveTrashAction[] = [];
  const skipFileIds = new Set<string>();

  for (const project of localProjects) {
    const fileId = project.driveFileId;
    if (!fileId) continue;

    const isActiveOnDrive = activeDriveIds.has(fileId);
    const isTrashedOnDrive = trashedDriveIds.has(fileId);
    const state = project.driveTrashSync;

    if (project.deletedAt) {
      if (state === 'local-only') {
        skipFileIds.add(fileId);
        continue;
      }
      if (state === 'synced') {
        if (isActiveOnDrive) {
          actions.push({ kind: 'restore-locally', project });
        } else {
          skipFileIds.add(fileId);
        }
        continue;
      }
      // `pending-trash` ou legado (lixeira criada antes da sincronização com o Drive):
      // a intenção local de excluir prevalece.
      skipFileIds.add(fileId);
      if (isActiveOnDrive) {
        actions.push({ kind: 'retry-drive-trash', project });
      } else {
        actions.push({ kind: 'mark-synced', project });
      }
      continue;
    }

    if (state === 'pending-restore') {
      if (isTrashedOnDrive) {
        actions.push({ kind: 'retry-drive-restore', project });
      } else {
        actions.push({ kind: 'mark-synced', project });
      }
      continue;
    }

    if (isTrashedOnDrive && !isActiveOnDrive) {
      skipFileIds.add(fileId);
      actions.push({ kind: 'trash-locally', project });
    }
  }

  return { actions, skipFileIds };
}

/**
 * Gera um nome livre para um projeto restaurado, evitando colidir com projetos ativos.
 * Ex.: "Meu TCC" → "Meu TCC (restaurado)" → "Meu TCC (restaurado 2)".
 */
export function resolveRestoredProjectName(name: string, activeNames: string[]): string {
  const taken = new Set(activeNames.map((n) => n.trim().toLowerCase()));
  const base = name.trim() || 'Sem Titulo';
  if (!taken.has(base.toLowerCase())) return base;

  let candidate = `${base} (restaurado)`;
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (restaurado ${counter})`;
    counter++;
  }
  return candidate;
}

// ---------------------------------------------------------------------
// Marcas de exclusão definitiva (tombstones)
// ---------------------------------------------------------------------
//
// Depois de "Excluir de vez" o projeto some do IndexedDB, então a marca precisa viver em outro
// lugar enquanto o Drive não confirmar a exclusão (`delete`) — ou para sempre, no caso de arquivos
// compartilhados que o usuário só quer esconder da própria lista (`hide`).

export type DriveTombstoneMode = 'delete' | 'hide';

export interface DriveTombstone {
  mode: DriveTombstoneMode;
  projectId: string;
  at: string;
}

const TOMBSTONE_KEY_PREFIX = 'redija:driveTombstones:';
const TOMBSTONE_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;

function tombstoneKey(ownerEmail: string): string {
  return `${TOMBSTONE_KEY_PREFIX}${ownerEmail}`;
}

export function readDriveTombstones(ownerEmail: string): Record<string, DriveTombstone> {
  try {
    const raw = localStorage.getItem(tombstoneKey(ownerEmail));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DriveTombstone>;
    if (!parsed || typeof parsed !== 'object') return {};

    // `delete` expira (o Drive apaga a lixeira sozinho em 30 dias); `hide` é permanente.
    const now = Date.now();
    const fresh: Record<string, DriveTombstone> = {};
    for (const [fileId, tomb] of Object.entries(parsed)) {
      if (!tomb || (tomb.mode !== 'delete' && tomb.mode !== 'hide')) continue;
      const age = now - new Date(tomb.at).getTime();
      if (tomb.mode === 'delete' && !(age < TOMBSTONE_RETENTION_MS)) continue;
      fresh[fileId] = tomb;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeDriveTombstones(ownerEmail: string, tombstones: Record<string, DriveTombstone>) {
  try {
    if (Object.keys(tombstones).length === 0) {
      localStorage.removeItem(tombstoneKey(ownerEmail));
    } else {
      localStorage.setItem(tombstoneKey(ownerEmail), JSON.stringify(tombstones));
    }
  } catch {
    // localStorage indisponível: a exclusão local continua valendo nesta sessão.
  }
}

export function addDriveTombstone(
  ownerEmail: string,
  fileId: string,
  mode: DriveTombstoneMode,
  projectId: string,
): void {
  const current = readDriveTombstones(ownerEmail);
  current[fileId] = { mode, projectId, at: new Date().toISOString() };
  writeDriveTombstones(ownerEmail, current);
}

export function removeDriveTombstone(ownerEmail: string, fileId: string): void {
  const current = readDriveTombstones(ownerEmail);
  if (!(fileId in current)) return;
  delete current[fileId];
  writeDriveTombstones(ownerEmail, current);
}
