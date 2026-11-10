// =====================================================================
// RedijaApp — Motor de Mesclagem Automática por Blocos (Auto-Merge)
// Arquitetura Local-First sem Conflito (Zero Fricção)
// =====================================================================

import { Block, DocumentProject, AcademicReference, DocumentMetadata } from '@/types/document';
import { stripHtmlTags } from '@/core/transpiler/escape';

const MAX_TOMBSTONES = 500;

export interface MergeResult {
  mergedProject: DocumentProject;
  hasMergedRemoteChanges: boolean;
  mergedBlockCount: number;
}

export interface MergeBlocksOptions {
  localDeletedAt?: Record<string, number>;
  remoteDeletedAt?: Record<string, number>;
  preferRemoteOrder?: boolean;
}

/**
 * Mescla mapas de tombstones de blocos excluídos mantendo o timestamp mais recente
 * e limitando o tamanho do histórico para evitar crescimento ilimitado.
 */
export function mergeDeletedBlockTimestamps(
  localMap?: Record<string, number>,
  remoteMap?: Record<string, number>,
): Record<string, number> | undefined {
  const combined = new Map<string, number>();

  const collect = (source?: Record<string, number>) => {
    if (!source || typeof source !== 'object') return;
    for (const [id, ts] of Object.entries(source)) {
      if (
        !id ||
        id === '__proto__' ||
        id === 'constructor' ||
        id === 'prototype' ||
        typeof ts !== 'number' ||
        !Number.isFinite(ts) ||
        ts <= 0
      ) {
        continue;
      }
      const prev = combined.get(id) ?? 0;
      if (ts > prev) {
        combined.set(id, ts);
      }
    }
  };

  collect(localMap);
  collect(remoteMap);

  if (combined.size === 0) return undefined;

  const sorted = Array.from(combined.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOMBSTONES);

  return Object.fromEntries(sorted);
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

function isBlockDeletedByTombstone(
  block: Block,
  tombstones?: Record<string, number>,
): boolean {
  if (!tombstones) return false;
  const deletedAt = tombstones[block.id];
  if (typeof deletedAt !== 'number' || !Number.isFinite(deletedAt)) return false;
  const editedAt = typeof block.updatedAt === 'number' && Number.isFinite(block.updatedAt) ? block.updatedAt : 0;
  return deletedAt >= editedAt;
}

function resolveSharedBlockConflict(
  localBlock: Block,
  remoteBlock: Block,
): Block[] {
  const localNorm = normalizeContent(localBlock.content);
  const remoteNorm = normalizeContent(remoteBlock.content);

  // Se o conteúdo e o tipo forem idênticos, preserva o local com metadados mais recentes/completos
  if (localNorm === remoteNorm && localBlock.type === remoteBlock.type) {
    const localTime = localBlock.updatedAt ?? 0;
    const remoteTime = remoteBlock.updatedAt ?? 0;
    return [
      {
        ...localBlock,
        updatedAt: Math.max(localTime, remoteTime) || localBlock.updatedAt,
        meta:
          remoteTime > localTime
            ? { ...localBlock.meta, ...remoteBlock.meta }
            : { ...remoteBlock.meta, ...localBlock.meta },
      },
    ];
  }

  // Se ambos editaram o mesmo bloco, vence o timestamp mais recente de forma determinística
  const localTime = localBlock.updatedAt ?? 0;
  const remoteTime = remoteBlock.updatedAt ?? 0;

  if (remoteTime > localTime) {
    return [
      {
        ...remoteBlock,
        meta: remoteBlock.meta ?? localBlock.meta,
      },
    ];
  }

  if (localTime > remoteTime) {
    return [
      {
        ...localBlock,
        meta: localBlock.meta ?? remoteBlock.meta,
      },
    ];
  }

  // Timestamps iguais ou ausentes: heurística não-destrutiva legada
  if (!localNorm && remoteNorm) {
    return [remoteBlock];
  }
  if (localNorm && !remoteNorm) {
    return [localBlock];
  }

  const resolved: Block[] = [localBlock];
  if (
    localBlock.type === 'paragraph' &&
    remoteBlock.type === 'paragraph' &&
    !localNorm.includes(remoteNorm) &&
    !remoteNorm.includes(localNorm)
  ) {
    resolved.push({
      ...remoteBlock,
      id: crypto.randomUUID(),
    });
  }
  return resolved;
}

/**
 * Mescla de forma inteligente duas listas de blocos de um documento científico.
 * Suporta tombstones de exclusão e preferência explícita de reordenação remota.
 */
export function mergeBlocks(
  localBlocks: Block[],
  remoteBlocks: Block[],
  options?: MergeBlocksOptions,
): Block[] {
  const mergedTombstones = mergeDeletedBlockTimestamps(
    options?.localDeletedAt,
    options?.remoteDeletedAt,
  );
  const preferRemoteOrder = Boolean(options?.preferRemoteOrder);

  const localMap = new Map<string, Block>();
  localBlocks.forEach((b) => localMap.set(b.id, b));

  const remoteMap = new Map<string, Block>();
  remoteBlocks.forEach((b) => remoteMap.set(b.id, b));

  const primaryList = preferRemoteOrder ? remoteBlocks : localBlocks;
  const secondaryList = preferRemoteOrder ? localBlocks : remoteBlocks;

  const result: Block[] = [];
  const processedIds = new Set<string>();

  // 1. Processa sequência primária mantendo sua ordem
  for (const primaryBlock of primaryList) {
    processedIds.add(primaryBlock.id);
    const localBlock = localMap.get(primaryBlock.id);
    const remoteBlock = remoteMap.get(primaryBlock.id);

    if (localBlock && !remoteBlock) {
      if (isBlockDeletedByTombstone(localBlock, mergedTombstones)) {
        continue;
      }
      result.push(localBlock);
      continue;
    }

    if (!localBlock && remoteBlock) {
      if (isBlockDeletedByTombstone(remoteBlock, mergedTombstones)) {
        continue;
      }
      result.push(remoteBlock);
      continue;
    }

    if (localBlock && remoteBlock) {
      const winnerTime = Math.max(localBlock.updatedAt ?? 0, remoteBlock.updatedAt ?? 0);
      const deletedAt = mergedTombstones?.[localBlock.id];
      if (typeof deletedAt === 'number' && deletedAt >= winnerTime) {
        continue;
      }
      result.push(...resolveSharedBlockConflict(localBlock, remoteBlock));
    }
  }

  // 2. Incorpora blocos sobreviventes da sequência secundária na posição relativa do vizinho anterior
  for (let i = 0; i < secondaryList.length; i++) {
    const secondaryBlock = secondaryList[i];
    if (processedIds.has(secondaryBlock.id)) continue;
    processedIds.add(secondaryBlock.id);

    if (isBlockDeletedByTombstone(secondaryBlock, mergedTombstones)) {
      continue;
    }

    const prevSecondary = i > 0 ? secondaryList[i - 1] : null;
    let insertIndex = -1;

    if (prevSecondary) {
      insertIndex = result.findIndex((b) => b.id === prevSecondary.id);
    }

    if (insertIndex !== -1) {
      result.splice(insertIndex + 1, 0, secondaryBlock);
    } else {
      result.push(secondaryBlock);
    }
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
    ...remote,
    ...local,
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
    symbols: local.symbols?.trim() || remote.symbols,
    glossary: local.glossary?.trim() || remote.glossary,
    appendices: local.appendices?.trim() || remote.appendices,
    annexes: local.annexes?.trim() || remote.annexes,
  };
}

/**
 * Executa a mesclagem automática completa entre o projeto local e a versão recebida do Google Drive ou P2P.
 * Preserva exclusões (tombstones), reordenações, metadados, referências e segredos de sala.
 */
export function autoMergeProjects(
  local: DocumentProject,
  remote: DocumentProject
): MergeResult {
  const localOrderTime = local.blocksOrderUpdatedAt ?? 0;
  const remoteOrderTime = remote.blocksOrderUpdatedAt ?? 0;

  const mergedTombstones = mergeDeletedBlockTimestamps(
    local.deletedBlockTimestamps,
    remote.deletedBlockTimestamps,
  );

  const mergedBlocks = mergeBlocks(local.blocks, remote.blocks, {
    localDeletedAt: local.deletedBlockTimestamps,
    remoteDeletedAt: remote.deletedBlockTimestamps,
    preferRemoteOrder: remoteOrderTime > localOrderTime,
  });

  const localRefsTime = local.referencesUpdatedAt ?? 0;
  const remoteRefsTime = remote.referencesUpdatedAt ?? 0;
  const mergedRefs =
    remoteRefsTime > localRefsTime
      ? remote.references
      : localRefsTime > remoteRefsTime
        ? local.references
        : mergeReferences(local.references, remote.references);

  const localMetaTime = local.metadataUpdatedAt ?? 0;
  const remoteMetaTime = remote.metadataUpdatedAt ?? 0;
  const mergedMeta =
    remoteMetaTime > localMetaTime
      ? { ...local.metadata, ...remote.metadata }
      : localMetaTime > remoteMetaTime
        ? local.metadata
        : mergeMetadata(local.metadata, remote.metadata);

  const nextOrderTime = Math.max(localOrderTime, remoteOrderTime) || undefined;
  const nextMetaTime = Math.max(localMetaTime, remoteMetaTime) || undefined;
  const nextRefsTime = Math.max(localRefsTime, remoteRefsTime) || undefined;

  const blocksChanged =
    mergedBlocks.length !== local.blocks.length ||
    JSON.stringify(mergedBlocks) !== JSON.stringify(local.blocks);
  const refsChanged = JSON.stringify(mergedRefs) !== JSON.stringify(local.references);
  const metaChanged = JSON.stringify(mergedMeta) !== JSON.stringify(local.metadata);
  const tombstonesChanged =
    JSON.stringify(mergedTombstones) !== JSON.stringify(local.deletedBlockTimestamps);
  const secretChanged = Boolean(remote.collabSecret && !local.collabSecret);

  const hasMergedRemoteChanges =
    blocksChanged || refsChanged || metaChanged || tombstonesChanged || secretChanged;

  const mergedProject: DocumentProject = {
    ...local,
    metadata: mergedMeta,
    blocks: mergedBlocks,
    references: mergedRefs,
    templateConfig: local.templateConfig || remote.templateConfig,
    sidebarConfig: local.sidebarConfig || remote.sidebarConfig,
    driveFileId: local.driveFileId || remote.driveFileId,
    driveSyncedAt: remote.driveSyncedAt || local.driveSyncedAt,
    isSharedWithMe: local.isSharedWithMe ?? remote.isSharedWithMe,
    sharedBy: local.sharedBy ?? remote.sharedBy,
    shareRole: remote.shareRole || local.shareRole,
    collabSecret: local.collabSecret || remote.collabSecret,
    deletedBlockTimestamps: mergedTombstones,
    blocksOrderUpdatedAt: nextOrderTime,
    metadataUpdatedAt: nextMetaTime,
    referencesUpdatedAt: nextRefsTime,
    updatedAt: hasMergedRemoteChanges ? new Date().toISOString() : local.updatedAt,
  };

  return {
    mergedProject,
    hasMergedRemoteChanges,
    mergedBlockCount: mergedBlocks.length,
  };
}
