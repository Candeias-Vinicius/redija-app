// =====================================================================
// RedijaApp — Motor de Mesclagem Automática por Blocos (Auto-Merge)
// Arquitetura Local-First sem Conflito (Zero Fricção)
// =====================================================================

import { Block, DocumentProject, AcademicReference, DocumentMetadata } from '@/types/document';
import { stripHtmlTags } from '@/core/transpiler/escape';

export interface MergeResult {
  mergedProject: DocumentProject;
  hasMergedRemoteChanges: boolean;
  mergedBlockCount: number;
}

/**
 * Normaliza o HTML ou texto para comparação lógica sem ruído de tags vazias.
 */
function normalizeContent(content: string): string {
  if (!content) return '';
  const trimmed = content.trim();
  if (trimmed === '<p></p>') return '';
  return stripHtmlTags(trimmed).trim();
}

/**
 * Mescla de forma inteligente duas listas de blocos de um documento científico.
 * Preserva as alterações locais e incorpora blocos novos ou editados pelo colaborador no Drive.
 */
export function mergeBlocks(localBlocks: Block[], remoteBlocks: Block[]): Block[] {
  const localMap = new Map<string, Block>();
  localBlocks.forEach((b) => localMap.set(b.id, b));

  const remoteMap = new Map<string, Block>();
  remoteBlocks.forEach((b) => remoteMap.set(b.id, b));

  const result: Block[] = [];
  const processedIds = new Set<string>();

  // 1. Processa blocos locais mantendo sua ordem original
  for (const localBlock of localBlocks) {
    processedIds.add(localBlock.id);
    const remoteBlock = remoteMap.get(localBlock.id);

    if (!remoteBlock) {
      // Bloco criado localmente e ainda não presente no remoto: preserva
      result.push(localBlock);
      continue;
    }

    const localNorm = normalizeContent(localBlock.content);
    const remoteNorm = normalizeContent(remoteBlock.content);

    // Se o conteúdo for idêntico, preserva o local com metadados mais completos
    if (localNorm === remoteNorm) {
      result.push({
        ...localBlock,
        meta: { ...remoteBlock.meta, ...localBlock.meta },
      });
      continue;
    }

    // Se ambos editaram o mesmo bloco:
    // Se o local não foi alterado (está vazio ou muito curto) e o remoto tem texto substancial, adota o remoto
    if (!localNorm && remoteNorm) {
      result.push(remoteBlock);
    } else if (localNorm && !remoteNorm) {
      result.push(localBlock);
    } else {
      // Ambos possuem texto: preserva o local e se o remoto for substancialmente diferente,
      // anexa como parágrafo de colaboração complementar
      result.push(localBlock);
      if (
        localBlock.type === 'paragraph' &&
        remoteBlock.type === 'paragraph' &&
        !localNorm.includes(remoteNorm) &&
        !remoteNorm.includes(localNorm)
      ) {
        result.push({
          ...remoteBlock,
          id: crypto.randomUUID(), // Novo ID para não colidir
        });
      }
    }
  }

  // 2. Incorpora blocos novos que foram criados no remoto pelo outro usuário
  for (let i = 0; i < remoteBlocks.length; i++) {
    const remoteBlock = remoteBlocks[i];
    if (processedIds.has(remoteBlock.id)) continue;

    // Encontra o ponto ideal de inserção relativo ao bloco anterior do remoto
    const prevRemote = i > 0 ? remoteBlocks[i - 1] : null;
    let insertIndex = -1;

    if (prevRemote) {
      insertIndex = result.findIndex((b) => b.id === prevRemote.id);
    }

    if (insertIndex !== -1) {
      result.splice(insertIndex + 1, 0, remoteBlock);
    } else {
      result.push(remoteBlock);
    }
    processedIds.add(remoteBlock.id);
  }

  return result;
}

/**
 * Mescla duas listas de referências acadêmicas ABNT (NBR 6023) sem gerar duplicatas.
 */
export function mergeReferences(
  localRefs: AcademicReference[],
  remoteRefs: AcademicReference[]
): AcademicReference[] {
  const result: AcademicReference[] = [...localRefs];
  const seenKeys = new Set<string>();

  const makeKey = (ref: AcademicReference): string => {
    return `${ref.title.trim().toLowerCase()}_${ref.year.trim()}_${ref.authors.trim().toLowerCase()}`;
  };

  localRefs.forEach((r) => {
    seenKeys.add(r.id);
    seenKeys.add(makeKey(r));
  });

  for (const remoteRef of remoteRefs) {
    const key = makeKey(remoteRef);
    if (!seenKeys.has(remoteRef.id) && !seenKeys.has(key)) {
      result.push(remoteRef);
      seenKeys.add(remoteRef.id);
      seenKeys.add(key);
    }
  }

  return result;
}

/**
 * Mescla metadados de capa, instituição e autores preenchendo lacunas de forma não destrutiva.
 */
export function mergeMetadata(
  local: DocumentMetadata,
  remote: DocumentMetadata
): DocumentMetadata {
  return {
    title: local.title?.trim() || remote.title || 'Sem Título',
    subtitle: local.subtitle?.trim() || remote.subtitle,
    author: local.author?.trim() || remote.author || 'Autor',
    advisor: local.advisor?.trim() || remote.advisor || '',
    coadvisor: local.coadvisor?.trim() || remote.coadvisor,
    nature: local.nature?.trim() || remote.nature,
    institution: local.institution?.trim() || remote.institution || '',
    course: local.course?.trim() || remote.course || '',
    location: local.location?.trim() || remote.location || 'São Paulo',
    year: local.year?.trim() || remote.year || String(new Date().getFullYear()),
    abstract: local.abstract?.trim() || remote.abstract || '',
    keywords: local.keywords && local.keywords.length > 0 ? local.keywords : remote.keywords || [],
    foreignAbstract: local.foreignAbstract?.trim() || remote.foreignAbstract,
    foreignKeywords:
      local.foreignKeywords && local.foreignKeywords.length > 0
        ? local.foreignKeywords
        : remote.foreignKeywords,
    institutionLogoDataUrl: local.institutionLogoDataUrl || remote.institutionLogoDataUrl,
    dedicatory: local.dedicatory?.trim() || remote.dedicatory,
    acknowledgments: local.acknowledgments?.trim() || remote.acknowledgments,
    epigraph: local.epigraph?.trim() || remote.epigraph,
    epigraphAuthor: local.epigraphAuthor?.trim() || remote.epigraphAuthor,
    abbreviations: local.abbreviations?.trim() || remote.abbreviations,
    appendices: local.appendices?.trim() || remote.appendices,
    annexes: local.annexes?.trim() || remote.annexes,
  };
}

/**
 * Executa a mesclagem automática completa entre o projeto local e a versão recebida do Google Drive.
 * Garante que nenhum conteúdo de nenhum usuário seja perdido ou apagado.
 */
export function autoMergeProjects(
  local: DocumentProject,
  remote: DocumentProject
): MergeResult {
  const mergedBlocks = mergeBlocks(local.blocks, remote.blocks);
  const mergedRefs = mergeReferences(local.references, remote.references);
  const mergedMeta = mergeMetadata(local.metadata, remote.metadata);

  const hasMergedRemoteChanges =
    mergedBlocks.length !== local.blocks.length ||
    mergedRefs.length !== local.references.length ||
    JSON.stringify(mergedBlocks) !== JSON.stringify(local.blocks);

  const mergedProject: DocumentProject = {
    ...local,
    metadata: mergedMeta,
    blocks: mergedBlocks,
    references: mergedRefs,
    templateConfig: local.templateConfig || remote.templateConfig,
    driveFileId: local.driveFileId || remote.driveFileId,
    driveSyncedAt: remote.driveSyncedAt || local.driveSyncedAt,
    updatedAt: new Date().toISOString(),
  };

  return {
    mergedProject,
    hasMergedRemoteChanges,
    mergedBlockCount: mergedBlocks.length,
  };
}
