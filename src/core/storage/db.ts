// =====================================================================
// RedijaApp: Camada de Persistência Local (IndexedDB via Dexie)
// =====================================================================

import Dexie, { type Table } from 'dexie';
import { DocumentProject, RedijaBackupFile } from '@/types/document';
import { validateProjectQuota } from './imageQuota';
import { normalizeProject } from './schemaNormalizer';
import { saveEmergencySnapshot } from './emergencyBackup';

const ACTIVE_PROJECT_KEY = 'redija:activeProjectId';
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface CachedUniversePackage {
  id: string; // Ex: "@preview/charged-ieee:0.1.4"
  name: string;
  version: string;
  entrypoint: string;
  files: Record<string, string>;
  tarGzBytes?: Uint8Array;
  downloadedAt: string;
}

export class RedijaDatabase extends Dexie {
  projects!: Table<DocumentProject, string>;
  universePackages!: Table<CachedUniversePackage, string>;

  constructor() {
    super('RedijaAppDB');
    this.version(1).stores({
      projects: 'id, updatedAt, name, templateType',
    });
    this.version(2).stores({
      projects: 'id, updatedAt, name, templateType, deletedAt',
    });
    this.version(3).stores({
      projects: 'id, updatedAt, name, templateType, deletedAt, driveFileId, ownerEmail',
    });
    this.version(4).stores({
      projects: 'id, updatedAt, name, templateType, deletedAt, driveFileId, ownerEmail',
      universePackages: 'id, name, version, downloadedAt',
    });
  }
}

export const db = new RedijaDatabase();

/**
 * Solicita persistência permanente de dados ao navegador (blindagem contra despejo automático por falta de disco).
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Verifica se o armazenamento local do navegador já possui persistência concedida.
 */
export async function checkStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Lista projetos ATIVOS (não excluídos), filtrando por proprietário quando especificado.
 * - Se `ownerEmail` for omitido/undefined: retorna todos os projetos (compatibilidade com testes e rotinas globais).
 * - Se `ownerEmail` for 'local' ou vazio: retorna apenas projetos locais (sem ownerEmail ou marcado como 'local').
 * - Se `ownerEmail` for um e-mail específico (ex: 'aluno@gmail.com'): retorna apenas projetos daquele usuário.
 */
export async function listProjects(ownerEmail?: string | null): Promise<DocumentProject[]> {
  const all = await db.projects.orderBy('updatedAt').reverse().toArray();
  const active = all.filter((p) => !p.deletedAt).map(normalizeProject);
  if (ownerEmail === undefined) {
    return active;
  }
  if (!ownerEmail || ownerEmail === 'local') {
    return active.filter((p) => !p.ownerEmail || p.ownerEmail === 'local');
  }
  return active.filter((p) => p.ownerEmail === ownerEmail);
}

/**
 * Lista os projetos que estão na Lixeira (`deletedAt` preenchido), mais recentes primeiro,
 * filtrando por proprietário quando especificado.
 */
export async function listTrashedProjects(ownerEmail?: string | null): Promise<DocumentProject[]> {
  const all = await db.projects.toArray();
  const trashed = all
    .filter((p) => Boolean(p.deletedAt))
    .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
    .map(normalizeProject);
  if (ownerEmail === undefined) {
    return trashed;
  }
  if (!ownerEmail || ownerEmail === 'local') {
    return trashed.filter((p) => !p.ownerEmail || p.ownerEmail === 'local');
  }
  return trashed.filter((p) => p.ownerEmail === ownerEmail);
}

/**
 * Calcula quantos dias restam na lixeira antes da exclusão definitiva (30 dias).
 */
export function getRemainingTrashDays(deletedAt?: string | null): number {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const deletedTime = new Date(deletedAt).getTime();
  if (Number.isNaN(deletedTime)) return TRASH_RETENTION_DAYS;
  const elapsedMs = Date.now() - deletedTime;
  const remainingMs = TRASH_RETENTION_MS - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

/**
 * Remove definitivamente os projetos cuja permanência na lixeira ultrapassou 30 dias.
 */
export async function purgeExpiredTrash(): Promise<number> {
  const trashed = await listTrashedProjects();
  const now = Date.now();
  let purgedCount = 0;

  for (const proj of trashed) {
    const deletedTime = new Date(proj.deletedAt!).getTime();
    if (!Number.isNaN(deletedTime) && now - deletedTime >= TRASH_RETENTION_MS) {
      await db.projects.delete(proj.id);
      purgedCount++;
    }
  }
  return purgedCount;
}

/**
 * Obtém um projeto pelo seu ID.
 */
export async function getProject(id: string): Promise<DocumentProject | undefined> {
  const p = await db.projects.get(id);
  return p ? normalizeProject(p) : undefined;
}

/**
 * Salva (cria ou atualiza) um projeto no IndexedDB, atualizando o campo `updatedAt`.
 * Também salva um snapshot de emergência prévio no localStorage para blindagem total.
 */
export async function saveProject(
  project: DocumentProject,
  touchTimestamp = true,
): Promise<DocumentProject> {
  saveEmergencySnapshot(project);
  const updated: DocumentProject = {
    ...project,
    updatedAt: touchTimestamp ? new Date().toISOString() : project.updatedAt,
  };
  await db.projects.put(updated);
  return updated;
}

/**
 * Duplica um projeto existente com novo ID e sufixo "(Cópia)".
 */
export async function duplicateProject(id: string): Promise<DocumentProject | undefined> {
  const original = await db.projects.get(id);
  if (!original) return undefined;

  const clone: DocumentProject = {
    ...structuredClone(original),
    id: crypto.randomUUID(),
    name: `${original.name} (Cópia)`,
    updatedAt: new Date().toISOString(),
    driveFileId: undefined,
    driveSyncedAt: undefined,
    isSharedWithMe: false,
    sharedBy: undefined,
    shareRole: 'owner',
    collabSecret: undefined,
  };

  await db.projects.put(clone);
  return clone;
}

/**
 * Move um projeto para a Lixeira (retenção de 30 dias).
 */
export async function moveProjectToTrash(id: string): Promise<DocumentProject | undefined> {
  const target = await db.projects.get(id);
  if (!target) return undefined;
  const trashed: DocumentProject = {
    ...target,
    deletedAt: new Date().toISOString(),
  };
  await db.projects.put(trashed);
  return trashed;
}

/**
 * Restaura um projeto da Lixeira para a lista principal.
 */
export async function restoreProjectFromTrash(id: string): Promise<DocumentProject | undefined> {
  const target = await db.projects.get(id);
  if (!target) return undefined;
  const restored: DocumentProject = {
    ...target,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await db.projects.put(restored);
  return restored;
}

/**
 * Exclui permanentemente um projeto do IndexedDB.
 */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

/**
 * Carrega a lista de projetos do banco IndexedDB e o projeto ativo da sessão atual (se houver).
 * Isola projetos locais de projetos de contas Google.
 * Se o banco estiver vazio para esta sessão, retorna lista vazia sem criar projetos automaticamente.
 */
export async function loadInitialActiveProject(ownerEmail?: string | null): Promise<{
  activeProject: DocumentProject | null;
  allProjects: DocumentProject[];
  trashedProjects: DocumentProject[];
}> {
  await purgeExpiredTrash();
  const all = await listProjects(ownerEmail);
  const trashedProjects = await listTrashedProjects(ownerEmail);

  const scopeKey =
    ownerEmail && ownerEmail !== 'local'
      ? `${ACTIVE_PROJECT_KEY}:${ownerEmail}`
      : `${ACTIVE_PROJECT_KEY}:local`;

  let activeId: string | null = null;
  try {
    activeId = localStorage.getItem(scopeKey) || localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    activeId = null;
  }

  const found = activeId ? all.find((p) => p.id === activeId) : undefined;
  const activeProject = found ?? (all.length > 0 ? all[0] : null);

  if (activeProject) {
    setActiveProjectId(activeProject.id, ownerEmail);
  }

  return { activeProject, allProjects: all, trashedProjects };
}

export function setActiveProjectId(id: string, ownerEmail?: string | null): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    const scopeKey =
      ownerEmail && ownerEmail !== 'local'
        ? `${ACTIVE_PROJECT_KEY}:${ownerEmail}`
        : `${ACTIVE_PROJECT_KEY}:local`;
    localStorage.setItem(scopeKey, id);
  } catch {
    // Ignorar se localStorage estiver indisponível
  }
}

/**
 * Serializa um projeto para o formato de arquivo de backup `.redija`.
 */
export function serializeBackup(project: DocumentProject): string {
  const payload: RedijaBackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Lê e valida um arquivo `.redija` (ou JSON de projeto), atribuindo um novo ID
 * para evitar colisões caso o projeto já exista localmente.
 */
export function parseBackup(jsonString: string): DocumentProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Arquivo inválido: o conteúdo não é um JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Estrutura de arquivo .redija inválida.');
  }

  const candidate =
    'project' in parsed && parsed.project && typeof parsed.project === 'object'
      ? (parsed.project as Partial<DocumentProject>)
      : (parsed as Partial<DocumentProject>);

  if (
    typeof candidate.name !== 'string' ||
    !candidate.metadata ||
    !Array.isArray(candidate.blocks) ||
    !Array.isArray(candidate.references)
  ) {
    throw new Error(
      'O arquivo selecionado não contém os dados obrigatórios de um projeto do RedijaApp.',
    );
  }

  const projectToImport: DocumentProject = {
    id: crypto.randomUUID(),
    name: candidate.name,
    templateType: candidate.templateType ?? 'tcc',
    metadata: {
      title: candidate.metadata.title ?? '',
      subtitle: candidate.metadata.subtitle ?? '',
      author: candidate.metadata.author ?? '',
      advisor: candidate.metadata.advisor ?? '',
      nature: candidate.metadata.nature ?? '',
      institution: candidate.metadata.institution ?? '',
      course: candidate.metadata.course ?? '',
      location: candidate.metadata.location ?? '',
      year: candidate.metadata.year ?? String(new Date().getFullYear()),
      abstract: candidate.metadata.abstract ?? '',
      keywords: Array.isArray(candidate.metadata.keywords) ? candidate.metadata.keywords : [],
      coadvisor: candidate.metadata.coadvisor,
      includeApprovalPage: candidate.metadata.includeApprovalPage,
      approvalDate: candidate.metadata.approvalDate,
      committeeMembers: candidate.metadata.committeeMembers,
      includeFiguresList: candidate.metadata.includeFiguresList,
      includeBoxesList: candidate.metadata.includeBoxesList,
      includeTablesList: candidate.metadata.includeTablesList,
      institutionLogoDataUrl: candidate.metadata.institutionLogoDataUrl,
      abbreviations: candidate.metadata.abbreviations,
      symbols: candidate.metadata.symbols,
      glossary: candidate.metadata.glossary,
      appendices: candidate.metadata.appendices,
      annexes: candidate.metadata.annexes,
    },
    templateConfig: candidate.templateConfig,
    blocks: candidate.blocks,
    references: candidate.references,
    updatedAt: new Date().toISOString(),
  };

  const quotaCheck = validateProjectQuota(projectToImport);
  if (!quotaCheck.valid) {
    throw new Error(quotaCheck.error);
  }

  return projectToImport;
}
