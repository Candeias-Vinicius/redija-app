import { Block, AcademicReference, DocumentProject } from '@/types/document';
import { generateAbntPreamble } from '@/core/templates/abntTemplate';

/**
 * Transpilador RedijaApp:
 * Converte blocos visuais e metadados estruturados para código Typst 100% formatado.
 */
export function generateTypstCode(project: DocumentProject): string {
  const parts: string[] = [];

  // 1. Cabeçalho, Margens e Capa ABNT
  parts.push(generateAbntPreamble(project.metadata));

  // 2. Transpilação dos Blocos de Conteúdo
  parts.push('// ==========================================');
  parts.push('// CORPO DO TRABALHO');
  parts.push('// ==========================================\n');

  for (const block of project.blocks) {
    parts.push(transpileBlock(block));
  }

  // 3. Referências Bibliográficas (NBR 6023)
  if (project.references.length > 0) {
    parts.push('\n#pagebreak()');
    parts.push('#align(center)[#text(weight: "bold")[REFERÊNCIAS]]');
    parts.push('#v(1.5em)');
    parts.push('#set par(first-line-indent: 0pt, justify: false, leading: 0.35em)'); // ABNT: alinhadas à esquerda e espaçamento simples

    for (const ref of project.references) {
      parts.push(transpileReference(ref));
    }
  }

  return parts.join('\n');
}

function transpileBlock(block: Block): string {
  switch (block.type) {
    case 'h1':
      return `= ${block.content}\n`;
    case 'h2':
      return `== ${block.content}\n`;
    case 'h3':
      return `=== ${block.content}\n`;
    case 'paragraph':
      return `${block.content}\n`;
    case 'quote_long': {
      const author = block.meta?.author || 'SOBRENOME';
      const year = block.meta?.year || 'ANO';
      const page = block.meta?.page || '0';
      return `#citacao(autor: "${author}", ano: "${year}", pagina: "${page}")[\n  ${block.content}\n]\n`;
    }
    case 'bullet':
      return `- ${block.content}\n`;
    case 'numbered':
      return `+ ${block.content}\n`;
    case 'image':
      return `
#align(center)[
  #text(size: 10pt)[Figura - ${block.meta?.caption || 'Descrição da figura'}]
  #v(0.5em)
  #rect(width: 80%, height: 120pt, stroke: 0.5pt + luma(150))[#center[Imagem / Gráfico]]
  #v(0.5em)
  #text(size: 10pt)[Fonte: ${block.meta?.source || 'do autor'}.]
]
`;
    default:
      return `${block.content}\n`;
  }
}

function transpileReference(ref: AcademicReference): string {
  // Formato ABNT NBR 6023:
  // SOBRENOME, Nome. Título: subtítulo. Edição. Cidade: Editora, Ano.
  const authorUpper = ref.authors.toUpperCase();
  const titleFormatted = `#strong[${ref.title}]`;
  const subtitle = ref.subtitle ? `: ${ref.subtitle}` : '';
  const edition = ref.edition ? ` ${ref.edition}. ed.` : '';
  const publisher = ref.publisher || 'Editora';
  const city = ref.city || 'Local';
  const year = ref.year || 'Ano';

  let result = `${authorUpper}. ${titleFormatted}${subtitle}.${edition} ${city}: ${publisher}, ${year}.`;

  if (ref.url) {
    result += ` Disponível em: <${ref.url}>.`;
    if (ref.accessDate) {
      result += ` Acesso em: ${ref.accessDate}.`;
    }
  }

  return `${result}\n#v(1em)`;
}
