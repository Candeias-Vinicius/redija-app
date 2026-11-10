import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';
import {
  MODAL_TABS,
  PRESETS,
  parseUniverseEntrypoint,
  resolveDraftTemplateType,
  resolveEffectiveCslStyle,
  resolvePreviewCitationStyle,
} from '../presets';

describe('Customizer Presets & Helpers', () => {
  it('expõe exatamente 5 abas e 8 presets normativos consistentes', () => {
    expect(MODAL_TABS.map((t) => t.id)).toEqual([
      'presets',
      'typography',
      'page',
      'citations',
      'structure',
    ]);
    expect(PRESETS.map((p) => p.id)).toEqual([
      'abnt_classic',
      'abnt_2023',
      'article_1col',
      'article_2col',
      'apa_7',
      'sbc',
      'ieee',
      'poster',
    ]);
  });

  it('resolveDraftTemplateType respeita presets especiais e preserva tipos ABNT', () => {
    expect(resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'sbc' }, 'tcc')).toBe(
      'sbc',
    );
    expect(resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'ieee' }, 'tcc')).toBe(
      'ieee',
    );
    expect(
      resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'poster' }, 'artigo'),
    ).toBe('poster');
    expect(
      resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'universe_custom' }, 'tcc'),
    ).toBe('universe_custom');

    // Trocar de SBC para ABNT volta para tcc, mas preservar projeto_pesquisa mantém projeto_pesquisa
    expect(
      resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'abnt_classic' }, 'sbc'),
    ).toBe('tcc');
    expect(
      resolveDraftTemplateType(
        { ...DEFAULT_TEMPLATE_CONFIG, preset: 'abnt_classic' },
        'projeto_pesquisa',
      ),
    ).toBe('projeto_pesquisa');
    expect(
      resolveDraftTemplateType({ ...DEFAULT_TEMPLATE_CONFIG, preset: 'article_2col' }, 'poster'),
    ).toBe('artigo');
  });

  it('resolvePreviewCitationStyle e resolveEffectiveCslStyle inferem estilo automaticamente', () => {
    expect(
      resolveEffectiveCslStyle({ ...DEFAULT_TEMPLATE_CONFIG, cslStyle: undefined }, 'ieee_numeric'),
    ).toBe('ieee');
    expect(
      resolveEffectiveCslStyle({ ...DEFAULT_TEMPLATE_CONFIG, cslStyle: undefined }, 'author_date'),
    ).toBe('apa');
    expect(
      resolveEffectiveCslStyle({ ...DEFAULT_TEMPLATE_CONFIG, cslStyle: 'vancouver' }, 'abnt_upper'),
    ).toBe('vancouver');

    expect(
      resolvePreviewCitationStyle(
        { ...DEFAULT_TEMPLATE_CONFIG, preset: 'abnt_classic' },
        'auto',
        'ieee_numeric',
      ),
    ).toBe('ieee');
    expect(
      resolvePreviewCitationStyle(
        { ...DEFAULT_TEMPLATE_CONFIG, preset: 'apa_7' },
        'auto',
        'author_date',
      ),
    ).toBe('apa');
    expect(
      resolvePreviewCitationStyle(
        { ...DEFAULT_TEMPLATE_CONFIG, preset: 'ieee' },
        'abnt',
        'ieee_numeric',
      ),
    ).toBe('abnt');
  });

  it('parseUniverseEntrypoint identifica pacotes conhecidos e extrai nome de pacote genérico', () => {
    expect(parseUniverseEntrypoint('@preview/charged-ieee:0.1.4')).toBe('ieee');
    expect(parseUniverseEntrypoint('@preview/meu-pacote:1.2.3')).toBe('meu-pacote');
    expect(parseUniverseEntrypoint('entrada-invalida', 'fallback-ep')).toBe('fallback-ep');
  });
});
