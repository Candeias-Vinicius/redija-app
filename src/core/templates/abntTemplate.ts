import { DocumentMetadata } from '@/types/document';
import { ABNT_CONFIG } from '@/types/abnt';

export function generateAbntPreamble(meta: DocumentMetadata): string {
  return `
// ==========================================
// Configuração ABNT NBR 14724 gerada pelo RedijaApp
// ==========================================

#set page(
  paper: "a4",
  margin: (
    top: ${ABNT_CONFIG.margins.top},
    left: ${ABNT_CONFIG.margins.left},
    bottom: ${ABNT_CONFIG.margins.bottom},
    right: ${ABNT_CONFIG.margins.right},
  ),
  header: locate(loc => {
    // Numeração de página no canto superior direito apenas a partir da introdução
    let page_number = counter(page).at(loc).first()
    if page_number > 2 {
      align(right, text(size: 10pt)[#page_number])
    }
  })
)

#set text(
  font: "Times New Roman",
  size: 12pt,
  lang: "pt",
  region: "BR"
)

#set par(
  justify: true,
  leading: 0.65em, // aprox espaçamento 1.5
  first-line-indent: ${ABNT_CONFIG.paragraphIndent}
)

// Estilos de Títulos ABNT (Numeração progressiva)
#show heading.where(level: 1): it => block(
  spacing: 1.5em,
  text(weight: "bold", size: 12pt)[#upper(it.body)]
)

#show heading.where(level: 2): it => block(
  spacing: 1.2em,
  text(weight: "bold", size: 12pt)[#it.body]
)

#show heading.where(level: 3): it => block(
  spacing: 1em,
  text(style: "italic", size: 12pt)[#it.body]
)

// Macro para Citação Longa (NBR 10520: recuo 4cm, fonte 10pt, espaçamento simples)
#let citacao(autor: none, ano: none, pagina: none, corpo) = {
  block(
    inset: (left: ${ABNT_CONFIG.quoteLongIndent}),
    spacing: 1.5em,
    [
      #set text(size: 10pt)
      #set par(leading: 0.35em, first-line-indent: 0pt, justify: true)
      #corpo
      #if autor != none [ \\ (#upper(autor), #ano, p. #pagina) ]
    ]
  )
}

// ==========================================
// CAPA (NBR 14724)
// ==========================================
#align(center)[
  #text(weight: "bold")[#upper("${meta.institution}")] \\
  #text(size: 11pt)[#upper("${meta.course}")]
  
  #v(5cm)
  #text(weight: "bold")[#upper("${meta.author}")]
  
  #v(5cm)
  #text(weight: "bold", size: 14pt)[#upper("${meta.title}")]
  ${meta.subtitle ? `\\\\ #text(size: 12pt)[${meta.subtitle}]` : ''}
  
  #v(1fr)
  #text(weight: "bold")[${meta.location}] \\
  #text(weight: "bold")[${meta.year}]
]

#pagebreak()

// ==========================================
// RESUMO (NBR 6028)
// ==========================================
#align(center)[#text(weight: "bold")[RESUMO]]
#v(1em)

#set par(first-line-indent: 0pt, justify: true)
${meta.abstract || 'Resumo do trabalho acadêmico...'}

#v(1.5em)
#strong[Palavras-chave:] ${meta.keywords.join('. ') || 'Palavra-chave 1. Palavra-chave 2.'}.

#pagebreak()
`;
}
