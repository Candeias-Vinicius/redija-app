// =====================================================================
// RedijaApp — Exportador de Pacote de Projeto Typst Completo (.zip)
// Permite aos autores total liberdade (zero vendor lock-in) para levar seu
// trabalho completo com imagens, modelo ABNT, BibTeX e fontes para qualquer
// ambiente externo (VS Code, CLI oficial do Typst ou Typst Web App).
// =====================================================================

import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import {
  generateTypstFiles,
  extractBinaryAssets,
  TEMPLATE_FILE,
  MAIN_FILE,
} from './typstGenerator';
import { exportToBibtex } from './abntLinter';
import { serializeBackup } from '../storage/db';

export function getCleanProjectSlug(name: string): string {
  const clean = name
    .replace(/\.redija$/i, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'projeto_redija';
}

function generateReadme(project: DocumentProject): string {
  const title = project.metadata.title.trim() || project.name;
  const author = project.metadata.author.trim() || 'Autor';

  return `# ${title}
**Autor:** ${author}  
**Gerado por:** RedijaApp (https://redija.app) — Editor Acadêmico ABNT & Typst

---

## Liberdade Total e Zero Vendor Lock-in

Este pacote contém o código-fonte completo do seu trabalho acadêmico, incluindo todas as figuras e imagens enviadas, o modelo de diagramação ABNT e suas referências bibliográficas. Você pode compilar e editar este projeto livremente em qualquer computador ou ferramenta sem depender do RedijaApp.

## Estrutura de Arquivos

\`\`\`
├── main.typ          # Arquivo principal do documento (capítulos, seções e citações)
├── abnt.typ          # Módulo com todas as diretrizes das normas ABNT
├── assets/           # Figuras, tabelas ilustradas e brasão da instituição
├── referencias.bib   # Referências bibliográficas no padrão BibTeX
├── ${getCleanProjectSlug(project.name)}.redija # Arquivo de backup para reabrir no RedijaApp
└── README.md         # Este guia de instruções
\`\`\`

---

## Como Compilar Seu Documento

### Opção 1: Linha de Comando (CLI Oficial do Typst)
1. Instale o compilador oficial do Typst (consulte https://github.com/typst/typst):
   \`\`\`bash
   # Windows (via winget ou scoop)
   winget install --id Typst.Typst
   
   # macOS (via brew)
   brew install typst
   
   # Linux (via cargo ou pacote da sua distribuição)
   cargo install --locked typst-cli
   \`\`\`
2. Abra o terminal nesta pasta descompactada e execute:
   \`\`\`bash
   typst compile main.typ ${getCleanProjectSlug(project.name)}.pdf
   \`\`\`
3. Para ativar a compilação contínua ao salvar:
   \`\`\`bash
   typst watch main.typ ${getCleanProjectSlug(project.name)}.pdf
   \`\`\`

### Opção 2: Visual Studio Code (Recomendado para Edição Local)
1. Instale a extensão oficial **Tinymist Typst** no VS Code.
2. Abra esta pasta no VS Code.
3. Abra o arquivo \`main.typ\` e clique no ícone de visualização lado a lado. O PDF será atualizado em tempo real a cada caractere digitado.

### Opção 3: Typst Web App (Nuvem)
1. Acesse https://typst.app e faça login na sua conta.
2. Crie um novo projeto vazio e faça o upload de todos os arquivos descompactados deste pacote (mantendo a pasta \`assets/\`).
3. O projeto compilará instantaneamente na nuvem com colaboração em tempo real.
`;
}

/**
 * Empacota o projeto em um arquivo .zip contendo `main.typ`, `abnt.typ`,
 * imagens reais na pasta `assets/`, `referencias.bib`, cópia de backup `.redija` e `README.md`.
 */
export async function exportTypstProjectZip(project: DocumentProject): Promise<Blob> {
  const zip = new JSZip();

  // 1. Arquivos fonte Typst
  const files = generateTypstFiles(project);
  // Converte caminhos virtuais absolutos "/assets/..." em relativos "assets/..." para portabilidade
  const portableMainTyp = files[MAIN_FILE].replace(/(image\(\s*["'])\/assets\//g, '$1assets/');

  zip.file(MAIN_FILE, portableMainTyp);
  zip.file(TEMPLATE_FILE, files[TEMPLATE_FILE]);

  // 2. Extrai imagens reais do projeto e salva na pasta assets/
  const binaryAssets = extractBinaryAssets(project);
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const [vPath, bytes] of Object.entries(binaryAssets)) {
      const filename = vPath.replace(/^\/?assets\//, '');
      assetsFolder.file(filename, bytes);
    }
  }

  // 3. Arquivo de referências BibTeX (.bib)
  if (project.references && project.references.length > 0) {
    const bibtex = exportToBibtex(project.references);
    zip.file('referencias.bib', bibtex);
  }

  // 4. Cópia de segurança .redija para reabrir no RedijaApp a qualquer momento
  try {
    const backupJson = serializeBackup(project);
    zip.file(`${getCleanProjectSlug(project.name)}.redija`, backupJson);
  } catch (err) {
    console.warn('Erro ao incluir backup no pacote:', err);
  }

  // 5. Guia de instruções README.md
  zip.file('README.md', generateReadme(project));

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
