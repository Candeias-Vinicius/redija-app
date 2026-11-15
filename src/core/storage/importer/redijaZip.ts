import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { uint8ArrayToDataUrl } from './shared';

/** Nome do primeiro `.redija` dentro do ZIP (pacote exportado pelo próprio Redija), se houver. */
export function findRedijaEntry(zip: JSZip): string | undefined {
  return Object.keys(zip.files).find((n) => !zip.files[n].dir && n.toLowerCase().endsWith('.redija'));
}

/**
 * Restaura um projeto a partir de um ZIP exportado pelo RedijaApp (`*.redija` + `assets/img_<id>.*`).
 * Importação 100% local, sem passar pelo serviço de conversão.
 */
export async function importFromRedijaZip(zip: JSZip, redijaEntry: string): Promise<DocumentProject> {
  const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const project = parseBackup(await zip.files[redijaEntry].async('string'));

  for (const block of project.blocks) {
    if (block.type !== 'image' || block.meta?.imageDataUrl) continue;
    const candidateAsset = fileNames.find((n) => n.toLowerCase().includes(`img_${block.id.toLowerCase()}`));
    if (!candidateAsset) continue;
    const bytes = await zip.files[candidateAsset].async('uint8array');
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
