// =====================================================================
// RedijaApp — Camada de Persistência Local (IndexedDB via Dexie)
// =====================================================================

import Dexie, { type Table } from 'dexie';
import { DocumentProject, RedijaBackupFile } from '@/types/document';
import { createProjectFromTemplate } from './projectTemplates';

const ACTIVE_PROJECT_KEY = 'redija:activeProjectId';

export class RedijaDatabase extends Dexie {
  projects!: Table<DocumentProject, string>;

  constructor() {
    super('RedijaAppDB');
    this.version(1).stores({
      projects: 'id, updatedAt, name, templateType',
    });
  }
}

export const db = new RedijaDatabase();

/**
 * Lista todos os projetos ordenados pela data de atualização (mais recente primeiro).
 */
export async function listProjects(): Promise<DocumentProject[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
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
 * Exclui um projeto do IndexedDB.
 */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

/**
 * Garante que exista ao menos um projeto inicial no banco e retorna
 * o projeto ativo (ou o mais recente).
 */
export async function loadInitialActiveProject(): Promise<{
  activeProject: DocumentProject;
  allProjects: DocumentProject[];
}> {
  let all = await listProjects();

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

  return { activeProject, allProjects: all };
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
