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

function findZipEntry(
  zip: JSZip,
  relativePath: string,
  defaultExt: string = '.tex',
): string | undefined {
  const normalized = relativePath.replace(/\\/g, '/').trim().toLowerCase();
  const withExt = normalized.endsWith(defaultExt) ? normalized : `${normalized}${defaultExt}`;
  const keys = Object.keys(zip.files);
  return keys.find((k) => {
    const lk = k.toLowerCase();
    return (
      lk === normalized ||
      lk === withExt ||
      lk.endsWith(`/${normalized}`) ||
      lk.endsWith(`/${withExt}`)
    );
  });
}

async function resolveLatexIncludes(
  zip: JSZip,
  content: string,
  visited: Set<string> = new Set(),
): Promise<string> {
  const includeRegex = /\\(?:include|input)\s*\{([^}]+)\}/g;
  let resolved = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = includeRegex.exec(content)) !== null) {
    // Se a linha estiver comentada com '%' antes do comando, ignora a expansão
    const lineStart = content.lastIndexOf('\n', match.index);
    const linePrefix = content.slice(lineStart === -1 ? 0 : lineStart + 1, match.index);
    if (linePrefix.includes('%')) {
      resolved += content.slice(lastIndex, includeRegex.lastIndex);
      lastIndex = includeRegex.lastIndex;
      continue;
    }

    resolved += content.slice(lastIndex, match.index);
    lastIndex = includeRegex.lastIndex;

    const rawPath = match[1].trim();
    if (/packages|style\/packages|ucsal\.sty|\.sty$/i.test(rawPath)) {
      continue;
    }

    const entryKey = findZipEntry(zip, rawPath, '.tex');
    if (entryKey && !visited.has(entryKey.toLowerCase())) {
      visited.add(entryKey.toLowerCase());
      try {
        const subContent = await zip.files[entryKey].async('string');
        const expandedSub = await resolveLatexIncludes(zip, subContent, visited);
        resolved +=
          `\n% --- BEGIN INCLUDE: ${rawPath} ---\n` +
          expandedSub +
          `\n% --- END INCLUDE: ${rawPath} ---\n`;
      } catch (err) {
        console.warn(`Erro ao resolver include latex ${rawPath}:`, err);
      }
    }
  }

  resolved += content.slice(lastIndex);
  return resolved;
}

async function resolveTypstIncludes(
  zip: JSZip,
  content: string,
  visited: Set<string> = new Set(),
): Promise<string> {
  const includeRegex = /#include\s+["']([^"']+)["']/g;
  let resolved = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = includeRegex.exec(content)) !== null) {
    resolved += content.slice(lastIndex, match.index);
    lastIndex = includeRegex.lastIndex;

    const rawPath = match[1].trim();
    const entryKey = findZipEntry(zip, rawPath, '.typ');
    if (entryKey && !visited.has(entryKey.toLowerCase())) {
      visited.add(entryKey.toLowerCase());
      try {
        const subContent = await zip.files[entryKey].async('string');
        const expandedSub = await resolveTypstIncludes(zip, subContent, visited);
        resolved +=
          `\n// --- BEGIN INCLUDE: ${rawPath} ---\n` +
          expandedSub +
          `\n// --- END INCLUDE: ${rawPath} ---\n`;
      } catch (err) {
        console.warn(`Erro ao resolver include typst ${rawPath}:`, err);
      }
    }
  }

  resolved += content.slice(lastIndex);
  return resolved;
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

  let typContent = await zip.files[mainTypFile].async('string');
  const visited = new Set<string>([mainTypFile.toLowerCase()]);
  typContent = await resolveTypstIncludes(zip, typContent, visited);

  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Typst';

  return parseTypstToProject(typContent, cleanProjectName, imageMap, references);
}

async function findRootLatexFile(zip: JSZip, texFiles: string[]): Promise<string> {
  const preferredNames = [
    'main.tex',
    'documento.tex',
    'document.tex',
    'tcc.tex',
    'artigo.tex',
    'monografia.tex',
    'tese.tex',
    'dissertacao.tex',
    'trabalho.tex',
    'paper.tex',
  ];

  // 1. Procurar arquivos .tex que contenham \begin{document} não comentado
  const documentCandidates: string[] = [];
  for (const t of texFiles) {
    try {
      const content = await zip.files[t].async('string');
      const lines = content.split(/\r?\n/);
      const hasBeginDoc = lines.some((line) => {
        const trimmed = line.trim();
        return (
          trimmed.startsWith('\\begin{document}') ||
          (/^[^%]*\\begin\{document\}/.test(trimmed))
        );
      });
      if (hasBeginDoc) {
        documentCandidates.push(t);
      }
    } catch {
      // ignore
    }
  }

  if (documentCandidates.length === 1) {
    return documentCandidates[0];
  }

  if (documentCandidates.length > 1) {
    const preferredMatch = documentCandidates.find((f) => {
      const base = f.split('/').pop()?.toLowerCase();
      return base && preferredNames.includes(base);
    });
    if (preferredMatch) return preferredMatch;

    return [...documentCandidates].sort((a, b) => a.split('/').length - b.split('/').length)[0];
  }

  // 2. Fallback por nomes preferenciais
  const preferredMatch = texFiles.find((n) => {
    const base = n.split('/').pop()?.toLowerCase();
    return base && preferredNames.includes(base);
  });
  if (preferredMatch) return preferredMatch;

  // 3. Fallback para o maior arquivo .tex
  let maxSize = -1;
  let largestFile = texFiles[0];
  for (const t of texFiles) {
    const entry = zip.files[t] as ZipObjectWithInternalData;
    const size = entry._data?.uncompressedSize ?? 0;
    if (size > maxSize) {
      maxSize = size;
      largestFile = t;
    }
  }
  return largestFile;
}

async function importFromOverleafZip(
  zip: JSZip,
  fileNames: string[],
  texFiles: string[],
  zipFileName: string,
): Promise<DocumentProject> {
  const mainTexFile = await findRootLatexFile(zip, texFiles);

  let texContent = await zip.files[mainTexFile].async('string');
  const visited = new Set<string>([mainTexFile.toLowerCase()]);
  texContent = await resolveLatexIncludes(zip, texContent, visited);

  const siglasFile = fileNames.find(
    (n) => /siglas|acronyms|abreviaturas/i.test(n) && n.endsWith('.tex'),
  );
  if (siglasFile && !visited.has(siglasFile.toLowerCase())) {
    try {
      const siglasContent = await zip.files[siglasFile].async('string');
      texContent +=
        `\n% --- BEGIN INCLUDE: ${siglasFile} ---\n` +
        siglasContent +
        `\n% --- END INCLUDE: ${siglasFile} ---\n`;
    } catch {
      // ignore
    }
  }

  const styleContents: string[] = [];
  const styleFiles = fileNames.filter((n) => /\.(sty|cls)$/i.test(n));
  for (const sf of styleFiles) {
    try {
      const content = await zip.files[sf].async('string');
      styleContents.push(content);
    } catch {
      // ignore
    }
  }
  const styleDefinitions = styleContents.join('\n');

  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Overleaf';
  return parseLatexToProject(texContent, cleanProjectName, imageMap, references, styleDefinitions);
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
