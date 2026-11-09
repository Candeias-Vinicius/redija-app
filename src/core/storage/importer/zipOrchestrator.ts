import JSZip from 'jszip';
import { AcademicReference, DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { parseBibtex } from '../../transpiler/abntLinter';
import { uint8ArrayToDataUrl } from './shared';
import { parseLatexToProject } from './latexParser';
import { parseTypstToProject } from './typstParser';

type ZipObjectWithInternalData = JSZip.JSZipObject & {
  _data?: {
    uncompressedSize?: number;
  };
};

async function extractReferencesAndImagesFromZip(
  zip: JSZip,
  fileNames: string[],
): Promise<{ references: AcademicReference[]; imageMap: Map<string, string> }> {
  let references: AcademicReference[] = [];
  const bibFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.bib'));
  for (const bibName of bibFiles) {
    try {
      const bibContent = await zip.files[bibName].async('string');
      const parsed = parseBibtex(bibContent);
      references = [...references, ...parsed];
    } catch (err) {
      console.warn(`Erro ao processar arquivo bibtex ${bibName}:`, err);
    }
  }

  const imageMap = new Map<string, string>();
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const imageEntries = fileNames.filter((n) =>
    imageExtensions.some((ext) => n.toLowerCase().endsWith(ext)),
  );

  for (const imgName of imageEntries) {
    try {
      const bytes = await zip.files[imgName].async('uint8array');
      const ext = imgName.split('.').pop()?.toLowerCase() || 'png';
      const dataUrl = uint8ArrayToDataUrl(bytes, ext);
      const baseName = imgName.split('/').pop()?.toLowerCase() || imgName.toLowerCase();

      imageMap.set(imgName.toLowerCase(), dataUrl);
      imageMap.set(baseName, dataUrl);
      imageMap.set(baseName.replace(/\.[^.]+$/, ''), dataUrl);
    } catch (err) {
      console.warn(`Erro ao ler imagem ${imgName}:`, err);
    }
  }

  return { references, imageMap };
}

async function importFromTypstZip(
  zip: JSZip,
  fileNames: string[],
  typFiles: string[],
  zipFileName: string,
): Promise<DocumentProject> {
  const preferredNames = [
    'main.typ',
    'paper.typ',
    'article.typ',
    'artigo.typ',
    'tcc.typ',
    'document.typ',
  ];
  let mainTypFile = typFiles.find((n) => {
    const base = n.split('/').pop()?.toLowerCase();
    return base && preferredNames.includes(base);
  });

  if (!mainTypFile) {
    mainTypFile =
      typFiles.find((n) => {
        const base = n.split('/').pop()?.toLowerCase() || '';
        return !['abnt.typ', 'sbc.typ', 'ieee.typ', 'poster.typ', 'template.typ'].includes(base);
      }) ?? typFiles[0];
  }

  const typContent = await zip.files[mainTypFile].async('string');
  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Typst';

  return parseTypstToProject(typContent, cleanProjectName, imageMap, references);
}

async function importFromOverleafZip(
  zip: JSZip,
  fileNames: string[],
  texFiles: string[],
  zipFileName: string,
): Promise<DocumentProject> {
  const preferredNames = ['main.tex', 'tcc.tex', 'artigo.tex', 'document.tex', 'trabalho.tex'];
  let mainTexFile = texFiles.find((n) => {
    const base = n.split('/').pop()?.toLowerCase();
    return base && preferredNames.includes(base);
  });

  if (!mainTexFile) {
    let maxSize = -1;
    for (const t of texFiles) {
      const entry = zip.files[t] as ZipObjectWithInternalData;
      const size = entry._data?.uncompressedSize ?? 0;
      if (size > maxSize) {
        maxSize = size;
        mainTexFile = t;
      }
    }
  }

  if (!mainTexFile) {
    mainTexFile = texFiles[0];
  }

  const texContent = await zip.files[mainTexFile].async('string');
  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Overleaf';
  return parseLatexToProject(texContent, cleanProjectName, imageMap, references);
}

/**
 * Importa arquivos ZIP de projetos RedijaApp, Overleaf/LaTeX ou Typst.
 */
export async function importFromZip(
  arrayBuffer: ArrayBuffer,
  zipFileName: string,
): Promise<DocumentProject> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

  // CENÁRIO 1: PROJETO DO REDIJAAPP (.zip contendo *.redija)
  const redijaEntry = fileNames.find((n) => n.toLowerCase().endsWith('.redija'));
  if (redijaEntry) {
    const jsonContent = await zip.files[redijaEntry].async('string');
    const project = parseBackup(jsonContent);

    for (const block of project.blocks) {
      if (block.type === 'image' && !block.meta?.imageDataUrl) {
        const candidateAsset = fileNames.find((n) =>
          n.toLowerCase().includes(`img_${block.id.toLowerCase()}`),
        );
        if (candidateAsset) {
          const bytes = await zip.files[candidateAsset].async('uint8array');
          const ext = candidateAsset.split('.').pop() || 'png';
          block.meta = {
            ...block.meta,
            caption: block.meta?.caption || 'Figura importada',
            source: block.meta?.source || 'do autor',
            imageDataUrl: uint8ArrayToDataUrl(bytes, ext),
          };
        }
      }
    }

    return project;
  }

  // CENÁRIO 2: PROJETO DO OVERLEAF / LATEX (.zip contendo *.tex)
  const texFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.tex'));
  if (texFiles.length > 0) {
    return await importFromOverleafZip(zip, fileNames, texFiles, zipFileName);
  }

  // CENÁRIO 3: PROJETO TYPST (.zip contendo *.typ)
  const typFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.typ'));
  if (typFiles.length > 0) {
    return await importFromTypstZip(zip, fileNames, typFiles, zipFileName);
  }

  throw new Error(
    'O arquivo ZIP selecionado não foi reconhecido. Envie um projeto exportado pelo RedijaApp (.zip), Overleaf (.tex) ou Typst (.typ).',
  );
}
