import { DocumentProject } from '@/types/document';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { resolveProjectUniverseAssets } from '@/core/universe/universeResolver';
import { generateTypstFiles, extractBinaryAssets } from '@/core/transpiler/typstGenerator';
import { compileToPdf, type PdfCompileOutput } from './typstClient';

/**
 * Orquestra resolução de pacotes Typst Universe, geração de código-fonte,
 * extração de imagens binárias e compilação para PDF via Web Worker.
 */
export async function compileProjectToPdf(project: DocumentProject): Promise<PdfCompileOutput> {
  const caps = getTemplateCapabilities(project);
  const pkgAssets =
    caps.effectiveType === 'universe_custom'
      ? await resolveProjectUniverseAssets(
          project.templateConfig?.universePackage || '@preview/charged-ieee:0.1.4',
        )
      : {};

  const files = generateTypstFiles(project, pkgAssets.extraFiles);
  const binaryFiles = extractBinaryAssets(project);

  return compileToPdf(
    files,
    binaryFiles,
    {
      fontFamily: project.templateConfig?.fontFamily ?? 'serif',
      customFontFamily: project.templateConfig?.customFontFamily,
    },
    pkgAssets.packageArchives,
  );
}

/**
 * Dispara o download de um Blob no navegador liberando a URL de objeto em seguida.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
