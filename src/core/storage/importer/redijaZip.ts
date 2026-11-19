import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import { getVirtualImagePath } from '@/core/transpiler/typstGenerator';
import { parseBackup } from '../db';
import { ImportFailure, throwIfCancelled } from './errors';
import { uint8ArrayToDataUrl } from './shared';
import { ImportOptions } from './types';

/**
 * Arquivos que o macOS grava ao compactar uma pasta: `__MACOSX/` e os `._*` (AppleDouble, com os
 * atributos estendidos). Um `__MACOSX/projeto/._projeto.redija` termina em `.redija` mas é binário.
 */
export function isSystemJunkEntry(name: string): boolean {
  const parts = name.split('/').filter(Boolean);
  const base = parts.pop() ?? '';
  return base.startsWith('._') || parts.some((part) => part.toLowerCase() === '__macosx');
}

/** O `.redija` do pacote exportado pelo próprio Redija (o mais próximo da raiz), se houver. */
export function findRedijaEntry(zip: JSZip): string | undefined {
  return Object.keys(zip.files)
    .filter((n) => !zip.files[n].dir && n.toLowerCase().endsWith('.redija') && !isSystemJunkEntry(n))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0];
}

/** `assets/img_<id>.png` → `img_<id>`, no mesmo formato de nome que a exportação usa. */
const assetStem = (fileName: string) =>
  (fileName.split('/').pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase();

/**
 * Restaura um projeto a partir de um ZIP exportado pelo RedijaApp (`*.redija` + `assets/img_<id>.*`).
 * Importação 100% local, sem passar pelo serviço de conversão.
 */
export async function importFromRedijaZip(
  zip: JSZip,
  redijaEntry: string,
  { onProgress, signal }: ImportOptions = {},
): Promise<DocumentProject> {
  const json = await zip.files[redijaEntry].async('string', (meta) =>
    onProgress?.({ stage: 'extracting', percent: meta.percent }),
  );
  throwIfCancelled(signal);
  onProgress?.({ stage: 'building' });

  let project: DocumentProject;
  try {
    project = parseBackup(json);
  } catch (err) {
    throw new ImportFailure(
      `O .redija dentro do .zip não pôde ser lido: ${err instanceof Error ? err.message : 'arquivo inválido.'}`,
    );
  }

  const assetsByStem = new Map<string, string>();
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || isSystemJunkEntry(name)) continue;
    assetsByStem.set(assetStem(name), name);
  }

  for (const block of project.blocks) {
    if (block.type !== 'image' || block.meta?.imageDataUrl) continue;
    // Nome exato: `img_b1` não pode pegar `img_b10.png` nem `img_b1_2.png` (subimagem)
    const expectedStem = assetStem(getVirtualImagePath(block.id, 'x'));
    const candidateAsset = assetsByStem.get(expectedStem);
    if (!candidateAsset) continue;
    const bytes = await zip.files[candidateAsset].async('uint8array');
    throwIfCancelled(signal);
    const ext = candidateAsset.split('.').pop() || 'png';
    block.meta = {
      ...block.meta,
      caption: block.meta?.caption || 'Figura importada',
      source: block.meta?.source || 'do autor',
      imageDataUrl: uint8ArrayToDataUrl(bytes, ext),
    };
  }

  return project;
}
