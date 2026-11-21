// =====================================================================
// RedijaApp — Gerador 1-Clique de Slides de Defesa e Pôster Acadêmico (RDJ-09)
// Converte trabalhos acadêmicos (TCC, Monografia, Artigo, Relatório, Projeto)
// em Apresentação de Slides ou Pôster A0 com cópia independente de figuras/tabelas
// e validação de quota de imagens (250 MB).
// =====================================================================

import {
  AcademicReference,
  Block,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentProject,
  PresentationAspectRatio,
  PresentationTheme,
  ProjectTemplateType,
} from '@/types/document';
import { resolveEffectiveTemplateType } from '@/core/templates/templateCapabilities';
import {
  calculateBlockImageBytes,
  calculateProjectImageBytes,
  formatBytes,
  getDataUrlByteSize,
  MAX_PROJECT_IMAGE_BYTES,
} from '@/core/storage/imageQuota';
import { stripHtmlTags } from './escape';
import { getOrderedReferences, getPrimarySurname, parseCitationAuthors } from './abntLinter';
import { stripManualNumbering } from './typstGenerator';

export interface ExtractedSourceSection {
  title: string;
  bullets: string[];
  firstVisualBlock: Block | null;
  allVisualBlocks: Block[];
}

export interface SourceVisualFigureItem {
  blockId: string;
  type: 'image' | 'table' | 'box';
  caption: string;
  source: string;
  sectionTitle: string;
  imageCount: number;
  byteSize: number;
  block: Block;
}

export interface GenerateDefenseSlidesOptions {
  existingProjects?: Pick<DocumentProject, 'name'>[];
  customName?: string;
  theme?: PresentationTheme;
  aspectRatio?: PresentationAspectRatio;
}

export interface GeneratePosterFromWorkOptions {
  existingProjects?: Pick<DocumentProject, 'name'>[];
  customName?: string;
  posterTheme?: 'emerald' | 'blue' | 'classic_dark' | 'clean';
}

const UNSUPPORTED_GENERATION_SOURCE_TYPES: ReadonlySet<ProjectTemplateType> = new Set([
  'poster',
  'presentation',
]);

/**
 * Verifica se o projeto atual suporta a geração 1-clique de slides de defesa ou pôster.
 * Conforme RDJ-09.2 Cenário 6: quando o projeto já é um pôster ou uma apresentação,
 * a opção "Gerar slides de defesa" (ou "Gerar pôster") não aparece.
 */
export function canGenerateDefenseFromProject(project: DocumentProject): boolean {
  const effectiveType = resolveEffectiveTemplateType(project);
  return !UNSUPPORTED_GENERATION_SOURCE_TYPES.has(effectiveType);
}

/**
 * Extrai a primeira frase significativa de um parágrafo ou item de lista,
 * truncando de forma limpa para caber em um tópico de slide ou seção de pôster.
 */
export function extractFirstSentence(rawHtmlOrText: string, maxChars = 180): string {
  const plain = stripHtmlTags(rawHtmlOrText)
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';

  // Divide na primeira pontuação final de frase (. ! ?) seguida de espaço e letra maiúscula ou fim
  const sentenceMatch = plain.match(/^(.+?[.!?])(?:\s+|$)/);
  const candidate = (sentenceMatch ? sentenceMatch[1] : plain).trim();

  if (candidate.length <= maxChars) {
    return candidate;
  }
  const sliced = candidate.slice(0, maxChars - 1).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  return `${lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced}…`;
}

/**
 * Clona profundamente um bloco de figura, tabela ou quadro atribuindo novos IDs
 * para que a apresentação/pôster seja 100% independente do projeto original (RDJ-09.4 Cenário 4).
 */
export function cloneVisualBlockForTarget(sourceBlock: Block): Block {
  const cloned = structuredClone(sourceBlock);
  const newBlockId = crypto.randomUUID();
  cloned.id = newBlockId;
  cloned.updatedAt = Date.now();

  if (cloned.type === 'image' && cloned.meta) {
    if (Array.isArray(cloned.meta.subImages) && cloned.meta.subImages.length > 0) {
      cloned.meta.subImages = cloned.meta.subImages.map((item, idx) => ({
        ...item,
        id: `${newBlockId}_sub_${idx}`,
      }));
      cloned.meta.imageDataUrl = cloned.meta.subImages[0]?.dataUrl;
      cloned.meta.imageMime = cloned.meta.subImages[0]?.mime;
    }
  }

  return cloned;
}

/**
 * Lista todas as figuras (`image`), tabelas (`table`) e quadros (`box`) de um projeto de origem,
 * com suas legendas, seção a que pertencem e peso em bytes (para RDJ-09.4 Cenário 2).
 */
export function listSourceVisualBlocks(sourceProject: DocumentProject): SourceVisualFigureItem[] {
  const items: SourceVisualFigureItem[] = [];
  let currentSection = 'Início do Trabalho';

  for (const block of sourceProject.blocks) {
    if (block.type === 'h1' || block.type === 'unnumbered_heading') {
      const headingText = stripManualNumbering(stripHtmlTags(block.content)).trim();
      if (headingText) {
        currentSection = headingText;
      }
      continue;
    }

    if (block.type === 'image' || block.type === 'table' || block.type === 'box') {
      const defaultCaption =
        block.type === 'image'
          ? 'Figura sem legenda'
          : block.type === 'table'
            ? 'Tabela sem legenda'
            : 'Quadro sem legenda';
      const caption = block.meta?.caption?.trim() || defaultCaption;
      const source = block.meta?.source?.trim() || 'do autor';
      const subCount =
        block.type === 'image'
          ? Array.isArray(block.meta?.subImages) && block.meta.subImages.length > 0
            ? block.meta.subImages.length
            : block.meta?.imageDataUrl
              ? 1
              : 0
          : 0;
      const byteSize = block.type === 'image' ? calculateBlockImageBytes(block) : 0;

      items.push({
        blockId: block.id,
        type: block.type,
        caption,
        source,
        sectionTitle: currentSection,
        imageCount: subCount,
        byteSize,
        block,
      });
    }
  }

  return items;
}

/**
 * Valida e insere uma cópia independente de uma figura, tabela ou quadro do trabalho original
 * na apresentação atual respeitando a cota de 250 MB de imagens por projeto (RDJ-09.4).
 */
export function copyVisualBlockToPresentation(
  targetProject: Pick<DocumentProject, 'blocks' | 'metadata'>,
  sourceBlock: Block,
  afterBlockId?: string,
): {
  ok: boolean;
  block?: Block;
  updatedBlocks: Block[];
  clonedBlock: Block;
  error?: string;
} {
  const currentBytes = calculateProjectImageBytes(targetProject.blocks, targetProject.metadata);
  const addedBytes = sourceBlock.type === 'image' ? calculateBlockImageBytes(sourceBlock) : 0;

  if (currentBytes + addedBytes > MAX_PROJECT_IMAGE_BYTES) {
    const available = Math.max(0, MAX_PROJECT_IMAGE_BYTES - currentBytes);
    return {
      ok: false,
      updatedBlocks: targetProject.blocks,
      clonedBlock: sourceBlock,
      error: `Limite de 250 MB de imagens por projeto excedido! Esta figura possui ${formatBytes(
        addedBytes,
      )}, mas a apresentação tem apenas ${formatBytes(available)} disponíveis.`,
    };
  }

  const clonedBlock = cloneVisualBlockForTarget(sourceBlock);
  const blocks = [...targetProject.blocks];

  if (afterBlockId) {
    const idx = blocks.findIndex((b) => b.id === afterBlockId);
    if (idx !== -1) {
      blocks.splice(idx + 1, 0, clonedBlock);
      return { ok: true, block: clonedBlock, updatedBlocks: blocks, clonedBlock };
    }
  }

  blocks.push(clonedBlock);
  return { ok: true, block: clonedBlock, updatedBlocks: blocks, clonedBlock };
}

/**
 * Agrupa o conteúdo do projeto de origem por seções de nível 1 (`h1`),
 * extraindo até 5 tópicos das primeiras frases dos parágrafos/listas e
 * identificando a primeira figura ou tabela de cada seção (RDJ-09.2 Cenário 3 e RDJ-09.4 Cenário 1).
 */
export function extractSectionsForSlides(sourceProject: DocumentProject): ExtractedSourceSection[] {
  const sections: ExtractedSourceSection[] = [];
  let current: ExtractedSourceSection | null = null;

  for (const block of sourceProject.blocks) {
    if (block.type === 'h1') {
      const title = stripManualNumbering(stripHtmlTags(block.content)).trim();
      if (!title) continue;
      current = {
        title,
        bullets: [],
        firstVisualBlock: null,
        allVisualBlocks: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    if (
      (block.type === 'paragraph' ||
        block.type === 'bullet' ||
        block.type === 'numbered' ||
        block.type === 'quote_long') &&
      current.bullets.length < 5
    ) {
      const topic = extractFirstSentence(block.content);
      if (topic) {
        current.bullets.push(topic);
      }
    } else if (block.type === 'h2' || block.type === 'h3') {
      // Subtítulos também podem fornecer contexto se a seção tiver poucos parágrafos
      const subTitle = stripManualNumbering(stripHtmlTags(block.content)).trim();
      if (subTitle && current.bullets.length < 5 && !current.bullets.includes(subTitle)) {
        // Mantemos subtítulos apenas se não houver parágrafos suficientes depois, ou ignoramos se já houver frases
      }
    } else if (block.type === 'image' || block.type === 'table' || block.type === 'box') {
      current.allVisualBlocks.push(block);
      if (!current.firstVisualBlock) {
        current.firstVisualBlock = block;
      }
    }
  }

  return sections;
}

/**
 * Seleciona até `maxRefs` referências citadas no trabalho (ou as primeiras da lista ordenada
 * caso citações explícitas sejam em menor número), para o slide de encerramento (RDJ-09.2 Cenário 4).
 */
export function extractTopCitedReferences(
  sourceProject: DocumentProject,
  maxRefs = 5,
): AcademicReference[] {
  const allRefs = sourceProject.references ?? [];
  if (allRefs.length === 0) return [];

  const ordered = getOrderedReferences(
    allRefs,
    sourceProject.templateConfig?.referenceOrdering ?? 'alphabetical',
    sourceProject.blocks,
  );

  const citedIds = new Set<string>();
  const refById = new Map(ordered.map((r) => [r.id, r]));

  for (const block of sourceProject.blocks) {
    // 1. Tokens <cite data-cite-id="...">
    const citeMatches = block.content.matchAll(/data-cite-id=["']([^"']+)["']/gi);
    for (const m of citeMatches) {
      const id = m[1]?.trim();
      if (id && refById.has(id)) {
        citedIds.add(id);
      }
    }

    // 2. Citação direta longa por sobrenome nos metadados
    if (block.type === 'quote_long' && block.meta?.author?.trim()) {
      const { surnames } = parseCitationAuthors(block.meta.author);
      const targetSurname = surnames[0] || getPrimarySurname(block.meta.author);
      const matched = ordered.find((r) => getPrimarySurname(r.authors) === targetSurname);
      if (matched) citedIds.add(matched.id);
    }

    // 3. Menção por sobrenome no texto do bloco
    const plainUpper = stripHtmlTags(block.content).toUpperCase();
    for (const ref of ordered) {
      const surname = getPrimarySurname(ref.authors);
      if (surname && plainUpper.includes(surname)) {
        citedIds.add(ref.id);
      }
    }
  }

  const prioritized: AcademicReference[] = [];
  for (const ref of ordered) {
    if (citedIds.has(ref.id)) {
      prioritized.push(ref);
      if (prioritized.length >= maxRefs) return prioritized;
    }
  }

  for (const ref of ordered) {
    if (!citedIds.has(ref.id)) {
      prioritized.push(ref);
      if (prioritized.length >= maxRefs) return prioritized;
    }
  }

  return prioritized.slice(0, maxRefs);
}

/**
 * Gera um novo projeto do tipo Apresentação (`presentation`) a partir de um trabalho acadêmico (RDJ-09.2).
 * - O projeto original nunca é modificado.
 * - Guarda o vínculo `sourceProjectId`, `sourceProjectName` e `generatedFrom`.
 * - Copia o brasão e a primeira figura/tabela de cada seção respeitando a cota de 250 MB.
 */
export function generateDefenseSlidesProject(
  sourceProject: DocumentProject,
  existingProjectsOrOptions: Pick<DocumentProject, 'name'>[] | GenerateDefenseSlidesOptions = [],
  maybeOptions: GenerateDefenseSlidesOptions = {},
): DocumentProject {
  const existingProjects = Array.isArray(existingProjectsOrOptions)
    ? existingProjectsOrOptions
    : (existingProjectsOrOptions.existingProjects ?? []);
  const options = Array.isArray(existingProjectsOrOptions)
    ? maybeOptions
    : existingProjectsOrOptions;
  const now = new Date().toISOString();
  const baseName = options.customName?.trim() || `Slides de Defesa — ${sourceProject.name}`;
  let uniqueName = baseName;
  let counter = 2;
  while (
    existingProjects.some((p) => p.name.trim().toLowerCase() === uniqueName.toLowerCase())
  ) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }

  const sections = extractSectionsForSlides(sourceProject);
  const blocks: Block[] = [];

  // Orçamento de bytes de imagens copiadas para respeitar MAX_PROJECT_IMAGE_BYTES (250 MB)
  let runningImageBytes = getDataUrlByteSize(sourceProject.metadata.institutionLogoDataUrl);

  if (sections.length === 0) {
    // Cenário 5 (RDJ-09.2): Trabalho sem títulos de nível 1 -> capa e slide único com aviso explicando o motivo
    blocks.push({
      id: crypto.randomUUID(),
      type: 'h1',
      content: 'Visão Geral do Trabalho',
    });
    blocks.push({
      id: crypto.randomUUID(),
      type: 'paragraph',
      content:
        'Aviso: O trabalho de origem não possui seções de nível 1 (H1). Por isso, foi gerado este slide único. Adicione títulos de seção primária no trabalho ou crie novos slides abaixo.',
    });

    // Extrai até 5 frases dos parágrafos soltos existentes, se houver
    let extractedCount = 0;
    for (const b of sourceProject.blocks) {
      if (
        (b.type === 'paragraph' || b.type === 'bullet' || b.type === 'numbered') &&
        extractedCount < 5
      ) {
        const sentence = extractFirstSentence(b.content);
        if (sentence) {
          blocks.push({
            id: crypto.randomUUID(),
            type: 'bullet',
            content: sentence,
          });
          extractedCount++;
        }
      }
    }
  } else {
    // Cenário 3 (RDJ-09.2) + Cenário 1 (RDJ-09.4): Um slide por seção de nível 1 com até 5 tópicos e 1ª figura/tabela
    for (const sec of sections) {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h1',
        content: sec.title,
      });

      const topics =
        sec.bullets.length > 0
          ? sec.bullets.slice(0, 5)
          : [`Síntese dos pontos abordados na seção "${sec.title}".`];

      for (const topic of topics) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'bullet',
          content: topic,
        });
      }

      if (sec.firstVisualBlock) {
        const visualBytes =
          sec.firstVisualBlock.type === 'image'
            ? calculateBlockImageBytes(sec.firstVisualBlock)
            : 0;
        if (runningImageBytes + visualBytes <= MAX_PROJECT_IMAGE_BYTES) {
          blocks.push(cloneVisualBlockForTarget(sec.firstVisualBlock));
          runningImageBytes += visualBytes;
        }
      }
    }

    // Cenário 4 (RDJ-09.2): Encerramento — slide de agradecimentos + até 5 referências citadas
    blocks.push({
      id: crypto.randomUUID(),
      type: 'h1',
      content: 'Agradecimentos',
    });

    const customAck = sourceProject.metadata.acknowledgments?.trim();
    blocks.push({
      id: crypto.randomUUID(),
      type: 'paragraph',
      content:
        customAck
          ? extractFirstSentence(customAck, 260)
          : `Agradecimentos à banca examinadora, à orientação${
              sourceProject.metadata.advisor?.trim()
                ? ` (${sourceProject.metadata.advisor.trim()})`
                : ''
            } e à instituição ${
              sourceProject.metadata.institution?.trim() || ''
            } pelo suporte ao desenvolvimento desta pesquisa.`,
    });
    blocks.push({
      id: crypto.randomUUID(),
      type: 'bullet',
      content: 'Obrigado pela atenção! Espaço aberto para arguição e perguntas da banca.',
    });
  }

  const topReferences = extractTopCitedReferences(sourceProject, 5).map((ref) => ({
    ...structuredClone(ref),
    id: crypto.randomUUID(),
  }));

  const clonedMetadata = structuredClone(sourceProject.metadata);

  return {
    id: crypto.randomUUID(),
    name: uniqueName,
    templateType: 'presentation',
    sourceProjectId: sourceProject.id,
    sourceProjectName: sourceProject.name,
    generatedFrom: {
      id: sourceProject.id,
      name: sourceProject.name,
    },
    ownerEmail: sourceProject.ownerEmail,
    templateConfig: {
      ...DEFAULT_TEMPLATE_CONFIG,
      preset: 'presentation',
      fontFamily: 'sans',
      fontSizePt: 18,
      presentationTheme: options.theme ?? 'institucional',
      presentationAspectRatio: options.aspectRatio ?? '16:9',
      citationFormat: sourceProject.templateConfig?.citationFormat ?? 'abnt_titlecase',
      citationStyle: sourceProject.templateConfig?.citationStyle ?? 'titlecase',
      referenceHighlight: sourceProject.templateConfig?.referenceHighlight ?? 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'compact',
      includeCoverPage: true,
      includeTitlePage: false,
      includeToc: false,
    },
    metadata: {
      ...clonedMetadata,
      title: clonedMetadata.title?.trim() || sourceProject.name,
      author: clonedMetadata.author?.trim() || 'Nome do Autor',
      advisor: clonedMetadata.advisor?.trim() || '',
      institution: clonedMetadata.institution?.trim() || 'Instituição de Ensino',
    },
    blocks,
    references: topReferences,
    updatedAt: now,
  };
}

/**
 * Gera um novo projeto de Pôster A0 (`poster`) a partir de um trabalho acadêmico (RDJ-09.7).
 * - Cria um pôster A0 com título, autores, instituição, seções resumidas e principais figuras.
 * - Garante conformidade imediata com `posterLinter` (título + autor preenchidos, <= 800 palavras, elemento visual presente).
 * - Preserva o projeto original inalterado.
 */
export function generatePosterFromWorkProject(
  sourceProject: DocumentProject,
  existingProjectsOrOptions: Pick<DocumentProject, 'name'>[] | GeneratePosterFromWorkOptions = [],
  maybeOptions: GeneratePosterFromWorkOptions = {},
): DocumentProject {
  const existingProjects = Array.isArray(existingProjectsOrOptions)
    ? existingProjectsOrOptions
    : (existingProjectsOrOptions.existingProjects ?? []);
  const options = Array.isArray(existingProjectsOrOptions)
    ? maybeOptions
    : existingProjectsOrOptions;
  const now = new Date().toISOString();
  const baseName = options.customName?.trim() || `Pôster A0 — ${sourceProject.name}`;
  let uniqueName = baseName;
  let counter = 2;
  while (
    existingProjects.some((p) => p.name.trim().toLowerCase() === uniqueName.toLowerCase())
  ) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }

  const sections = extractSectionsForSlides(sourceProject);
  const blocks: Block[] = [];
  let runningImageBytes = getDataUrlByteSize(sourceProject.metadata.institutionLogoDataUrl);
  let hasVisualElement = false;
  let copiedVisualsCount = 0;

  if (sections.length > 0) {
    for (const sec of sections.slice(0, 6)) {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h1',
        content: sec.title,
      });

      const condensedBullets =
        sec.bullets.length > 0
          ? sec.bullets.slice(0, 2).map((b) => extractFirstSentence(b, 130))
          : [`Síntese da seção ${sec.title}.`];

      for (const bullet of condensedBullets) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'bullet',
          content: bullet,
        });
      }

      if (sec.firstVisualBlock && copiedVisualsCount < 3) {
        const visualBytes =
          sec.firstVisualBlock.type === 'image'
            ? calculateBlockImageBytes(sec.firstVisualBlock)
            : 0;
        if (runningImageBytes + visualBytes <= MAX_PROJECT_IMAGE_BYTES) {
          blocks.push(cloneVisualBlockForTarget(sec.firstVisualBlock));
          runningImageBytes += visualBytes;
          hasVisualElement = true;
          copiedVisualsCount++;
        }
      }
    }
  } else {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'h1',
      content: '1. Introdução e Objetivos',
    });
    const abstractSnippet = extractFirstSentence(
      sourceProject.metadata.abstract || 'Síntese dos objetivos e metodologia da pesquisa.',
      160,
    );
    blocks.push({
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: abstractSnippet,
    });

    let added = 0;
    for (const b of sourceProject.blocks) {
      if ((b.type === 'paragraph' || b.type === 'bullet') && added < 3) {
        const s = extractFirstSentence(b.content, 130);
        if (s) {
          blocks.push({
            id: crypto.randomUUID(),
            type: 'bullet',
            content: s,
          });
          added++;
        }
      } else if (
        (b.type === 'image' || b.type === 'table' || b.type === 'box') &&
        copiedVisualsCount < 2
      ) {
        const visualBytes = b.type === 'image' ? calculateBlockImageBytes(b) : 0;
        if (runningImageBytes + visualBytes <= MAX_PROJECT_IMAGE_BYTES) {
          blocks.push(cloneVisualBlockForTarget(b));
          runningImageBytes += visualBytes;
          hasVisualElement = true;
          copiedVisualsCount++;
        }
      }
    }
  }

  // Garante pelo menos um elemento visual (quadro-síntese ou figura) para que o posterLinter não emita aviso de ausência visual (RDJ-09.7 Cenário 2)
  if (!hasVisualElement) {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'box',
      content: '',
      meta: {
        caption: 'Síntese Metodológica e Principais Contribuições',
        source: 'Elaborado pelos autores',
        headers: ['Dimensão', 'Destaque do Trabalho'],
        rows: [
          ['Objetivo', extractFirstSentence(sourceProject.metadata.title || sourceProject.name, 90)],
          [
            'Instituição',
            sourceProject.metadata.institution?.trim() || 'Pesquisa Acadêmica',
          ],
        ],
      },
    });
  }

  const topReferences = extractTopCitedReferences(sourceProject, 5).map((ref) => ({
    ...structuredClone(ref),
    id: crypto.randomUUID(),
  }));

  const clonedMetadata = structuredClone(sourceProject.metadata);

  return {
    id: crypto.randomUUID(),
    name: uniqueName,
    templateType: 'poster',
    sourceProjectId: sourceProject.id,
    sourceProjectName: sourceProject.name,
    generatedFrom: {
      id: sourceProject.id,
      name: sourceProject.name,
    },
    ownerEmail: sourceProject.ownerEmail,
    templateConfig: {
      ...DEFAULT_TEMPLATE_CONFIG,
      preset: 'poster',
      fontFamily: 'sans',
      fontSizePt: 22,
      posterDimensions: 'a0',
      posterOrientation: 'portrait',
      posterColumns: 3,
      posterTheme: options.posterTheme ?? 'emerald',
      citationFormat: sourceProject.templateConfig?.citationFormat ?? 'abnt_titlecase',
      referenceAlignment: 'justify',
      referenceSpacing: 'compact',
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
    },
    metadata: {
      ...clonedMetadata,
      title: clonedMetadata.title?.trim() || sourceProject.name,
      author: clonedMetadata.author?.trim() || 'Nome do Autor',
      institution: clonedMetadata.institution?.trim() || 'Instituição de Ensino',
    },
    blocks,
    references: topReferences,
    updatedAt: now,
  };
}
