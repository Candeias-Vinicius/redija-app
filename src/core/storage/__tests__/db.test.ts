import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  listProjects,
  saveProject,
  duplicateProject,
  deleteProject,
  loadInitialActiveProject,
  serializeBackup,
  parseBackup,
} from '../db';
import { createProjectFromTemplate } from '../projectTemplates';

describe('Persistência IndexedDB (Dexie) e Backup .redija', () => {
  beforeEach(async () => {
    await db.projects.clear();
  });

  it('cria automaticamente um projeto inicial TCC quando o banco está vazio', async () => {
    const { activeProject, allProjects } = await loadInitialActiveProject();
    expect(allProjects).toHaveLength(1);
    expect(activeProject.id).toBe(allProjects[0].id);
    expect(activeProject.templateType).toBe('tcc');
  });

  it('salva, duplica e exclui projetos no IndexedDB', async () => {
    const proj = createProjectFromTemplate('artigo', 'Artigo sobre IA');
    await saveProject(proj, false);

    let list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Artigo sobre IA');

    const clone = await duplicateProject(proj.id);
    expect(clone).toBeDefined();
    expect(clone?.name).toBe('Artigo sobre IA (Cópia)');
    expect(clone?.id).not.toBe(proj.id);

    list = await listProjects();
    expect(list).toHaveLength(2);

    await deleteProject(proj.id);
    list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(clone?.id);
  });

  it('exporta e importa um backup .redija preservando metadados, blocos e referências', () => {
    const original = createProjectFromTemplate('projeto_pesquisa', 'Projeto Mestrado');
    const serialized = serializeBackup(original);

    const restored = parseBackup(serialized);
    expect(restored.id).not.toBe(original.id);
    expect(restored.name).toBe('Projeto Mestrado');
    expect(restored.templateType).toBe('projeto_pesquisa');
    expect(restored.metadata.title).toBe(original.metadata.title);
    expect(restored.blocks).toHaveLength(original.blocks.length);
  });

  it('rejeita arquivos de backup inválidos com mensagem em português', () => {
    expect(() => parseBackup('nao-e-json')).toThrow(/não é um JSON válido/);
    expect(() => parseBackup(JSON.stringify({ foo: 'bar' }))).toThrow(
      /não contém os dados obrigatórios/,
    );
  });
});
