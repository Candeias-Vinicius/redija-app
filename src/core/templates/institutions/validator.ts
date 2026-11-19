// =====================================================================
// RedijaApp — Validador Estrito do Schema de Modelos Institucionais
// =====================================================================

import { VALID_CONFIGURABLE_FIELD_IDS } from '@/core/templates/fieldRegistry';
import { VALID_FONT_FAMILY_IDS } from '@/core/typst/fontCatalog';
import {
  InstitutionalTemplateDefinition,
  PreTextualElementId,
  VALID_BASE_PRESETS,
  VALID_BASE_TEMPLATE_TYPES,
  VALID_PRE_TEXTUAL_ELEMENTS,
} from './schema';
import type { ConfigurableFieldId } from '@/core/templates/fieldRegistry';
import type { FontFamilyId, NormPresetId, ProjectTemplateType } from '@/types/document';

export interface InstitutionalValidationError {
  file: string;
  field: string;
  message: string;
}

export interface InstitutionalValidationResult {
  valid: boolean;
  errors: InstitutionalValidationError[];
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const DATA_URL_IMAGE_REGEX = /data:image\//i;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'slug',
  'institutionName',
  'institutionAcronym',
  'cityState',
  'workTypes',
  'displayTitle',
  'description',
  'manualUrl',
  'manualVersion',
  'author',
  'aliases',
  'basePreset',
  'baseTemplateType',
  'templateConfigOverrides',
  'cover',
  'titlePage',
  'preTextualOrder',
  'defaultMetadata',
  'requiredFields',
  'linterOverrides',
]);

const ALLOWED_TEMPLATE_CONFIG_OVERRIDE_KEYS = new Set([
  'fontFamily',
  'customFontFamily',
  'fontSizePt',
  'lineSpacing',
  'paragraphIndentCm',
  'marginTopCm',
  'marginLeftCm',
  'marginBottomCm',
  'marginRightCm',
  'columns',
  'includeCoverPage',
  'includeTitlePage',
  'includeToc',
  'citationStyle',
  'citationFormat',
  'referenceHighlight',
  'referenceAlignment',
  'referenceSpacing',
  'bodyAlignment',
  'paragraphSpacingEm',
  'paperSize',
  'pageOrientation',
  'documentLanguage',
  'pageNumbering',
  'hideFirstPageNumber',
  'romanPreTextual',
  'runningHeader',
  'headingNumbering',
  'h1PageBreak',
  'referenceOrdering',
  'referenceEntryFormat',
  'bibliographyEngine',
  'cslStyle',
  'posterDimensions',
  'posterOrientation',
  'posterColumns',
  'posterTheme',
]);

const ALLOWED_COVER_KEYS = new Set([
  'showLogo',
  'logoPosition',
  'logoHeightCm',
  'uppercaseInstitution',
  'uppercaseTitle',
  'showCourse',
]);

const ALLOWED_TITLE_PAGE_KEYS = new Set([
  'natureWidthPct',
  'showInstitution',
  'showAdvisor',
  'showCoadvisor',
]);

const ALLOWED_DEFAULT_METADATA_KEYS = new Set([
  'institution',
  'course',
  'location',
  'nature',
  'includeApprovalPage',
  'includeFiguresList',
  'includeTablesList',
  'includeBoxesList',
  'abstract',
  'keywords',
  'foreignAbstract',
  'foreignKeywords',
]);

const ALLOWED_LINTER_OVERRIDE_KEYS = new Set([
  'abstractMinWords',
  'abstractMaxWords',
  'requireApprovalPage',
  'requireForeignAbstract',
  'requireKeywords',
  'customRulesNote',
]);

const VALID_LOGO_POSITIONS = new Set(['top', 'above_institution', 'below_institution']);
const VALID_LINE_SPACINGS = new Set(['1.0', '1.5', '2.0']);
const VALID_CITATION_STYLES = new Set(['uppercase', 'titlecase']);
const VALID_CITATION_FORMATS = new Set([
  'abnt_upper',
  'abnt_titlecase',
  'ieee_numeric',
  'superscript',
  'author_date',
]);
const VALID_REF_HIGHLIGHTS = new Set(['bold', 'italic', 'underline', 'none']);
const VALID_REF_ALIGNMENTS = new Set(['left', 'justify']);
const VALID_REF_SPACINGS = new Set(['single_blank', 'compact', 'double']);
const VALID_PAPER_SIZES = new Set(['a4', 'letter', 'a5']);
const VALID_ORIENTATIONS = new Set(['portrait', 'landscape']);
const VALID_LANGUAGES = new Set(['pt', 'en', 'es']);
const VALID_PAGE_NUMBERINGS = new Set(['top_right', 'bottom_center', 'bottom_right', 'none']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkUnknownKeys(
  file: string,
  prefix: string,
  obj: Record<string, unknown>,
  allowed: Set<string>,
  errors: InstitutionalValidationError[],
) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      const field = prefix ? `${prefix}.${key}` : key;
      errors.push({
        file,
        field,
        message: `Campo desconhecido "${field}". Consulte o schema em src/core/templates/institutions/README.md.`,
      });
    }
  }
}

function containsEmbeddedImage(value: unknown): boolean {
  if (typeof value === 'string') {
    return DATA_URL_IMAGE_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(containsEmbeddedImage);
  }
  if (isPlainObject(value)) {
    return Object.values(value).some(containsEmbeddedImage);
  }
  return false;
}

/**
 * Formata lista de erros de validação indicando arquivo e campo problemático.
 */
export function formatValidationErrors(errors: InstitutionalValidationError[]): string {
  return errors.map((e) => `${e.file} -> ${e.field}: ${e.message}`).join('\n');
}

/**
 * Valida um objeto bruto contra o schema estrito de modelo institucional (RDJ-02.1).
 */
export function validateInstitutionalTemplate(
  raw: unknown,
  fileName = 'modelo.json',
): InstitutionalValidationResult {
  const errors: InstitutionalValidationError[] = [];

  if (!isPlainObject(raw)) {
    return {
      valid: false,
      errors: [
        {
          file: fileName,
          field: '(raiz)',
          message: 'O arquivo de modelo institucional deve conter um objeto JSON válido.',
        },
      ],
    };
  }

  checkUnknownKeys(fileName, '', raw, ALLOWED_TOP_LEVEL_KEYS, errors);

  if (containsEmbeddedImage(raw)) {
    errors.push({
      file: fileName,
      field: '(raiz)',
      message:
        'Nenhum brasão ou imagem embutida (data:image/...) é permitido no repositório. O usuário envia o próprio brasão no app.',
    });
  }

  // Metadados obrigatórios
  if (!isNonEmptyString(raw.slug) || !SLUG_REGEX.test(raw.slug)) {
    errors.push({
      file: fileName,
      field: 'slug',
      message:
        'Deve seguir o padrão "<sigla>-<tipo-de-trabalho>" em minúsculas e sem acentos (ex.: "ifsp-tcc").',
    });
  }

  const requiredStrings: Array<[string, string]> = [
    ['institutionName', 'Nome completo da instituição é obrigatório.'],
    ['institutionAcronym', 'Sigla da instituição é obrigatória.'],
    ['cityState', 'Cidade/UF é obrigatório (ex.: "São Paulo / SP").'],
    ['displayTitle', 'Título de exibição do modelo é obrigatório.'],
    ['description', 'Descrição do modelo é obrigatória.'],
    ['manualVersion', 'Versão ou ano do manual oficial é obrigatória.'],
    ['author', 'Autor(a) da contribuição é obrigatório.'],
  ];

  for (const [key, msg] of requiredStrings) {
    if (!isNonEmptyString(raw[key])) {
      errors.push({ file: fileName, field: key, message: msg });
    }
  }

  if (!isNonEmptyString(raw.manualUrl)) {
    errors.push({
      file: fileName,
      field: 'manualUrl',
      message: 'Link do manual oficial é obrigatório.',
    });
  } else {
    try {
      const parsed = new URL(raw.manualUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.push({
          file: fileName,
          field: 'manualUrl',
          message: 'O link do manual deve usar protocolo http:// ou https://.',
        });
      }
    } catch {
      errors.push({
        file: fileName,
        field: 'manualUrl',
        message: 'URL do manual oficial inválida.',
      });
    }
  }

  if (
    !Array.isArray(raw.workTypes) ||
    raw.workTypes.length === 0 ||
    !raw.workTypes.every(isNonEmptyString)
  ) {
    errors.push({
      file: fileName,
      field: 'workTypes',
      message: 'Informe ao menos um tipo de trabalho coberto (ex.: ["TCC"]).',
    });
  }

  if (raw.aliases !== undefined) {
    if (!Array.isArray(raw.aliases) || !raw.aliases.every(isNonEmptyString)) {
      errors.push({
        file: fileName,
        field: 'aliases',
        message: 'aliases deve ser uma lista de strings não vazias.',
      });
    }
  }

  // Herança da norma base
  if (
    typeof raw.basePreset !== 'string' ||
    !VALID_BASE_PRESETS.has(raw.basePreset as NormPresetId)
  ) {
    errors.push({
      file: fileName,
      field: 'basePreset',
      message: `Norma base inexistente "${String(raw.basePreset)}". Valores aceitos: ${Array.from(VALID_BASE_PRESETS).join(', ')}.`,
    });
  }

  if (
    typeof raw.baseTemplateType !== 'string' ||
    !VALID_BASE_TEMPLATE_TYPES.has(raw.baseTemplateType as ProjectTemplateType)
  ) {
    errors.push({
      file: fileName,
      field: 'baseTemplateType',
      message: `Tipo de template base inexistente "${String(raw.baseTemplateType)}". Valores aceitos: ${Array.from(VALID_BASE_TEMPLATE_TYPES).join(', ')}.`,
    });
  }

  // templateConfigOverrides
  if (raw.templateConfigOverrides !== undefined) {
    if (!isPlainObject(raw.templateConfigOverrides)) {
      errors.push({
        file: fileName,
        field: 'templateConfigOverrides',
        message: 'Deve ser um objeto com as configurações a sobrescrever.',
      });
    } else {
      const ov = raw.templateConfigOverrides;
      checkUnknownKeys(
        fileName,
        'templateConfigOverrides',
        ov,
        ALLOWED_TEMPLATE_CONFIG_OVERRIDE_KEYS,
        errors,
      );

      const nonNegativeCmFields = [
        'marginTopCm',
        'marginLeftCm',
        'marginBottomCm',
        'marginRightCm',
        'paragraphIndentCm',
      ];
      for (const f of nonNegativeCmFields) {
        if (ov[f] !== undefined) {
          if (typeof ov[f] !== 'number' || !Number.isFinite(ov[f]) || (ov[f] as number) < 0) {
            errors.push({
              file: fileName,
              field: `templateConfigOverrides.${f}`,
              message: `Valor inválido (${String(ov[f])}). Deve ser um número maior ou igual a 0.`,
            });
          } else if (f.startsWith('margin') && (ov[f] as number) > 10) {
            errors.push({
              file: fileName,
              field: `templateConfigOverrides.${f}`,
              message: `Margem excessiva (${String(ov[f])} cm). Máximo permitido: 10 cm.`,
            });
          }
        }
      }

      if (ov.fontSizePt !== undefined) {
        if (
          typeof ov.fontSizePt !== 'number' ||
          !Number.isFinite(ov.fontSizePt) ||
          ov.fontSizePt < 6 ||
          ov.fontSizePt > 36
        ) {
          errors.push({
            file: fileName,
            field: 'templateConfigOverrides.fontSizePt',
            message: 'Tamanho de fonte deve estar entre 6 e 36 pt.',
          });
        }
      }

      if (
        ov.fontFamily !== undefined &&
        (typeof ov.fontFamily !== 'string' ||
          !VALID_FONT_FAMILY_IDS.has(ov.fontFamily as FontFamilyId))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.fontFamily',
          message: `Família de fonte inválida "${String(ov.fontFamily)}".`,
        });
      }

      if (
        ov.lineSpacing !== undefined &&
        (typeof ov.lineSpacing !== 'string' || !VALID_LINE_SPACINGS.has(ov.lineSpacing))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.lineSpacing',
          message: 'Entrelinha deve ser "1.0", "1.5" ou "2.0".',
        });
      }

      if (ov.columns !== undefined && ov.columns !== 1 && ov.columns !== 2 && ov.columns !== 3) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.columns',
          message: 'Número de colunas deve ser 1, 2 ou 3.',
        });
      }

      if (
        ov.citationStyle !== undefined &&
        (typeof ov.citationStyle !== 'string' || !VALID_CITATION_STYLES.has(ov.citationStyle))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.citationStyle',
          message: 'citationStyle deve ser "uppercase" ou "titlecase".',
        });
      }

      if (
        ov.citationFormat !== undefined &&
        (typeof ov.citationFormat !== 'string' || !VALID_CITATION_FORMATS.has(ov.citationFormat))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.citationFormat',
          message: `citationFormat inválido "${String(ov.citationFormat)}".`,
        });
      }

      if (
        ov.referenceHighlight !== undefined &&
        (typeof ov.referenceHighlight !== 'string' ||
          !VALID_REF_HIGHLIGHTS.has(ov.referenceHighlight))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.referenceHighlight',
          message: `referenceHighlight inválido "${String(ov.referenceHighlight)}".`,
        });
      }

      if (
        ov.referenceAlignment !== undefined &&
        (typeof ov.referenceAlignment !== 'string' ||
          !VALID_REF_ALIGNMENTS.has(ov.referenceAlignment))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.referenceAlignment',
          message: 'referenceAlignment deve ser "left" ou "justify".',
        });
      }

      if (
        ov.referenceSpacing !== undefined &&
        (typeof ov.referenceSpacing !== 'string' || !VALID_REF_SPACINGS.has(ov.referenceSpacing))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.referenceSpacing',
          message: 'referenceSpacing deve ser "single_blank", "compact" ou "double".',
        });
      }

      if (
        ov.paperSize !== undefined &&
        (typeof ov.paperSize !== 'string' || !VALID_PAPER_SIZES.has(ov.paperSize))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.paperSize',
          message: 'paperSize deve ser "a4", "letter" ou "a5".',
        });
      }

      if (
        ov.pageOrientation !== undefined &&
        (typeof ov.pageOrientation !== 'string' || !VALID_ORIENTATIONS.has(ov.pageOrientation))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.pageOrientation',
          message: 'pageOrientation deve ser "portrait" ou "landscape".',
        });
      }

      if (
        ov.documentLanguage !== undefined &&
        (typeof ov.documentLanguage !== 'string' || !VALID_LANGUAGES.has(ov.documentLanguage))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.documentLanguage',
          message: 'documentLanguage deve ser "pt", "en" ou "es".',
        });
      }

      if (
        ov.pageNumbering !== undefined &&
        (typeof ov.pageNumbering !== 'string' || !VALID_PAGE_NUMBERINGS.has(ov.pageNumbering))
      ) {
        errors.push({
          file: fileName,
          field: 'templateConfigOverrides.pageNumbering',
          message: `pageNumbering inválido "${String(ov.pageNumbering)}".`,
        });
      }
    }
  }

  // cover
  if (raw.cover !== undefined) {
    if (!isPlainObject(raw.cover)) {
      errors.push({ file: fileName, field: 'cover', message: 'cover deve ser um objeto.' });
    } else {
      checkUnknownKeys(fileName, 'cover', raw.cover, ALLOWED_COVER_KEYS, errors);
      if (
        raw.cover.logoPosition !== undefined &&
        (typeof raw.cover.logoPosition !== 'string' ||
          !VALID_LOGO_POSITIONS.has(raw.cover.logoPosition))
      ) {
        errors.push({
          file: fileName,
          field: 'cover.logoPosition',
          message: 'logoPosition deve ser "top", "above_institution" ou "below_institution".',
        });
      }
      if (raw.cover.logoHeightCm !== undefined) {
        if (
          typeof raw.cover.logoHeightCm !== 'number' ||
          !Number.isFinite(raw.cover.logoHeightCm) ||
          raw.cover.logoHeightCm <= 0 ||
          raw.cover.logoHeightCm > 8
        ) {
          errors.push({
            file: fileName,
            field: 'cover.logoHeightCm',
            message: 'logoHeightCm deve ser um número entre 0.1 e 8 cm.',
          });
        }
      }
    }
  }

  // titlePage
  if (raw.titlePage !== undefined) {
    if (!isPlainObject(raw.titlePage)) {
      errors.push({
        file: fileName,
        field: 'titlePage',
        message: 'titlePage deve ser um objeto.',
      });
    } else {
      checkUnknownKeys(fileName, 'titlePage', raw.titlePage, ALLOWED_TITLE_PAGE_KEYS, errors);
      if (raw.titlePage.natureWidthPct !== undefined) {
        if (
          typeof raw.titlePage.natureWidthPct !== 'number' ||
          raw.titlePage.natureWidthPct < 30 ||
          raw.titlePage.natureWidthPct > 80
        ) {
          errors.push({
            file: fileName,
            field: 'titlePage.natureWidthPct',
            message: 'natureWidthPct deve estar entre 30 e 80.',
          });
        }
      }
    }
  }

  // preTextualOrder
  if (raw.preTextualOrder !== undefined) {
    if (!Array.isArray(raw.preTextualOrder)) {
      errors.push({
        file: fileName,
        field: 'preTextualOrder',
        message: 'preTextualOrder deve ser um array de elementos pré-textuais.',
      });
    } else {
      const seen = new Set<string>();
      for (const el of raw.preTextualOrder) {
        if (
          typeof el !== 'string' ||
          !VALID_PRE_TEXTUAL_ELEMENTS.has(el as PreTextualElementId)
        ) {
          errors.push({
            file: fileName,
            field: 'preTextualOrder',
            message: `Elemento pré-textual desconhecido "${String(el)}".`,
          });
        } else if (seen.has(el)) {
          errors.push({
            file: fileName,
            field: 'preTextualOrder',
            message: `Elemento pré-textual duplicado "${el}".`,
          });
        } else {
          seen.add(el);
        }
      }
    }
  }

  // defaultMetadata
  if (raw.defaultMetadata !== undefined) {
    if (!isPlainObject(raw.defaultMetadata)) {
      errors.push({
        file: fileName,
        field: 'defaultMetadata',
        message: 'defaultMetadata deve ser um objeto.',
      });
    } else {
      checkUnknownKeys(
        fileName,
        'defaultMetadata',
        raw.defaultMetadata,
        ALLOWED_DEFAULT_METADATA_KEYS,
        errors,
      );
    }
  }

  // requiredFields
  if (raw.requiredFields !== undefined) {
    if (!Array.isArray(raw.requiredFields)) {
      errors.push({
        file: fileName,
        field: 'requiredFields',
        message: 'requiredFields deve ser um array de identificadores de campos.',
      });
    } else {
      for (const fieldId of raw.requiredFields) {
        if (
          typeof fieldId !== 'string' ||
          !VALID_CONFIGURABLE_FIELD_IDS.has(fieldId as ConfigurableFieldId)
        ) {
          errors.push({
            file: fileName,
            field: 'requiredFields',
            message: `Campo obrigatório desconhecido "${String(fieldId)}".`,
          });
        }
      }
    }
  }

  // linterOverrides
  if (raw.linterOverrides !== undefined) {
    if (!isPlainObject(raw.linterOverrides)) {
      errors.push({
        file: fileName,
        field: 'linterOverrides',
        message: 'linterOverrides deve ser um objeto.',
      });
    } else {
      checkUnknownKeys(
        fileName,
        'linterOverrides',
        raw.linterOverrides,
        ALLOWED_LINTER_OVERRIDE_KEYS,
        errors,
      );
      const minW = raw.linterOverrides.abstractMinWords;
      const maxW = raw.linterOverrides.abstractMaxWords;
      if (minW !== undefined && (typeof minW !== 'number' || minW < 0)) {
        errors.push({
          file: fileName,
          field: 'linterOverrides.abstractMinWords',
          message: 'abstractMinWords deve ser um número maior ou igual a 0.',
        });
      }
      if (maxW !== undefined && (typeof maxW !== 'number' || maxW <= 0)) {
        errors.push({
          file: fileName,
          field: 'linterOverrides.abstractMaxWords',
          message: 'abstractMaxWords deve ser um número maior que 0.',
        });
      }
      if (typeof minW === 'number' && typeof maxW === 'number' && minW > maxW) {
        errors.push({
          file: fileName,
          field: 'linterOverrides.abstractMinWords',
          message: 'abstractMinWords não pode ser maior que abstractMaxWords.',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidInstitutionalTemplate(
  raw: unknown,
  fileName: string,
): InstitutionalTemplateDefinition {
  const result = validateInstitutionalTemplate(raw, fileName);
  if (!result.valid) {
    throw new Error(
      `Modelo institucional inválido:\n${formatValidationErrors(result.errors)}`,
    );
  }
  return raw as InstitutionalTemplateDefinition;
}
