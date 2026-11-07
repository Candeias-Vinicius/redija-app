import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  listProjects,
  listTrashedProjects,
  saveProject,
  duplicateProject,
  moveProjectToTrash,
  restoreProjectFromTrash,
  purgeExpiredTrash,
  getRemainingTrashDays,
  deleteProject,
  loadInitialActiveProject,
  serializeBackup,
  parseBackup,
} from '../db';
import { createProjectFromTemplate } from '../projectTemplates';
import {
  calculateProjectImageBytes,
  getDataUrlByteSize,
  MAX_PROJECT_IMAGE_BYTES,
  validateImageUploadForProject,
} from '../imageQuota';

describe('Persistência IndexedDB (Dexie) e Backup .redija', () => {
  beforeEach(async () => {
    await db.projects.clear();
  });

  it('retorna lista vazia quando o banco está vazio sem criar projetos automáticos', async () => {
    const { activeProject, allProjects } = await loadInitialActiveProject();
    expect(allProjects).toHaveLength(0);
    expect(activeProject).toBeNull();
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

  it('move para lixeira (30 dias), restaura e expurga itens vencidos automaticamente', async () => {
    const blank = createProjectFromTemplate('em_branco', 'Rascunho Livre');
    await saveProject(blank, false);

    expect(await listProjects()).toHaveLength(1);
    expect(await listTrashedProjects()).toHaveLength(0);

    await moveProjectToTrash(blank.id);
    expect(await listProjects()).toHaveLength(0);
    const trashed = await listTrashedProjects();
    expect(trashed).toHaveLength(1);
    expect(getRemainingTrashDays(trashed[0].deletedAt)).toBe(30);

    await restoreProjectFromTrash(blank.id);
    expect(await listProjects()).toHaveLength(1);
    expect(await listTrashedProjects()).toHaveLength(0);

    // Simula item na lixeira há 31 dias
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await saveProject({ ...blank, deletedAt: thirtyOneDaysAgo }, false);
    expect(await listTrashedProjects()).toHaveLength(1);

    const purged = await purgeExpiredTrash();
    expect(purged).toBe(1);
    expect(await listTrashedProjects()).toHaveLength(0);
  });

  it('controla a quota de 150 MB de imagens por projeto sem limitar a quantidade de figuras', () => {
    const sampleDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const byteSize = getDataUrlByteSize(sampleDataUrl);
    expect(byteSize).toBeGreaterThan(40);

    // Simula 50 figuras leves no mesmo projeto (permitido pois depende apenas do peso total <= 150 MB)
    const blocks = Array.from({ length: 50 }, (_, idx) => ({
      id: `img_${idx}`,
      type: 'image' as const,
      content: '',
      meta: { imageDataUrl: sampleDataUrl },
    }));

    const usedBytes = calculateProjectImageBytes(blocks);
    expect(usedBytes).toBe(byteSize * 50);
    expect(usedBytes).toBeLessThan(MAX_PROJECT_IMAGE_BYTES);

    const smallFile = new File([new Uint8Array(1024)], 'figura.png', { type: 'image/png' });
    expect(validateImageUploadForProject(smallFile, usedBytes).valid).toBe(true);

    // Bloqueia quando a soma ultrapassa 150 MB
    const nearLimitCheck = validateImageUploadForProject(
      smallFile,
      MAX_PROJECT_IMAGE_BYTES - 500,
    );
    expect(nearLimitCheck.valid).toBe(false);
    expect(nearLimitCheck.error).toContain('150 MB');
  });

  it('isola estritamente os projetos do Perfil Local dos projetos de contas Google', async () => {
    // 1. Projeto criado no perfil local
    const localProj = createProjectFromTemplate('tcc', 'Meu TCC Local');
    localProj.ownerEmail = 'local';
    await saveProject(localProj, false);

    // 2. Projeto criado por um colega autenticado no Google
    const colleagueProj = createProjectFromTemplate('artigo', 'Artigo do Colega');
    colleagueProj.ownerEmail = 'colega@gmail.com';
    await saveProject(colleagueProj, false);

    // Consulta de projetos do Perfil Local: vê apenas o seu próprio trabalho
    const localList = await listProjects('local');
    expect(localList).toHaveLength(1);
    expect(localList[0].name).toBe('Meu TCC Local');

    // Consulta de projetos do Colega Google: vê apenas o artigo dele
    const colleagueList = await listProjects('colega@gmail.com');
    expect(colleagueList).toHaveLength(1);
    expect(colleagueList[0].name).toBe('Artigo do Colega');

    // Consulta global (sem filtro): retorna todos para compatibilidade interna
    const allList = await listProjects();
    expect(allList).toHaveLength(2);

    // loadInitialActiveProject carrega isoladamente cada perfil
    const localSession = await loadInitialActiveProject('local');
    expect(localSession.allProjects).toHaveLength(1);
    expect(localSession.activeProject?.name).toBe('Meu TCC Local');

    const colleagueSession = await loadInitialActiveProject('colega@gmail.com');
    expect(colleagueSession.allProjects).toHaveLength(1);
    expect(colleagueSession.activeProject?.name).toBe('Artigo do Colega');
  });
});
