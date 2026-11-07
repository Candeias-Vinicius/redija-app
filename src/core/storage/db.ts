// =====================================================================
// RedijaApp — Camada de Persistência Local (IndexedDB via Dexie)
// =====================================================================

import Dexie, { type Table } from 'dexie';
import { DocumentProject, RedijaBackupFile } from '@/types/document';
import { createProjectFromTemplate } from './projectTemplates';

const ACTIVE_PROJECT_KEY = 'redija:activeProjectId';
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export class RedijaDatabase extends Dexie {
  projects!: Table<DocumentProject, string>;

  constructor() {
    super('RedijaAppDB');
    this.version(1).stores({
      projects: 'id, updatedAt, name, templateType',
    });
    this.version(2).stores({
      projects: 'id, updatedAt, name, templateType, deletedAt',
    });
  }
}

export const db = new RedijaDatabase();

/**
 * Lista todos os projetos ATIVOS (não excluídos), ordenados pela data de atualização.
 */
export async function listProjects(): Promise<DocumentProject[]> {
  const all = await db.projects.orderBy('updatedAt').reverse().toArray();
  return all.filter((p) => !p.deletedAt);
}

/**
 * Lista os projetos que estão na Lixeira (`deletedAt` preenchido), mais recentes primeiro.
 */
export async function listTrashedProjects(): Promise<DocumentProject[]> {
  const all = await db.projects.toArray();
  return all
    .filter((p) => Boolean(p.deletedAt))
    .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
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
  return db.projects.get(id);
}

/**
 * Salva (cria ou atualiza) um projeto no IndexedDB, atualizando o campo `updatedAt`.
 */
export async function saveProject(
  project: DocumentProject,
  touchTimestamp = true,
): Promise<DocumentProject> {
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
 * Garante que exista ao menos um projeto inicial no banco, limpa itens expirados
 * da lixeira (> 30 dias) e retorna o projeto ativo (ou o mais recente).
 */
export async function loadInitialActiveProject(): Promise<{
  activeProject: DocumentProject;
  allProjects: DocumentProject[];
  trashedProjects: DocumentProject[];
}> {
  await purgeExpiredTrash();
  let all = await listProjects();
  const trashedProjects = await listTrashedProjects();

  if (all.length === 0) {
    const starter = createProjectFromTemplate('tcc');
    await db.projects.put(starter);
    all = [starter];
  }

  let activeId: string | null = null;
  try {
    activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    activeId = null;
  }

  const found = activeId ? all.find((p) => p.id === activeId) : undefined;
  const activeProject = found ?? all[0];

  setActiveProjectId(activeProject.id);

  return { activeProject, allProjects: all, trashedProjects };
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
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

  return {
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
    },
    blocks: candidate.blocks,
    references: candidate.references,
    updatedAt: new Date().toISOString(),
  };
}
