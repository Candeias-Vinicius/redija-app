// =====================================================================
// RedijaApp — Controle de Quota de Imagens por Projeto (150 MB)
// =====================================================================

import { Block, DocumentMetadata, DocumentProject } from '@/types/document';

/**
 * Limite máximo de armazenamento de imagens por projeto: 150 MB (150 * 1024 * 1024 bytes).
 * Não há limite de quantidade de imagens — apenas o peso total acumulado no projeto.
 */
export const MAX_PROJECT_IMAGE_BYTES = 150 * 1024 * 1024; // 157.286.400 bytes

/**
 * Limite de tamanho para o relato de problemas (Bug Report):
 * - Até 5 imagens
 * - Até 5 MB por imagem (ou 15 MB no total dos 5 anexos, compatível com servidores SMTP)
 */
export const MAX_BUG_REPORT_IMAGES = 5;
export const MAX_BUG_REPORT_SINGLE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_BUG_REPORT_TOTAL_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

/**
 * Estima o tamanho real em bytes de uma Data URL (`data:image/...;base64,...`).
 */
export function getDataUrlByteSize(dataUrl?: string | null): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return new Blob([dataUrl]).size;
  const base64 = dataUrl.slice(commaIdx + 1);
  // Cada 4 caracteres Base64 representam 3 bytes binários
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Calcula o uso total em bytes de todas as imagens de um projeto
 * (soma de todos os blocos de imagem + brasão da capa se houver),
 * opcionalmente ignorando um bloco específico (útil ao substituir a imagem daquele bloco).
 */
export function calculateProjectImageBytes(
  blocks: Block[],
  metadata?: DocumentMetadata,
  excludeBlockId?: string,
): number {
  let total = 0;

  if (metadata?.institutionLogoDataUrl) {
    total += getDataUrlByteSize(metadata.institutionLogoDataUrl);
  }

  for (const block of blocks) {
    if (excludeBlockId && block.id === excludeBlockId) continue;
    if (block.type === 'image' && block.meta?.imageDataUrl) {
      total += getDataUrlByteSize(block.meta.imageDataUrl);
    }
  }

  return total;
}

/**
 * Conta quantas imagens ativas existem no projeto.
 */
export function countProjectImages(blocks: Block[], metadata?: DocumentMetadata): number {
  let count = 0;
  if (metadata?.institutionLogoDataUrl) count += 1;
  for (const block of blocks) {
    if (block.type === 'image' && block.meta?.imageDataUrl) {
      count += 1;
    }
  }
  return count;
}

/**
 * Formata bytes em string legível (KB / MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1).replace('.', ',')} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

/**
 * Valida se um arquivo de imagem pode ser adicionado ao projeto respeitando o teto de 150 MB.
 */
export function validateImageUploadForProject(
  file: File,
  currentProjectBytes: number,
): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Formato de imagem não suportado. Envie arquivos PNG, JPG, WebP ou GIF.',
    };
  }

  const nextTotalBytes = currentProjectBytes + file.size;
  if (nextTotalBytes > MAX_PROJECT_IMAGE_BYTES) {
    const availableBytes = Math.max(0, MAX_PROJECT_IMAGE_BYTES - currentProjectBytes);
    return {
      valid: false,
      error: `Limite de 150 MB de imagens por projeto excedido! Esta imagem tem ${formatBytes(
        file.size,
      )}, mas o projeto possui apenas ${formatBytes(availableBytes)} livres (uso atual: ${formatBytes(
        currentProjectBytes,
      )} / 150 MB).`,
    };
  }

  return { valid: true };
}

/**
 * Valida se o projeto inteiro (ex.: ao importar backup .redija) respeita o limite de 150 MB de imagens.
 */
export function validateProjectQuota(project: DocumentProject): { valid: boolean; error?: string } {
  const totalBytes = calculateProjectImageBytes(project.blocks, project.metadata);
  if (totalBytes > MAX_PROJECT_IMAGE_BYTES) {
    return {
      valid: false,
      error: `O projeto excede o limite máximo de 150 MB de imagens (${formatBytes(totalBytes)}).`,
    };
  }
  return { valid: true };
}
