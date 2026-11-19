import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import {
  createProjectFromInstitutionalTemplate,
  formatValidationErrors,
  getAllInstitutionalTemplates,
  getInstitutionalTemplateBySlug,
  InstitutionalTemplateDefinition,
  resolveInstitutionalTemplateConfig,
  searchInstitutionalTemplates,
  validateInstitutionalTemplate,
} from '@/core/templates/institutions';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { runDocumentLinter } from '@/core/transpiler/linters';
import { runAbntLinter } from '@/core/transpiler/abntLinter';
import {
  extractBinaryAssets,
  generateMain,
  generateTypstFiles,
  MAIN_FILE,
} from '@/core/transpiler/typstGenerator';
import {
  MAX_INSTITUTION_LOGO_BYTES,
  MAX_PROJECT_IMAGE_BYTES,
  validateInstitutionLogoUpload,
} from '@/core/storage/imageQuota';
import {
  getCachedInstitutionLogo,
  removeCachedInstitutionLogo,
  saveCachedInstitutionLogo,
} from '@/core/storage/institutionLogoCache';
import { createProjectFromTemplate, PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import { resolveRouteFromLocation } from '@/hooks/useAppRoute';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const TINY_SVG_DATA_URL =
  'data:image/svg+xml;base64,' +
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#007a55"/></svg>').toString('base64');

describe('RDJ-02.1: Schema, Validação e Descoberta Automática de Modelos Institucionais', () => {
  it('descobre automaticamente os 5+ modelos institucionais válidos sem registro manual', () => {
    const models = getAllInstitutionalTemplates();
    expect(models.length).toBeGreaterThanOrEqual(5);

    const slugs = models.map((m) => m.slug);
    expect(slugs).toContain('usp-tcc');
    expect(slugs).toContain('unicamp-tcc');
    expect(slugs).toContain('ufmg-tcc');
    expect(slugs).toContain('ifsp-tcc');
    expect(slugs).toContain('pucsp-tcc');

    for (const model of models) {
      const result = validateInstitutionalTemplate(model, `${model.slug}.json`);
      expect(result.valid, formatValidationErrors(result.errors)).toBe(true);
    }
  });

  it('herda todos os valores da norma base sobrescrevendo apenas o declarado (ex.: margens)', () => {
    const customModel: InstitutionalTemplateDefinition = {
      slug: 'teste-tcc',
      institutionName: 'Universidade Teste',
      institutionAcronym: 'UT',
      cityState: 'São Paulo / SP',
      workTypes: ['TCC'],
      displayTitle: 'TCC UT',
      description: 'Modelo de teste com margens customizadas.',
      manualUrl: 'https://exemplo.edu.br/manual',
      manualVersion: '2025',
      author: 'Teste',
      basePreset: 'abnt_classic',
      baseTemplateType: 'tcc',
      templateConfigOverrides: {
        marginTopCm: 2.5,
        marginLeftCm: 2.5,
      },
    };

    const cfg = resolveInstitutionalTemplateConfig(customModel);
    expect(cfg.preset).toBe('abnt_classic');
    expect(cfg.marginTopCm).toBe(2.5);
    expect(cfg.marginLeftCm).toBe(2.5);
    // Demais valores herdados da norma base
    expect(cfg.marginBottomCm).toBe(2);
    expect(cfg.marginRightCm).toBe(2);
    expect(cfg.fontSizePt).toBe(12);
    expect(cfg.lineSpacing).toBe('1.5');
    expect(cfg.includeCoverPage).toBe(true);
  });

  it('rejeita norma base inexistente, campo desconhecido, margem negativa e brasão embutido indicando arquivo e campo', () => {
    const invalidRaw = {
      slug: 'Invalido_Acentuado',
      institutionName: 'Teste',
      institutionAcronym: 'TT',
      cityState: 'SP',
      workTypes: ['TCC'],
      displayTitle: 'Teste',
      description: 'Desc',
      manualUrl: 'https://exemplo.edu.br',
      manualVersion: '2025',
      author: 'Autor',
      basePreset: 'norma_inexistente',
      baseTemplateType: 'tcc',
      campoDesconhecido: true,
      templateConfigOverrides: {
        marginTopCm: -2,
      },
      defaultMetadata: {
        nature: 'data:image/png;base64,AAAA',
      },
    };

    const result = validateInstitutionalTemplate(invalidRaw, 'modelo-quebrado.json');
    expect(result.valid).toBe(false);
    const formatted = formatValidationErrors(result.errors);
    expect(formatted).toContain('modelo-quebrado.json -> slug');
    expect(formatted).toContain('modelo-quebrado.json -> basePreset');
    expect(formatted).toContain('modelo-quebrado.json -> campoDesconhecido');
    expect(formatted).toContain('modelo-quebrado.json -> templateConfigOverrides.marginTopCm');
    expect(formatted).toContain('data:image/...');
  });
});

describe('RDJ-02.2: Busca Local de Instituições e Criação de Projeto', () => {
  it('busca sem diferenciar maiúsculas nem acentos (nome, sigla e cidade)', () => {
    expect(searchInstitutionalTemplates('unicamp').map((m) => m.slug)).toContain('unicamp-tcc');
    expect(searchInstitutionalTemplates('Campinas').map((m) => m.slug)).toContain('unicamp-tcc');
    expect(searchInstitutionalTemplates('Minas Gerais').map((m) => m.slug)).toContain('ufmg-tcc');
    expect(searchInstitutionalTemplates('sao paulo').map((m) => m.slug)).toContain('usp-tcc');
    expect(searchInstitutionalTemplates('IFSP').map((m) => m.slug)).toContain('ifsp-tcc');
    expect(searchInstitutionalTemplates('PUC').map((m) => m.slug)).toContain('pucsp-tcc');
    expect(searchInstitutionalTemplates('Instituicao Inexistente XYZ')).toHaveLength(0);
  });

  it('responde em menos de 100 ms com 500 modelos sintéticos', () => {
    const base = getInstitutionalTemplateBySlug('ifsp-tcc')!;
    const synthetic500: InstitutionalTemplateDefinition[] = Array.from({ length: 500 }, (_, i) => ({
      ...base,
      slug: `inst${i}-tcc`,
      institutionAcronym: `INST${i}`,
      institutionName: `Universidade Estadual Número ${i}`,
      cityState: `Cidade ${i} / SP`,
    }));

    const start = performance.now();
    const hits = searchInstitutionalTemplates('numero 499', synthetic500);
    const elapsed = performance.now() - start;

    expect(hits).toHaveLength(1);
    expect(hits[0].slug).toBe('inst499-tcc');
    expect(elapsed).toBeLessThan(100);
  });
});

describe('RDJ-02.3: Linters Respeitam Regras do Modelo Institucional', () => {
  it('não gera falsos positivos em nenhum dos 5 modelos institucionais recém-criados', () => {
    for (const model of getAllInstitutionalTemplates()) {
      const project = createProjectFromInstitutionalTemplate(model);
      const caps = getTemplateCapabilities(project);
      const report = runDocumentLinter(project, caps);
      expect(report.warnings, `Modelo ${model.slug} gerou avisos inesperados`).toEqual([]);
    }
  });

  it('não gera aviso de margem quando modelo sobrescreve margens, e alerta campo obrigatório da instituição', () => {
    const customModel: InstitutionalTemplateDefinition = {
      slug: 'custom-inst-tcc',
      institutionName: 'Universidade Exemplo',
      institutionAcronym: 'UEX',
      cityState: 'Curitiba / PR',
      workTypes: ['TCC'],
      displayTitle: 'TCC UEX',
      description: 'Modelo com margens próprias e folha de aprovação obrigatória.',
      manualUrl: 'https://uex.edu.br/manual',
      manualVersion: '2026',
      author: 'Comunidade',
      basePreset: 'abnt_classic',
      baseTemplateType: 'tcc',
      templateConfigOverrides: {
        marginTopCm: 2.5,
        marginLeftCm: 2.5,
        marginBottomCm: 2.0,
        marginRightCm: 2.0,
      },
      requiredFields: ['includeApprovalPage', 'advisor'],
      linterOverrides: {
        requireApprovalPage: true,
      },
    };

    const project = createProjectFromInstitutionalTemplate(customModel);
    // Com tudo preenchido, zero avisos (margens diferentes da ABNT não geram falso positivo)
    expect(runAbntLinter(project, customModel)).toEqual([]);

    // Removendo a folha de aprovação obrigatória, linter cita o manual da instituição
    const withoutApproval = {
      ...project,
      metadata: {
        ...project.metadata,
        includeApprovalPage: false,
      },
    };
    const warnings = runAbntLinter(withoutApproval, customModel);
    expect(warnings.some((w) => w.id === 'institutional-required-approval-page')).toBe(true);
    expect(warnings.some((w) => w.description.includes('Universidade Exemplo'))).toBe(true);
  });

  it('mantém regressão idêntica para projetos sem modelo institucional (9 modelos genéricos)', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const project = createProjectFromTemplate(tpl.type);
      const caps = getTemplateCapabilities(project);
      const report = runDocumentLinter(project, caps);
      expect(report.warnings.every((w) => !w.id.startsWith('institutional-'))).toBe(true);
    }
  });
});

describe('RDJ-02.4: Brasão da Instituição na Capa (Validação, Cota, Cache e Typst)', () => {
  it('aceita PNG, JPG e SVG até 2 MB e rejeita formatos inválidos ou arquivos > 2 MB', () => {
    const validPng = new File([new Uint8Array(1024)], 'brasao.png', { type: 'image/png' });
    const validJpg = new File([new Uint8Array(1024)], 'brasao.jpg', { type: 'image/jpeg' });
    const validSvg = new File(['<svg></svg>'], 'brasao.svg', { type: 'image/svg+xml' });
    expect(validateInstitutionLogoUpload(validPng, 0).valid).toBe(true);
    expect(validateInstitutionLogoUpload(validJpg, 0).valid).toBe(true);
    expect(validateInstitutionLogoUpload(validSvg, 0).valid).toBe(true);

    const invalidPdf = new File([new Uint8Array(512)], 'manual.pdf', { type: 'application/pdf' });
    const pdfCheck = validateInstitutionLogoUpload(invalidPdf, 0);
    expect(pdfCheck.valid).toBe(false);
    expect(pdfCheck.error).toContain('PNG, JPG ou SVG');

    const tooLarge = new File(
      [new Uint8Array(MAX_INSTITUTION_LOGO_BYTES + 1)],
      'brasao-grande.png',
      { type: 'image/png' },
    );
    const sizeCheck = validateInstitutionLogoUpload(tooLarge, 0);
    expect(sizeCheck.valid).toBe(false);
    expect(sizeCheck.error).toContain('2 MB');

    const quotaExceeded = validateInstitutionLogoUpload(
      validPng,
      MAX_PROJECT_IMAGE_BYTES - 500,
    );
    expect(quotaExceeded.valid).toBe(false);
    expect(quotaExceeded.error).toContain('250 MB');
  });

  it('salva, reaproveita e remove brasão no cache local por instituição', async () => {
    await saveCachedInstitutionLogo('IFSP', TINY_PNG_DATA_URL);
    expect(await getCachedInstitutionLogo('ifsp')).toBe(TINY_PNG_DATA_URL);
    await removeCachedInstitutionLogo('IFSP');
    expect(await getCachedInstitutionLogo('IFSP')).toBeUndefined();
  });

  it('gera código Typst com altura do modelo quando há brasão e compila sem espaço vazio quando ausente', () => {
    const ifsp = getInstitutionalTemplateBySlug('ifsp-tcc')!;
    const withLogo = createProjectFromInstitutionalTemplate(ifsp, {
      institutionLogoDataUrl: TINY_SVG_DATA_URL,
    });
    const mainWithLogo = generateMain(withLogo, true);
    expect(mainWithLogo).toContain('logo: image("/assets/logo_instituicao.svg", height: 2.4cm)');
    const assets = extractBinaryAssets(withLogo);
    expect(assets['/assets/logo_instituicao.svg']).toBeInstanceOf(Uint8Array);

    const withoutLogo = createProjectFromInstitutionalTemplate(ifsp);
    const mainWithoutLogo = generateMain(withoutLogo, true);
    expect(mainWithoutLogo).not.toContain('logo: image(');
  });
});

describe('RDJ-02.5: Rotas Públicas de Modelos Institucionais', () => {
  it('resolve /modelos, /modelos/<slug> e /?modelo=<slug>', () => {
    expect(resolveRouteFromLocation('/modelos', '', '')).toEqual({ route: 'modelos' });
    expect(resolveRouteFromLocation('/modelos/ifsp-tcc', '', '')).toEqual({
      route: 'modelos',
      modelSlug: 'ifsp-tcc',
    });
    expect(resolveRouteFromLocation('/', '?modelo=ifsp-tcc', '')).toEqual({
      route: 'app',
      pendingModelSlug: 'ifsp-tcc',
    });
  });
});

describe('RDJ-02.7 a RDJ-02.11: Compilação PDF Real via Typst WASM dos 5 Modelos Institucionais', () => {
  it('compila todos os modelos institucionais (com e sem brasão) em PDF válido', () => {
    const workspace = process.cwd().replace(/\\/g, '/');
    const compiler = NodeCompiler.create({ workspace });

    for (const model of getAllInstitutionalTemplates()) {
      const project = createProjectFromInstitutionalTemplate(model);
      const files = generateTypstFiles(project);
      for (const [name, content] of Object.entries(files)) {
        if (name !== MAIN_FILE) {
          compiler.addSource(`${workspace}/${name}`, content);
        }
      }
      const res = compiler.compile({ mainFileContent: files[MAIN_FILE] });
      expect(res.hasError(), `Erro ao compilar ${model.slug}`).toBe(false);
      const pdf = compiler.pdf(res.result!);
      expect(pdf.byteLength, `PDF vazio para ${model.slug}`).toBeGreaterThan(1000);
      expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    }

    // Também compila com brasão PNG na capa
    const ifspWithLogo = createProjectFromInstitutionalTemplate(
      getInstitutionalTemplateBySlug('ifsp-tcc')!,
      { institutionLogoDataUrl: TINY_PNG_DATA_URL },
    );
    const files = generateTypstFiles(ifspWithLogo);
    const bins = extractBinaryAssets(ifspWithLogo);
    for (const [name, content] of Object.entries(files)) {
      if (name !== MAIN_FILE) {
        compiler.addSource(`${workspace}/${name}`, content);
      }
    }
    for (const [binPath, bytes] of Object.entries(bins)) {
      compiler.mapShadow(`${workspace}${binPath}`, Buffer.from(bytes));
    }
    const resLogo = compiler.compile({ mainFileContent: files[MAIN_FILE] });
    expect(resLogo.hasError()).toBe(false);
    const pdfWithLogo = compiler.pdf(resLogo.result!);
    expect(pdfWithLogo.byteLength).toBeGreaterThan(1000);
    expect(pdfWithLogo.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
