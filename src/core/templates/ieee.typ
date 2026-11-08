// =====================================================================
// RedijaApp — Modelo Oficial para Artigos no Padrão IEEE
// Institute of Electrical and Electronics Engineers (IEEE Conference Format)
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let entrelinha-ieee = 0.48em

// Citação direta adaptada ao padrão IEEE
#let citacao(referencia: none, corpo) = block(
  inset: (left: 1.5cm),
  above: 0.8em,
  below: 0.8em,
  width: 100%,
  {
    set text(size: 9pt)
    set par(leading: entrelinha-ieee, first-line-indent: 0pt, justify: true)
    corpo
    if referencia != none [ #referencia]
  },
)

// Figura padrão IEEE (largura da coluna)
#let figura(legenda: [], fonte: [do autor], imagem: none) = figure(
  kind: image,
  supplement: [Fig.],
  caption: legenda,
  {
    if imagem == none {
      rect(
        width: 100%,
        height: 3.5cm,
        stroke: 0.5pt + luma(180),
        align(center + horizon, text(fill: luma(120), size: 9pt)[Figure]),
      )
    } else {
      imagem
    }
  },
)

// Tabela padrão IEEE
#let tabela(legenda: [], fonte: [do autor], corpo) = figure(
  kind: table,
  supplement: [TABLE],
  caption: legenda,
  {
    corpo
  },
)

// Quadro
#let quadro(legenda: [], fonte: [do autor], corpo) = figure(
  kind: "quadro",
  supplement: [Frame],
  caption: legenda,
  {
    corpo
  },
)

// Lista de referências estilo IEEE com enumeração [1], [2]
#let referencias(..itens) = {
  v(1.2em, weak: true)
  align(center)[
    #text(size: 10pt)[#smallcaps[References]]
  ]
  set par(justify: true, first-line-indent: 0pt, leading: entrelinha-ieee)
  set text(size: 9pt)
  let idx = 1
  for item in itens.pos() {
    grid(
      columns: (1.5em, 1fr),
      gutter: 0.3em,
      align: (left, left),
      [[#idx]],
      [#item]
    )
    v(0.4em)
    idx = idx + 1
  }
}

// =====================================================================
// Função Principal do Modelo IEEE
// =====================================================================
#let ieee-article(
  titulo: "",
  subtitulo: none,
  autor: "",
  instituicao: "",
  curso: "",
  local: "",
  ano: "",
  resumo: none,
  palavras-chave: (),
  abstract: none,
  keywords: (),
  fonte: "serif",
  colunas: 2,
  body,
) = {
  set document(title: titulo, author: autor)

  let familia-fonte = if fonte == "sans" { fontes-sem-serifa } else { fontes-serifadas }

  // Normas IEEE: Margens top 1.9cm, bottom 2.54cm, laterais 1.57cm
  set page(
    paper: "a4",
    margin: (
      top: 1.9cm,
      bottom: 2.54cm,
      left: 1.57cm,
      right: 1.57cm,
    ),
    footer: context {
      let page-num = counter(page).get().first()
      align(center, text(size: 9pt)[#page-num])
    },
  )

  set text(
    font: familia-fonte,
    size: 10pt,
    lang: "en",
  )

  set par(
    leading: entrelinha-ieee,
    first-line-indent: (amount: 0.35cm, all: true),
    justify: true,
  )

  // Formatação de títulos no estilo IEEE
  show heading: it => {
    set text(font: familia-fonte)
    set par(first-line-indent: 0pt)
    if it.level == 1 {
      v(1.2em, weak: true)
      align(center)[
        #text(size: 10pt, weight: "regular")[
          #smallcaps(it.body)
        ]
      ]
      v(0.6em, weak: true)
    } else if it.level == 2 {
      v(0.9em, weak: true)
      text(size: 10pt, style: "italic", weight: "regular")[
        #it.body
      ]
      v(0.4em, weak: true)
    } else {
      v(0.7em, weak: true)
      text(size: 10pt, style: "italic")[
        #it.body
      ]
      v(0.3em, weak: true)
    }
  }

  // --- CABEÇALHO IEEE (LARGURA TOTAL ACIMA DAS COLUNAS) ---
  place(
    top + center,
    scope: "parent",
    float: true,
    clearance: 1.5em,
    [
      #v(0.4cm)
      #text(size: 24pt, weight: "regular")[#titulo]
      #if subtitulo != none [
        \ #v(0.2cm) #text(size: 14pt, style: "italic")[#subtitulo]
      ]
      #v(0.5cm)

      #grid(
        columns: (1fr,),
        align: center,
        [
          #text(size: 11pt)[#autor] \
          #text(size: 9pt, style: "italic")[
            #if curso != "" [#curso, ]
            #if instituicao != "" [#instituicao]
            #if local != "" [ \ #local]
          ]
        ]
      )
      #v(0.6cm)
    ]
  )

  // --- CORPO EM DUAS COLUNAS COM ABSTRACT E INDEX TERMS ---
  columns(colunas, gutter: 0.42cm)[
    // O texto do Abstract e Keywords deve ficar na primeira coluna
    #{
      let mainAbstract = if abstract != none { abstract } else { resumo }
      let mainKeywords = if keywords.len() > 0 { keywords } else { palavras-chave }

      if mainAbstract != none [
        #block(
          width: 100%,
          below: 1em,
          {
            set text(size: 9pt)
            set par(leading: entrelinha-ieee, first-line-indent: 0pt, justify: true)
            [*_Abstract_—#mainAbstract*]
            if mainKeywords.len() > 0 [
              \ \ *_Index Terms_—#mainKeywords.join(", ").*
            ]
          }
        )
      ]
    }

    #body
  ]
}
