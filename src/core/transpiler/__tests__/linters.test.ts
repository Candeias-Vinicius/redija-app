import { describe, it, expect } from 'vitest';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';
import { auditCitationsAndReferences } from '../abntLinter';
import { runDocumentLinter } from '../linters';

describe('Verificadores Plurais & Auditoria Multi-Formato de Citações', () => {
  it('seleciona AbntLinter para TCC padrão e pausa quando customizado executando SanityLinter', () => {
    const tcc = createProjectFromTemplate('tcc');
    const reportDefault = runDocumentLinter(tcc, getTemplateCapabilities(tcc));
    expect(reportDefault.kind).toBe('abnt');
    expect(reportDefault.isPausedAbnt).toBe(false);

    tcc.sidebarConfig = { isCustomized: true, hiddenFieldIds: ['dedicatory'] };
    tcc.blocks.push({
      id: 'q1',
      type: 'quote_long',
      content: 'Trecho longo citado sem metadados completos.',
      meta: { author: '', year: '' },
    });

    const reportModified = runDocumentLinter(tcc, getTemplateCapabilities(tcc));
    expect(reportModified.kind).toBe('abnt_paused');
    expect(reportModified.isPausedAbnt).toBe(true);
    expect(reportModified.sanityWarnings.some((w) => w.id.startsWith('sanity-quote-missing'))).toBe(
      true,
    );
  });

  it('seleciona IeeeLinter, SbcLinter, PosterLinter e SanityLinter de acordo com o modelo', () => {
    const ieee = createProjectFromTemplate('ieee');
    ieee.metadata.abstract = 'Curto demais.';
    const ieeeReport = runDocumentLinter(ieee, getTemplateCapabilities(ieee));
    expect(ieeeReport.kind).toBe('ieee');
    expect(ieeeReport.title).toBe('Verificador IEEE');
    expect(ieeeReport.warnings.some((w) => w.id === 'ieee-abstract-length')).toBe(true);

    const sbc = createProjectFromTemplate('sbc');
    sbc.metadata.foreignAbstract = '';
    const sbcReport = runDocumentLinter(sbc, getTemplateCapabilities(sbc));
    expect(sbcReport.kind).toBe('sbc');
    expect(sbcReport.title).toBe('Verificador SBC');
    expect(sbcReport.warnings.some((w) => w.id === 'sbc-abstract-empty')).toBe(true);

    const poster = createProjectFromTemplate('poster');
    poster.blocks = [{ id: 'p1', type: 'paragraph', content: '<p>Parágrafo único simples.</p>' }];
    const posterReport = runDocumentLinter(poster, getTemplateCapabilities(poster));
    expect(posterReport.kind).toBe('poster');
    expect(posterReport.title).toBe('Verificador Pôster');
    expect(posterReport.warnings.some((w) => w.id === 'poster-visual-elements')).toBe(true);

    const apa = createProjectFromTemplate('tcc');
    apa.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'apa_7' };
    const apaReport = runDocumentLinter(apa, getTemplateCapabilities(apa));
    expect(apaReport.kind).toBe('sanity');
    expect(apaReport.title).toBe('Verificador de Integridade');
  });

  it('audita citações IEEE numéricas [1] sem falso positivo para índices de vetor v[0]', () => {
    const ieee = createProjectFromTemplate('ieee');
    ieee.references = [
      {
        id: 'r1',
        type: 'article',
        authors: 'ALMEIDA, João',
        title: 'Sistemas Embarcados',
        city: 'São Paulo',
        publisher: 'IEEE',
        year: '2024',
      },
    ];
    ieee.blocks = [
      {
        id: 'b1',
        type: 'paragraph',
        content: '<p>O acesso ao vetor v[0] ocorre antes da medição [1], mas [3] não existe.</p>',
      },
      {
        id: 'c1',
        type: 'code',
        content: 'arr[99] = value;',
      },
    ];

    const warnings = auditCitationsAndReferences(ieee);
    const missingRefs = warnings.filter((w) => w.id.startsWith('missing-ref-'));
    // Apenas [3] deve ser sinalizado como órfão; v[0] e arr[99] (bloco de código) são ignorados!
    expect(missingRefs).toHaveLength(1);
    expect(missingRefs[0].title).toContain('[3]');
    expect(warnings.some((w) => w.id.startsWith('uncited-ref-'))).toBe(false);
  });

  it('audita sobrescritos apenas no modo superscript e evita falsos positivos em m² ou m<sup>2</sup> no modo ABNT', () => {
    const tcc = createProjectFromTemplate('tcc');
    tcc.references = [
      {
        id: 'r1',
        type: 'book',
        authors: 'SOUZA, Carla',
        title: 'Metodologia Científica',
        city: 'Rio de Janeiro',
        publisher: 'Atlas',
        year: '2022',
      },
    ];
    tcc.blocks = [
      {
        id: 'p1',
        type: 'paragraph',
        content: '<p>Área útil de 15 m<sup>2</sup> com respaldo de (SOUZA, 2022).</p>',
      },
    ];

    // No modo abnt_upper, <sup>2</sup> NÃO deve gerar aviso de citação órfã
    const abntWarnings = auditCitationsAndReferences(tcc);
    expect(abntWarnings.some((w) => w.id.startsWith('missing-ref-'))).toBe(false);

    // No modo superscript, <sup>1</sup> casa com a primeira referência e <sup>4</sup> gera órfã
    tcc.templateConfig = {
      ...DEFAULT_TEMPLATE_CONFIG,
      preset: 'custom',
      citationFormat: 'superscript',
    };
    tcc.blocks = [
      {
        id: 'p2',
        type: 'paragraph',
        content: '<p>Resultado comprovado<sup>1</sup> e ponto sem cadastro<sup>4</sup>.</p>',
      },
    ];
    const supWarnings = auditCitationsAndReferences(tcc);
    const missing = supWarnings.filter((w) => w.id.startsWith('missing-ref-'));
    expect(missing).toHaveLength(1);
    expect(missing[0].title).toContain('⁴');
    expect(missing[0].description).toContain('4');
    expect(supWarnings.some((w) => w.id.startsWith('uncited-ref-'))).toBe(false);
  });
});
