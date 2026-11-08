// =====================================================================
// RedijaApp: Sistema de Backup Local de Emergência (Runtime Shield)
// Salva snapshots instantâneos na memória do navegador antes de
// operações de risco (sincronização com nuvem, importação, migração).
// =====================================================================

import { DocumentProject } from '@/types/document';

const EMERGENCY_PREFIX = 'redija:emergency_backup:';
const EMERGENCY_INDEX_KEY = 'redija:emergency_backups_index';
const MAX_SNAPSHOTS_PER_PROJECT = 5;

export interface EmergencySnapshot {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  project: DocumentProject;
}

/**
 * Cria um snapshot de emergência do projeto no localStorage.
 */
export function saveEmergencySnapshot(project: DocumentProject): EmergencySnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const snapshotId = `${project.id}_${Date.now()}`;
    const snapshot: EmergencySnapshot = {
      id: snapshotId,
      projectId: project.id,
      projectName: project.name,
      timestamp: new Date().toISOString(),
      project: structuredClone(project),
    };

    const storageKey = `${EMERGENCY_PREFIX}${snapshotId}`;
    localStorage.setItem(storageKey, JSON.stringify(snapshot));

    // Atualiza o índice de snapshots
    let index: string[] = [];
    try {
      const raw = localStorage.getItem(EMERGENCY_INDEX_KEY);
      if (raw) index = JSON.parse(raw);
    } catch {
      index = [];
    }

    if (!Array.isArray(index)) index = [];
    index.unshift(storageKey);

    // Limita número de snapshots mantidos
    const projectSnapshots = index.filter((k) => k.startsWith(`${EMERGENCY_PREFIX}${project.id}_`));
    if (projectSnapshots.length > MAX_SNAPSHOTS_PER_PROJECT) {
      const toRemove = projectSnapshots.slice(MAX_SNAPSHOTS_PER_PROJECT);
      for (const key of toRemove) {
        localStorage.removeItem(key);
        index = index.filter((k) => k !== key);
      }
    }

    localStorage.setItem(EMERGENCY_INDEX_KEY, JSON.stringify(index.slice(0, 30)));
    return snapshot;
  } catch (err) {
    console.warn('Não foi possível gravar snapshot de emergência no localStorage:', err);
    return null;
  }
}

/**
 * Recupera o snapshot de emergência mais recente de um projeto.
 */
export function getLatestEmergencySnapshot(projectId: string): EmergencySnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const rawIndex = localStorage.getItem(EMERGENCY_INDEX_KEY);
    if (!rawIndex) return null;
    const index: string[] = JSON.parse(rawIndex);
    if (!Array.isArray(index)) return null;

    for (const key of index) {
      if (key.startsWith(`${EMERGENCY_PREFIX}${projectId}_`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          return JSON.parse(raw) as EmergencySnapshot;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Remove todos os snapshots de emergência de um projeto após confirmação de salvamento estável.
 */
export function clearEmergencySnapshots(projectId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const rawIndex = localStorage.getItem(EMERGENCY_INDEX_KEY);
    if (!rawIndex) return;
    const index: string[] = JSON.parse(rawIndex);
    if (!Array.isArray(index)) return;

    const remaining: string[] = [];
    for (const key of index) {
      if (key.startsWith(`${EMERGENCY_PREFIX}${projectId}_`)) {
        localStorage.removeItem(key);
      } else {
        remaining.push(key);
      }
    }
    localStorage.setItem(EMERGENCY_INDEX_KEY, JSON.stringify(remaining));
  } catch {
    // Ignora erros ao limpar
  }
}
