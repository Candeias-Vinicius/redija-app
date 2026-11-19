import { describe, expect, it } from 'vitest';
import { createProjectFromTemplate, PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { runDocumentLinter } from '@/core/transpiler/linters';
import {
  buildReadinessReport,
  calculateComplianceScore,
  InstitutionalChecklistExtension,
} from '@/core/transpiler/readiness';

function makeWords(count: number): string {
  return Array.from({ length: count }, (_, i) => `palavra${i + 1}`).join(' ');
}

describe('RDJ-05.1: Nota de Conformidade (0 a 100)', () => {
  it('retorna nota 100 e rótulo "Pronto" quando não há pendências', () => {
    const result = calculateComplianceScore({
      missingStructuralIds: [],
      warnings: [],
      isPaused: false,
    });
    expect(result.score).toBe(100);
    expect(result.band).toBe('ready');
    expect(result.label).toBe('Pronto');
    expect(result.isPaused).toBe(false);
  });

  it('calcula 72 ("Atenção") com 1 estrutural ausente, 2 warnings e 3 infos', () => {
    const result = calculateComplianceScore({
      missingStructuralIds: ['struct-approval-page'],
      warnings: [
        { id: 'w1', severity: 'warning' },
        { id: 'w2', severity: 'warning' },
        { id: 'i1', severity: 'info' },
        { id: 'i2', severity: 'info' },
        { id: 'i3', severity: 'info' },
      ],
    });
    expect(result.score).toBe(72); // 100 - 15 - 10 - 3
    expect(result.band).toBe('attention');
    expect(result.label).toBe('Atenção');
  });

  it('limita a nota mínima a 0 ("Crítico") quando os descontos ultrapassam 100', () => {
    const result = calculateComplianceScore({
      missingStructuralIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'], // -105
      warnings: [{ id: 'w1', severity: 'warning' }],
    });
    expect(result.score).toBe(0);
    expect(result.band).toBe('critical');
    expect(result.label).toBe('Crítico');
  });

  it('conta avisos com o mesmo id uma única vez', () => {
    const result = calculateComplianceScore({
      missingStructuralIds: ['s1', 's1'],
      warnings: [
        { id: 'dup-w', severity: 'warning' },
        { id: 'dup-w', severity: 'warning' },
        { id: 'dup-i', severity: 'info' },
        { id: 'dup-i', severity: 'info' },
      ],
    });
    expect(result.score).toBe(100 - 15 - 5 - 1);
    expect(result.counts).toEqual({ missingStructural: 1, warnings: 1, infos: 1 });
  });

  it('não exibe nota quando a verificação está pausada', () => {
    const result = calculateComplianceScore({
      missingStructuralIds: ['s1'],
      warnings: [{ id: 'w1', severity: 'warning' }],
      isPaused: true,
    });
    expect(result.isPaused).toBe(true);
    expect(result.score).toBeNull();
    expect(result.band).toBe('paused');
    expect(result.label).toBe('Verificação pausada');
  });
});

describe('RDJ-05.2: Checklist Estrutural por Tipo de Trabalho e Norma', () => {
  it('garante que os 9 modelos iniciais, sem alterações, não geram nenhum item pendente falso', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const project = createProjectFromTemplate(tpl.type);
      const caps = getTemplateCapabilities(project);
      const lint = runDocumentLinter(project, caps);
      const report = buildReadinessReport(project, caps, lint);

      const pending = report.allItems.filter((i) => i.status === 'pending');
      expect(
        pending,
        `Modelo inicial "${tpl.type}" gerou pendências falsas: ${pending.map((p) => `${p.id}: ${p.title}`).join('; ')}`,
      ).toHaveLength(0);
      expect(report.scoreResult.score).toBe(100);
      expect(report.isReadyToDeliver).toBe(true);
    }
  });

  it('lista capa, folha de rosto, folha de aprovação, resumo, abstract, sumário e referências para TCC ABNT', () => {
    const tcc = createProjectFromTemplate('tcc');
    const caps = getTemplateCapabilities(tcc);
    const lint = runDocumentLinter(tcc, caps);
    const report = buildReadinessReport(tcc, caps, lint);
    const ids = report.allItems.map((i) => i.id);

    expect(ids).toContain('struct-cover');
    expect(ids).toContain('struct-title-page');
    expect(ids).toContain('struct-approval-page');
    expect(ids).toContain('struct-abstract');
    expect(ids).toContain('struct-foreign-abstract');
    expect(ids).toContain('struct-toc');
    expect(ids).toContain('struct-references');
  });

  it('sinaliza resumo com 120 palavras no TCC (150–500) e aceita 120 palavras em Artigo (100–250)', () => {
    const tcc = createProjectFromTemplate('tcc');
    tcc.metadata.abstract = makeWords(120);
    const tccCaps = getTemplateCapabilities(tcc);
    const tccReport = buildReadinessReport(tcc, tccCaps, runDocumentLinter(tcc, tccCaps));
    const tccAbs = tccReport.allItems.find((i) => i.id === 'struct-abstract');
    expect(tccAbs?.status).toBe('pending');
    expect(tccAbs?.description).toContain('O resumo deve ter entre 150 e 500 palavras (atual: 120)');

    const artigo = createProjectFromTemplate('artigo');
    artigo.metadata.abstract = makeWords(120);
    const artCaps = getTemplateCapabilities(artigo);
    const artReport = buildReadinessReport(artigo, artCaps, runDocumentLinter(artigo, artCaps));
    const artAbs = artReport.allItems.find((i) => i.id === 'struct-abstract');
    expect(artAbs?.status).toBe('ok');

    artigo.metadata.abstract = makeWords(80);
    const artShortReport = buildReadinessReport(artigo, artCaps, runDocumentLinter(artigo, artCaps));
    const artShortAbs = artShortReport.allItems.find((i) => i.id === 'struct-abstract');
    expect(artShortAbs?.status).toBe('pending');
    expect(artShortAbs?.description).toContain('O resumo deve ter entre 100 e 250 palavras (atual: 80)');
  });

  it('sinaliza palavras-chave fora da faixa de 3 a 5 (2 ou 6 palavras-chave)', () => {
    const tcc = createProjectFromTemplate('tcc');
    tcc.metadata.keywords = ['ABNT', 'Typst'];
    const caps = getTemplateCapabilities(tcc);
    const report2 = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps));
    const kw2 = report2.allItems.find((i) => i.id === 'struct-keywords');
    expect(kw2?.status).toBe('pending');
    expect(kw2?.description).toContain('Informe de 3 a 5 palavras-chave');

    tcc.metadata.keywords = ['A', 'B', 'C', 'D', 'E', 'F'];
    const report6 = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps));
    const kw6 = report6.allItems.find((i) => i.id === 'struct-keywords');
    expect(kw6?.status).toBe('pending');
    expect(kw6?.description).toContain('Informe de 3 a 5 palavras-chave');
  });

  it('lista figuras e tabelas sem legenda ou fonte com posição e link para o bloco', () => {
    const tcc = createProjectFromTemplate('tcc');
    tcc.blocks.push(
      {
        id: 'img-sem-fonte',
        type: 'image',
        content: '',
        meta: { caption: 'Gráfico de resultados', source: '' },
      },
      {
        id: 'tbl-sem-legenda',
        type: 'table',
        content: '',
        meta: { caption: '', source: 'IBGE, 2024', headers: ['A'], rows: [['1']] },
      },
    );
    const caps = getTemplateCapabilities(tcc);
    const report = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps));
    const figItem = report.allItems.find((i) => i.id === 'fig-meta-img-sem-fonte');
    const tblItem = report.allItems.find((i) => i.id === 'tbl-meta-tbl-sem-legenda');

    expect(figItem?.status).toBe('pending');
    expect(figItem?.title).toContain('sem fonte');
    expect(figItem?.target).toEqual({ kind: 'block', blockId: 'img-sem-fonte' });

    expect(tblItem?.status).toBe('pending');
    expect(tblItem?.title).toContain('sem legenda');
    expect(tblItem?.target).toEqual({ kind: 'block', blockId: 'tbl-sem-legenda' });
  });

  it('exibe apenas os itens obrigatórios da norma para IEEE, SBC e Pôster', () => {
    const ieee = createProjectFromTemplate('ieee');
    const ieeeReport = buildReadinessReport(
      ieee,
      getTemplateCapabilities(ieee),
      runDocumentLinter(ieee, getTemplateCapabilities(ieee)),
    );
    expect(ieeeReport.allItems.some((i) => i.id === 'struct-cover')).toBe(false);
    expect(ieeeReport.allItems.some((i) => i.id === 'struct-approval-page')).toBe(false);
    expect(ieeeReport.allItems.some((i) => i.id === 'struct-ieee-abstract')).toBe(true);

    const poster = createProjectFromTemplate('poster');
    const posterReport = buildReadinessReport(
      poster,
      getTemplateCapabilities(poster),
      runDocumentLinter(poster, getTemplateCapabilities(poster)),
    );
    expect(posterReport.allItems.some((i) => i.id === 'struct-poster-header')).toBe(true);
    expect(posterReport.allItems.some((i) => i.id === 'struct-toc')).toBe(false);
  });

  it('inclui lembrete de ficha catalográfica com link da biblioteca sem descontar da nota', () => {
    const tcc = createProjectFromTemplate('tcc');
    const caps = getTemplateCapabilities(tcc);
    const extension: InstitutionalChecklistExtension = {
      institutionName: 'Universidade de São Paulo',
      institutionAcronym: 'USP',
      requireCatalogCard: true,
      catalogCardUrl: 'https://www.abcd.usp.br/ficha-catalografica',
    };
    const report = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps), extension);
    const reminder = report.allItems.find((i) => i.id === 'reminder-catalog-card');

    expect(reminder?.status).toBe('reminder');
    expect(reminder?.impact).toBe('none');
    expect(reminder?.externalUrl).toBe('https://www.abcd.usp.br/ficha-catalografica');
    expect(report.scoreResult.score).toBe(100);
  });
});

describe('RDJ-05.3 e RDJ-05.4: Citações Órfãs, Referências Não Citadas e Agrupamento', () => {
  it('detecta citação órfã (-5, link para bloco) e referência não citada (-1, link para referência) sem duplicar avisos', () => {
    const tcc = createProjectFromTemplate('tcc');
    tcc.blocks = [
      {
        id: 'blk-citacao',
        type: 'paragraph',
        content: '<p>Segundo (AutorInexistente, 2024), o resultado é relevante.</p>',
      },
    ];
    tcc.references = [
      {
        id: 'ref-nao-citada',
        type: 'book',
        authors: 'PEREIRA, Ana',
        title: 'Metodologia Aplicada',
        city: 'São Paulo',
        publisher: 'Atlas',
        year: '2022',
      },
    ];

    const caps = getTemplateCapabilities(tcc);
    const report = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps));

    const orphan = report.allItems.find((i) => i.id.startsWith('missing-ref-'));
    const uncited = report.allItems.find((i) => i.id === 'uncited-ref-ref-nao-citada');

    expect(orphan?.title).toContain('Citação sem referência:');
    expect(orphan?.impact).toBe('warning');
    expect(orphan?.target).toEqual({ kind: 'block', blockId: 'blk-citacao' });

    expect(uncited?.title).toContain('Referência não citada: Metodologia Aplicada');
    expect(uncited?.impact).toBe('info');
    expect(uncited?.target).toEqual({ kind: 'references', referenceId: 'ref-nao-citada' });

    // 100 - 5 (citação órfã) - 1 (ref não citada) = 94
    expect(report.scoreResult.score).toBe(94);
    // Verifica que não há IDs duplicados no relatório
    const uniqueIds = new Set(report.allItems.map((i) => i.id));
    expect(uniqueIds.size).toBe(report.allItems.length);
  });

  it('agrupa itens nos 4 grupos com contadores por grupo e marca "Citações e referências" como ok quando consistente', () => {
    const tcc = createProjectFromTemplate('tcc');
    const caps = getTemplateCapabilities(tcc);
    const report = buildReadinessReport(tcc, caps, runDocumentLinter(tcc, caps));

    expect(report.groups.map((g) => g.label)).toEqual([
      'Estrutura',
      'Conteúdo',
      'Citações e referências',
      'Formatação',
    ]);
    const citGroup = report.groups.find((g) => g.id === 'citacoes_referencias');
    expect(citGroup?.pendingCount).toBe(0);
    expect(citGroup?.items.some((i) => i.id === 'citations-consistent-ok' && i.status === 'ok')).toBe(
      true,
    );
  });
});
