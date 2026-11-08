import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  saveEmergencySnapshot,
  getLatestEmergencySnapshot,
  clearEmergencySnapshots,
} from '../emergencyBackup';
import { DocumentProject, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

// Mock simples de localStorage para ambiente Node no Vitest
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

const mockStorage = new LocalStorageMock();

beforeAll(() => {
  if (typeof window === 'undefined') {
    (globalThis as unknown as { window: unknown }).window = globalThis;
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
});

const sampleProject: DocumentProject = {
  id: 'test-emergency-proj',
  name: 'TCC de Emergência',
  templateType: 'tcc',
  templateConfig: DEFAULT_TEMPLATE_CONFIG,
  metadata: {
    title: 'TCC de Emergência',
    author: 'Estudante',
    advisor: 'Prof. Orientador',
    institution: 'Universidade',
    course: 'Curso',
    location: 'Cidade - UF',
    year: '2026',
    abstract: 'Resumo',
    keywords: ['ABNT'],
  },
  blocks: [
    {
      id: 'b-1',
      type: 'paragraph',
      content: 'Conteúdo prestes a ser sincronizado com a nuvem.',
    },
  ],
  references: [],
  updatedAt: new Date().toISOString(),
};

describe('emergencyBackup: Blindagem contra perda de dados', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('grava e recupera snapshot de emergência com integridade', () => {
    const saved = saveEmergencySnapshot(sampleProject);
    expect(saved).not.toBeNull();
    expect(saved?.projectName).toBe('TCC de Emergência');

    const retrieved = getLatestEmergencySnapshot('test-emergency-proj');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.projectId).toBe('test-emergency-proj');
    expect(retrieved?.project.blocks[0].content).toBe(
      'Conteúdo prestes a ser sincronizado com a nuvem.',
    );
  });

  it('limpa snapshots de emergência após salvamento confirmado', () => {
    saveEmergencySnapshot(sampleProject);
    expect(getLatestEmergencySnapshot('test-emergency-proj')).not.toBeNull();

    clearEmergencySnapshots('test-emergency-proj');
    expect(getLatestEmergencySnapshot('test-emergency-proj')).toBeNull();
  });
});
