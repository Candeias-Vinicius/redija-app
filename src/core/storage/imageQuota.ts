// =====================================================================
// RedijaApp — Controle de Quota de Imagens por Projeto (250 MB)
// =====================================================================

import { Block, DocumentMetadata, DocumentProject, SubImageItem } from '@/types/document';

/**
 * Limite máximo de imagens compostas dentro de um único bloco de Figura.
 */
export const MAX_IMAGES_PER_BLOCK = 4;

/**
 * Limite máximo de armazenamento de imagens por projeto: 250 MB (250 * 1024 * 1024 bytes).
 * Não há limite de quantidade de imagens — apenas o peso total acumulado no projeto.
 */
export const MAX_PROJECT_IMAGE_BYTES = 250 * 1024 * 1024; // 262.144.000 bytes

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
 * Limite máximo para o brasão da instituição na capa (RDJ-02.4): 2 MB.
 */
export const MAX_INSTITUTION_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_INSTITUTION_LOGO_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
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
 * Retorna a lista normalizada de imagens (1 a 4) presentes em um bloco de figura,
 * mantendo retrocompatibilidade total com blocos que possuem apenas `imageDataUrl`.
 */
export function getBlockImages(block: Block): SubImageItem[] {
  if (block.type !== 'image') return [];
  const sub = block.meta?.subImages;
  if (Array.isArray(sub) && sub.length > 0) {
    return sub
      .filter((item): item is SubImageItem => Boolean(item && typeof item.dataUrl === 'string' && item.dataUrl))
      .slice(0, MAX_IMAGES_PER_BLOCK);
  }
  if (typeof block.meta?.imageDataUrl === 'string' && block.meta.imageDataUrl) {
    return [
      {
        id: `${block.id}_0`,
        dataUrl: block.meta.imageDataUrl,
        mime: block.meta.imageMime,
        label: '',
      },
    ];
  }
  return [];
}

/**
 * Calcula o peso em bytes de todas as imagens pertencentes a um único bloco de figura.
 */
export function calculateBlockImageBytes(block: Block): number {
  let bytes = 0;
  for (const item of getBlockImages(block)) {
    bytes += getDataUrlByteSize(item.dataUrl);
  }
  return bytes;
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
    if (block.type === 'image') {
      total += calculateBlockImageBytes(block);
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
    if (block.type === 'image') {
      count += getBlockImages(block).length;
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
 * Valida se um arquivo de imagem pode ser adicionado ao projeto respeitando o teto de 250 MB.
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
      error: `Limite de 250 MB de imagens por projeto excedido! Esta imagem tem ${formatBytes(
        file.size,
      )}, mas o projeto possui apenas ${formatBytes(availableBytes)} livres (uso atual: ${formatBytes(
        currentProjectBytes,
      )} / 250 MB).`,
    };
  }

  return { valid: true };
}

/**
 * Valida o upload de um ou vários arquivos de imagem para um bloco de figura,
 * garantindo até 4 imagens por bloco e o teto de 250 MB do projeto.
 */
export function validateMultipleImageUploadsForProject(
  files: File[],
  currentProjectBytes: number,
  existingBlockImageCount = 0,
): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: 'Nenhuma imagem selecionada.' };
  }

  if (existingBlockImageCount + files.length > MAX_IMAGES_PER_BLOCK) {
    return {
      valid: false,
      error: `Cada bloco de Figura comporta até ${MAX_IMAGES_PER_BLOCK} imagens juntas (atualmente: ${existingBlockImageCount}/${MAX_IMAGES_PER_BLOCK}).`,
    };
  }

  let runningBytes = currentProjectBytes;
  for (const file of files) {
    const check = validateImageUploadForProject(file, runningBytes);
    if (!check.valid) return check;
    runningBytes += file.size;
  }

  return { valid: true };
}

/**
 * Valida o envio de brasão/logotipo da instituição (RDJ-02.4):
 * - Formatos aceitos: PNG, JPG ou SVG
 * - Tamanho máximo: 2 MB
 * - Respeita a cota geral de 250 MB de imagens do projeto
 */
export function validateInstitutionLogoUpload(
  file: File,
  currentProjectBytesWithoutLogo: number,
): { valid: boolean; error?: string } {
  const mime = (file.type || '').toLowerCase();
  const ext = (file.name || '').toLowerCase().split('.').pop() ?? '';
  const hasAllowedMime = ALLOWED_INSTITUTION_LOGO_MIMES.includes(mime);
  const hasAllowedExt = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'svg';

  if (!hasAllowedMime && !(mime === '' && hasAllowedExt)) {
    return {
      valid: false,
      error: 'Formato não suportado para o brasão. Envie uma imagem PNG, JPG ou SVG de até 2 MB.',
    };
  }

  if (file.size > MAX_INSTITUTION_LOGO_BYTES) {
    return {
      valid: false,
      error: `O brasão excede o limite de 2 MB (arquivo selecionado: ${formatBytes(file.size)}). Envie uma imagem PNG, JPG ou SVG de até 2 MB.`,
    };
  }

  const nextTotalBytes = currentProjectBytesWithoutLogo + file.size;
  if (nextTotalBytes > MAX_PROJECT_IMAGE_BYTES) {
    const availableBytes = Math.max(0, MAX_PROJECT_IMAGE_BYTES - currentProjectBytesWithoutLogo);
    return {
      valid: false,
      error: `Limite de 250 MB de imagens por projeto excedido. O brasão tem ${formatBytes(
        file.size,
      )}, mas restam apenas ${formatBytes(availableBytes)} livres no projeto.`,
    };
  }

  return { valid: true };
}

/**
 * Valida se o projeto inteiro (ex.: ao importar backup .redija) respeita o limite de 250 MB de imagens.
 */
export function validateProjectQuota(project: DocumentProject): { valid: boolean; error?: string } {
  const totalBytes = calculateProjectImageBytes(project.blocks, project.metadata);
  if (totalBytes > MAX_PROJECT_IMAGE_BYTES) {
    return {
      valid: false,
      error: `O projeto excede o limite máximo de 250 MB de imagens (${formatBytes(totalBytes)}).`,
    };
  }
  return { valid: true };
}
