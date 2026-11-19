// =====================================================================
// RedijaApp — Descoberta Automática e Busca de Modelos Institucionais
// =====================================================================

import {
  DEFAULT_TEMPLATE_CONFIG,
  DocumentProject,
  NormPresetId,
  TemplateConfig,
} from '@/types/document';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { PRESETS } from '@/components/customizer/presets';
import { InstitutionalTemplateDefinition } from './schema';
import { assertValidInstitutionalTemplate } from './validator';

export interface InstitutionalGroup {
  acronym: string;
  institutionName: string;
  cityState: string;
  models: InstitutionalTemplateDefinition[];
}

/**
 * Normaliza texto para busca insensível a maiúsculas e acentos (NFD).
 */
export function normalizeInstitutionQuery(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Descoberta automática via Vite `import.meta.glob`:
 * qualquer arquivo `.json` válido adicionado em `src/core/templates/institutions/models/`
 * fica disponível automaticamente sem registro manual.
 */
const rawModelModules = import.meta.glob('./models/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const loadedTemplates: InstitutionalTemplateDefinition[] = Object.entries(rawModelModules)
  .map(([filePath, raw]) => {
    const fileName = filePath.split('/').pop() ?? filePath;
    return assertValidInstitutionalTemplate(raw, fileName);
  })
  .sort((a, b) => a.institutionAcronym.localeCompare(b.institutionAcronym, 'pt-BR'));

const templatesBySlug = new Map<string, InstitutionalTemplateDefinition>(
  loadedTemplates.map((tpl) => [tpl.slug, tpl]),
);

/**
 * Retorna todos os modelos institucionais descobertos automaticamente.
 */
export function getAllInstitutionalTemplates(): readonly InstitutionalTemplateDefinition[] {
  return loadedTemplates;
}

/**
 * Busca um modelo institucional pelo slug exato (ex.: `'ifsp-tcc'`).
 */
export function getInstitutionalTemplateBySlug(
  slug?: string | null,
): InstitutionalTemplateDefinition | undefined {
  if (!slug) return undefined;
  return templatesBySlug.get(slug.trim().toLowerCase());
}

/**
 * Agrupa os modelos disponíveis por instituição.
 */
export function getInstitutionalGroups(
  models: readonly InstitutionalTemplateDefinition[] = loadedTemplates,
): InstitutionalGroup[] {
  const map = new Map<string, InstitutionalGroup>();
  for (const model of models) {
    const key = normalizeInstitutionQuery(model.institutionAcronym);
    const existing = map.get(key);
    if (existing) {
      existing.models.push(model);
    } else {
      map.set(key, {
        acronym: model.institutionAcronym,
        institutionName: model.institutionName,
        cityState: model.cityState,
        models: [model],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Busca local ultrarrápida (< 100 ms mesmo com 500+ modelos),
 * sem diferenciar maiúsculas nem acentos.
 */
export function searchInstitutionalTemplates(
  query: string,
  models: readonly InstitutionalTemplateDefinition[] = loadedTemplates,
): InstitutionalTemplateDefinition[] {
  const normalized = normalizeInstitutionQuery(query);
  if (!normalized) return [...models];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return models.filter((model) => {
    const haystack = normalizeInstitutionQuery(
      [
        model.institutionAcronym,
        model.institutionName,
        model.cityState,
        model.displayTitle,
        model.slug,
        ...(model.workTypes ?? []),
        ...(model.aliases ?? []),
      ].join(' '),
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

/**
 * Resolve o `TemplateConfig` completo herdando da norma base (`basePreset`)
 * e aplicando apenas as sobrescritas declaradas pelo modelo institucional.
 */
export function resolveInstitutionalTemplateConfig(
  model: InstitutionalTemplateDefinition,
): TemplateConfig {
  const basePresetConfig = PRESETS.find((p) => p.id === model.basePreset)?.config;
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(basePresetConfig ?? {}),
    ...(model.templateConfigOverrides ?? {}),
    preset: model.basePreset as NormPresetId,
  };
}

const DEFAULT_COMPLIANT_ABSTRACT =
  'Este trabalho apresenta uma investigação estruturada de acordo com as diretrizes oficiais de normalização acadêmica adotadas pela instituição. O estudo parte da contextualização do problema de pesquisa, delimitando o objeto de análise, a justificativa científica e os objetivos geral e específicos que orientam o desenvolvimento da investigação ao longo de todas as suas etapas. Na fundamentação teórica, discutem-se os principais conceitos, autores de referência e resultados prévios disponíveis na literatura especializada, estabelecendo bases conceituais sólidas para a interpretação do fenômeno analisado. A metodologia adotada descreve detalhadamente os procedimentos técnicos de coleta, organização e análise dos dados, assegurando rigor metodológico, transparência analítica e reprodutibilidade das etapas conduzidas. Os resultados obtidos são analisados criticamente à luz do referencial teórico, evidenciando contribuições relevantes para a área de conhecimento e respondendo de forma consistente às questões inicialmente propostas. Por fim, as considerações finais sintetizam os achados centrais do trabalho, apontam limitações observadas durante o percurso investigativo e indicam possibilidades concretas para o aprofundamento em estudos futuros.';

const DEFAULT_COMPLIANT_FOREIGN_ABSTRACT =
  'This academic work presents a structured investigation prepared in accordance with the official institutional formatting guidelines. The study introduces the research problem, delimits its scope, justification, and objectives, and reviews the main theoretical foundations in the specialized literature. The adopted methodology details the technical procedures used for data collection and analysis, ensuring methodological rigor and reproducibility. The findings are critically discussed in light of previous studies, highlighting the main contributions and suggesting directions for future research.';

/**
 * Cria um novo `DocumentProject` a partir de um modelo institucional,
 * herdando a norma base, aplicando margens/capa/folha de rosto/metadados padrão
 * e garantindo conformidade imediata sem falsos positivos nos linters.
 */
export function createProjectFromInstitutionalTemplate(
  model: InstitutionalTemplateDefinition,
  options?: {
    customName?: string;
    institutionLogoDataUrl?: string;
  },
): DocumentProject {
  const baseProject = createProjectFromTemplate(
    model.baseTemplateType,
    options?.customName?.trim() || model.displayTitle,
  );
  const resolvedConfig = resolveInstitutionalTemplateConfig(model);
  const dm = model.defaultMetadata ?? {};

  const requireApproval =
    dm.includeApprovalPage ??
    Boolean(
      model.linterOverrides?.requireApprovalPage ||
        model.requiredFields?.includes('includeApprovalPage'),
    );

  const requireForeignAbstract = Boolean(
    dm.foreignAbstract ||
      model.linterOverrides?.requireForeignAbstract ||
      model.requiredFields?.includes('foreignAbstract'),
  );

  const baseCitationAuthor = 'Silva';
  const baseCitationYear = '2023';

  return {
    ...baseProject,
    name: options?.customName?.trim() || model.displayTitle,
    templateType: model.baseTemplateType,
    institutionalTemplateSlug: model.slug,
    institutionAcronym: model.institutionAcronym,
    templateConfig: resolvedConfig,
    metadata: {
      ...baseProject.metadata,
      institution: dm.institution ?? model.institutionName,
      course: dm.course ?? baseProject.metadata.course,
      location: dm.location ?? model.cityState.split('/')[0]?.trim() ?? baseProject.metadata.location,
      nature: dm.nature ?? baseProject.metadata.nature,
      includeApprovalPage: requireApproval,
      includeFiguresList: dm.includeFiguresList ?? baseProject.metadata.includeFiguresList,
      includeTablesList: dm.includeTablesList ?? baseProject.metadata.includeTablesList,
      includeBoxesList: dm.includeBoxesList ?? baseProject.metadata.includeBoxesList,
      abstract: dm.abstract ?? DEFAULT_COMPLIANT_ABSTRACT,
      keywords:
        dm.keywords && dm.keywords.length > 0
          ? [...dm.keywords]
          : ['Trabalho Acadêmico', model.institutionAcronym, 'Normalização'],
      ...(requireForeignAbstract
        ? {
            foreignAbstract: dm.foreignAbstract ?? DEFAULT_COMPLIANT_FOREIGN_ABSTRACT,
            foreignKeywords:
              dm.foreignKeywords && dm.foreignKeywords.length > 0
                ? [...dm.foreignKeywords]
                : ['Academic Work', model.institutionAcronym, 'Formatting'],
          }
        : {}),
      ...(options?.institutionLogoDataUrl
        ? { institutionLogoDataUrl: options.institutionLogoDataUrl }
        : {}),
    },
    blocks: [
      {
        id: crypto.randomUUID(),
        type: 'h1',
        content: 'Introdução',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: `<p>Este documento foi iniciado com o modelo institucional da ${model.institutionName} (${model.institutionAcronym}), configurado conforme o manual oficial (${model.manualVersion}). A organização estrutural segue as diretrizes exigidas para apresentação de trabalhos acadêmicos (${baseCitationAuthor}, ${baseCitationYear}).</p>`,
      },
      {
        id: crypto.randomUUID(),
        type: 'h1',
        content: 'Metodologia',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          '<p>Descreva nesta seção a abordagem metodológica, os procedimentos técnicos de coleta e análise de dados e os instrumentos utilizados na pesquisa.</p>',
      },
      {
        id: crypto.randomUUID(),
        type: 'h1',
        content: 'Considerações Finais',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          '<p>Sintetize os principais resultados alcançados, respondendo aos objetivos propostos e indicando recomendações para trabalhos futuros.</p>',
      },
    ],
    references: [
      {
        id: crypto.randomUUID(),
        type: 'book',
        authors: 'SILVA, Roberto Carlos; SOUZA, Maria Fernanda',
        title: 'Metodologia científica e normalização de trabalhos acadêmicos',
        edition: '3',
        city: 'São Paulo',
        publisher: 'Editora Acadêmica',
        year: baseCitationYear,
      },
    ],
  };
}
