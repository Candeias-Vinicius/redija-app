import { describe, it, expect } from 'vitest';
import {
  METADATA_FIELD_REGISTRY,
  buildSidebarConfigFromSelection,
  getDefaultFieldIdsForTemplate,
  getFieldsByCategory,
  resolveVisibleFieldSet,
  type ConfigurableFieldId,
} from '../fieldRegistry';

describe('fieldRegistry: Catálogo Configurável de Campos da Sidebar', () => {
  it('agrupa os 25 campos nas 4 categorias esperadas sem duplicatas', () => {
    const grouped = getFieldsByCategory();
    const total =
      grouped.identificacao.length +
      grouped.resumo.length +
      grouped.pre_textual.length +
      grouped.pos_textual.length;

    expect(METADATA_FIELD_REGISTRY).toHaveLength(25);
    expect(total).toBe(METADATA_FIELD_REGISTRY.length);
  });

  it('resolveVisibleFieldSet aplica inclusões e exclusões respeitando exclusão por último', () => {
    const base = getDefaultFieldIdsForTemplate('sbc');
    expect(base).not.toContain('advisor');

    const withAdvisor = resolveVisibleFieldSet(base, {
      isCustomized: true,
      enabledFieldIds: ['advisor', 'dedicatory'],
      hiddenFieldIds: ['course'],
    });

    expect(withAdvisor.has('advisor')).toBe(true);
    expect(withAdvisor.has('dedicatory')).toBe(true);
    expect(withAdvisor.has('course')).toBe(false);
  });

  it('buildSidebarConfigFromSelection gera diff compacto e retorna undefined quando volta ao padrão', () => {
    const base = getDefaultFieldIdsForTemplate('tcc');

    // Nenhuma alteração -> undefined (sai do estado Modificado)
    const identicalConfig = buildSidebarConfigFromSelection(base, new Set(base));
    expect(identicalConfig).toBeUndefined();

    // Oculta um campo padrão
    const customSet = new Set<ConfigurableFieldId>(base);
    customSet.delete('dedicatory');
    const diffHide = buildSidebarConfigFromSelection(base, customSet);
    expect(diffHide).toEqual({
      isCustomized: true,
      hiddenFieldIds: ['dedicatory'],
    });

    // Adiciona um campo extra em artigo
    const artigoBase = getDefaultFieldIdsForTemplate('artigo');
    const artigoExtended = new Set<ConfigurableFieldId>(artigoBase);
    artigoExtended.add('acknowledgments');
    const diffAdd = buildSidebarConfigFromSelection(artigoBase, artigoExtended);
    expect(diffAdd).toEqual({
      isCustomized: true,
      enabledFieldIds: ['acknowledgments'],
    });
  });
});
