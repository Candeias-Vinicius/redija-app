import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { exportTypstProjectZip, getCleanProjectSlug } from '../projectExporter';
import { DocumentProject } from '@/types/document';
import { createProjectFromTemplate } from '../../storage/projectTemplates';

describe('projectExporter: Exportação de Pacote Completo Typst (.zip)', () => {
  it('gera slug limpo para nomes de arquivo a partir do título do projeto', () => {
    expect(getCleanProjectSlug('Meu Trabalho de Conclusão ABNT')).toBe('meu_trabalho_de_conclusao_abnt');
    expect(getCleanProjectSlug('Artigo: Tipografia & Typst! (2026)')).toBe('artigo_tipografia_typst_2026');
    expect(getCleanProjectSlug('   ')).toBe('projeto_redija');
  });

  it('empacota projeto completo contendo main.typ, abnt.typ, imagens em assets/, bibtex e README', async () => {
    const pngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const project: DocumentProject = {
      ...createProjectFromTemplate('tcc', 'Meu TCC Completo'),
      metadata: {
        ...createProjectFromTemplate('tcc').metadata,
        title: 'Estudo Avançado de Transpilação',
        author: 'Vinicius Candeias',
        institutionLogoDataUrl: pngBase64,
      },
      blocks: [
        { id: 'b1', type: 'h1', content: '1 Introdução' },
        {
          id: 'img_test_1',
          type: 'image',
          content: '',
          meta: {
            caption: 'Diagrama de Arquitetura',
            source: 'Autor (2026)',
            imageDataUrl: pngBase64,
          },
        },
      ],
      references: [
        {
          id: 'ref1',
          authors: 'SILVA, Roberto; SOUZA, Maria',
          title: 'Engenharia de Software',
          year: '2024',
          city: 'São Paulo',
          publisher: 'Editora Campus',
        },
      ],
    };

    const zipBlob = await exportTypstProjectZip(project);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(500);

    // Valida estrutura interna do arquivo zip gerado
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

    expect(zip.file('main.typ')).not.toBeNull();
    expect(zip.file('abnt.typ')).not.toBeNull();
    expect(zip.file('referencias.bib')).not.toBeNull();
    expect(zip.file('README.md')).not.toBeNull();
    expect(zip.file('meu_tcc_completo.redija')).not.toBeNull();

    // Verifica se os caminhos no main.typ usam 'assets/' em vez de '/assets/'
    const mainContent = await zip.file('main.typ')!.async('string');
    expect(mainContent).toContain('assets/img_img_test_1.png');
    expect(mainContent).toContain('assets/logo_instituicao.png');

    // Verifica se as imagens binárias foram incluídas na pasta assets/
    const assetFiles = Object.keys(zip.files).filter((f) => f.startsWith('assets/'));
    expect(assetFiles.length).toBeGreaterThanOrEqual(2);

    // Verifica conteúdo do BibTeX
    const bibContent = await zip.file('referencias.bib')!.async('string');
    expect(bibContent).toContain('SILVA, Roberto and SOUZA, Maria');
    expect(bibContent).toContain('Engenharia de Software');

    // Verifica instruções no README
    const readmeContent = await zip.file('README.md')!.async('string');
    expect(readmeContent).toContain('typst compile main.typ');
    expect(readmeContent).toContain('Tinymist Typst');
  });

  it('exporta projeto IEEE ou TCC com preset SBC usando módulo correto e inclui refs.bib quando CSL está ativo', async () => {
    const ieeeProj = createProjectFromTemplate('ieee', 'Paper IEEE Dual');
    ieeeProj.references = [
      {
        id: 'r_z',
        authors: 'ZANATTA, Carlos',
        title: 'Zeta Networks',
        year: '2025',
        city: 'NY',
        publisher: 'IEEE',
      },
      {
        id: 'r_a',
        authors: 'ALMEIDA, João',
        title: 'Alpha Signals',
        year: '2024',
        city: 'SP',
        publisher: 'SBC',
      },
    ];
    ieeeProj.blocks = [
      {
        id: 'p1',
        type: 'paragraph',
        content: '<p>Citing <cite data-cite-id="r_z" data-cite-mode="parenthetical">[1]</cite>.</p>',
      },
    ];
    ieeeProj.templateConfig = {
      ...ieeeProj.templateConfig!,
      bibliographyEngine: 'typst_csl',
      referenceOrdering: 'citation_order',
    };

    const ieeeZipBlob = await exportTypstProjectZip(ieeeProj);
    const ieeeZip = await JSZip.loadAsync(await ieeeZipBlob.arrayBuffer());
    expect(ieeeZip.file('ieee.typ')).not.toBeNull();
    expect(ieeeZip.file('main.typ')).not.toBeNull();
    expect(ieeeZip.file('refs.bib')).not.toBeNull();

    const ieeeMain = await ieeeZip.file('main.typ')!.async('string');
    expect(ieeeMain).toContain('#import "ieee.typ": *');
    const refsBib = await ieeeZip.file('refs.bib')!.async('string');
    // citation_order: ZANATTA citado primeiro vem antes de ALMEIDA
    expect(refsBib.indexOf('ZANATTA')).toBeGreaterThan(-1);
    expect(refsBib.indexOf('ALMEIDA')).toBeGreaterThan(refsBib.indexOf('ZANATTA'));

    // Também testa TCC com preset 'sbc'
    const tccSbc = createProjectFromTemplate('tcc', 'TCC via SBC');
    tccSbc.templateConfig = { ...tccSbc.templateConfig!, preset: 'sbc' };
    const sbcZipBlob = await exportTypstProjectZip(tccSbc);
    const sbcZip = await JSZip.loadAsync(await sbcZipBlob.arrayBuffer());
    expect(sbcZip.file('sbc.typ')).not.toBeNull();
    const sbcMain = await sbcZip.file('main.typ')!.async('string');
    expect(sbcMain).toContain('#import "sbc.typ": *');
  });
});
