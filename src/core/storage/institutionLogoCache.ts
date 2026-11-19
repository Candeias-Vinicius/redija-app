// =====================================================================
// RedijaApp — Cache Local de Brasão por Instituição (RDJ-02.4)
// Permite reaproveitar automaticamente o brasão enviado pelo usuário em
// novos projetos da mesma instituição, sem nunca enviar a servidores.
// =====================================================================

import { db } from './db';

/**
 * Normaliza a chave da instituição (sigla ou nome) para reaproveitamento consistente.
 */
export function normalizeInstitutionLogoKey(rawKey?: string | null): string | null {
  if (!rawKey) return null;
  const normalized = rawKey
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || null;
}

/**
 * Salva o Data URL do brasão para uma instituição no IndexedDB local.
 */
export async function saveCachedInstitutionLogo(
  institutionKey: string | null | undefined,
  dataUrl: string,
): Promise<void> {
  const key = normalizeInstitutionLogoKey(institutionKey);
  if (!key || !dataUrl) return;
  try {
    await db.institutionLogos.put({
      institutionKey: key,
      dataUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Falha silenciosa em ambientes sem IndexedDB
  }
}

/**
 * Recupera o brasão salvo anteriormente para a instituição, se existir.
 */
export async function getCachedInstitutionLogo(
  institutionKey?: string | null,
): Promise<string | undefined> {
  const key = normalizeInstitutionLogoKey(institutionKey);
  if (!key) return undefined;
  try {
    const entry = await db.institutionLogos.get(key);
    return entry?.dataUrl;
  } catch {
    return undefined;
  }
}

/**
 * Remove o brasão salvo para a instituição.
 */
export async function removeCachedInstitutionLogo(
  institutionKey?: string | null,
): Promise<void> {
  const key = normalizeInstitutionLogoKey(institutionKey);
  if (!key) return;
  try {
    await db.institutionLogos.delete(key);
  } catch {
    // Ignora
  }
}
