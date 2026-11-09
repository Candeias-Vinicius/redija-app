// =====================================================================
// RedijaApp — Modelo Oficial para Artigos no Padrão IEEE
// Institute of Electrical and Electronics Engineers (IEEE Conference Format)
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let entrelinha-1-5 = 1.05em
#let entrelinha-simples = 0.48em
#let entrelinha-dupla = 1.55em
#let entrelinha-ieee = entrelinha-simples

// Citação direta adaptada ao padrão IEEE
#let citacao(referencia: none, parenteses: false, corpo) = block(
  inset: (left: 1.5cm),
  above: 0.8em,
  below: 0.8em,
  width: 100%,
  {
    set text(size: 0.9em)
    set par(leading: entrelinha-ieee, first-line-indent: 0pt, justify: true)
    corpo
    if referencia != none {
      if parenteses [ (#referencia)] else [ #referencia]
    }
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
        align(center + horizon, text(fill: luma(120), size: 0.9em)[Figure]),
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

// Bloco de Código-Fonte / Algoritmo
#let codigo(legenda: none, fonte: none, corpo) = block(
  width: 100%,
  above: 1em,
  below: 1em,
  {
    if legenda != none {
      align(center, text(size: 0.85em, weight: "bold")[Algorithm — #legenda])
      v(0.25em)
    }
    block(
      width: 100%,
      inset: 8pt,
      radius: 3pt,
      fill: luma(248),
      stroke: 0.5pt + luma(200),
      {
        set par(justify: false, first-line-indent: 0pt, leading: 0.5em)
        set text(size: 0.8em)
        corpo
      },
    )
    if fonte != none {
      v(0.2em)
      align(center, text(size: 0.85em)[Source: #fonte.])
    }
  },
)

// Lista de referências estilo IEEE com enumeração configurável
#let referencias(
  titulo: auto,
  alinhamento: "left",
  espacamento: 0.4em,
  numeracao: "bracket",
  ..itens
) = {
  v(1.2em, weak: true)
  let heading-title = if titulo != auto { titulo } else [References]
  align(center)[
    #text(size: 1em)[#smallcaps[#heading-title]]
  ]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: entrelinha-ieee,
  )
  set text(size: 0.9em)
  let idx = 1
  for item in itens.pos() {
    if numeracao == "bracket" {
      grid(
        columns: (1.5em, 1fr),
        gutter: 0.3em,
        align: (left, left),
        [[#idx]],
        [#item],
      )
      v(espacamento)
    } else if numeracao == "dot" {
      grid(
        columns: (1.5em, 1fr),
        gutter: 0.3em,
        align: (left, left),
        [#idx.],
        [#item],
      )
      v(espacamento)
    } else {
      block(above: 0pt, below: espacamento, item)
    }
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
  logo: none,
  resumo: none,
  palavras-chave: (),
  abstract: none,
  keywords: (),
  fonte: "serif",
  tamanho-fonte: 10pt,
  entrelinha: entrelinha-ieee,
  recuo: 0.35cm,
  espacamento-paragrafo: auto,
  justificar-corpo: true,
  margem-superior: 1.9cm,
  margem-inferior: 2.54cm,
  margem-esquerda: 1.57cm,
  margem-direita: 1.57cm,
  tamanho-papel: "a4",
  orientacao: "portrait",
  idioma: "en",
  regiao: auto,
  posicao-pagina: "bottom_center",
  ocultar-pagina-1: false,
  cabecalho: none,
  numeracao-secoes: "none",
  quebra-h1: false,
  colunas: 2,
  body,
) = {
  set document(title: titulo, author: autor)

  let familia-fonte = if type(fonte) == array {
    fonte
  } else if fonte == "sans" {
    fontes-sem-serifa
  } else if fonte == "serif" {
    fontes-serifadas
  } else {
    (fonte, ..fontes-serifadas)
  }

  let papel-typst = if tamanho-papel == "letter" { "us-letter" } else { tamanho-papel }
  let resolved-regiao = if regiao != auto {
    regiao
  } else if idioma == "pt" {
    "BR"
  } else if idioma == "es" {
    "ES"
  } else {
    "US"
  }
  let num-secoes = if numeracao-secoes == "none" or numeracao-secoes == none { none } else { numeracao-secoes }

  // Normas IEEE: Margens top 1.9cm, bottom 2.54cm, laterais 1.57cm (personalizáveis)
  set page(
    paper: papel-typst,
    flipped: (orientacao == "landscape"),
    margin: (
      top: margem-superior,
      bottom: margem-inferior,
      left: margem-esquerda,
      right: margem-direita,
    ),
    header: context {
      let page-num = counter(page).get().first()
      let header-text = if cabecalho != none and cabecalho != "" { cabecalho } else { none }
      let show-top-num = posicao-pagina == "top_right" and not (ocultar-pagina-1 and page-num == 1)
      if header-text != none or show-top-num {
        grid(
          columns: (1fr, auto),
          align(left, text(size: 0.8em, fill: luma(110))[#if header-text != none { header-text }]),
          align(right, text(size: 0.9em)[#if show-top-num { counter(page).display() }]),
        )
      }
    },
    footer: context {
      let page-num = counter(page).get().first()
      let is-bottom = posicao-pagina == "bottom_center" or posicao-pagina == "bottom_right"
      if is-bottom and not (ocultar-pagina-1 and page-num == 1) {
        align(
          if posicao-pagina == "bottom_right" { right } else { center },
          text(size: 0.9em)[#counter(page).display()],
        )
      }
    },
  )

  set text(
    font: familia-fonte,
    size: tamanho-fonte,
    lang: idioma,
    region: resolved-regiao,
  )

  set heading(numbering: num-secoes)

  let par-spacing = if espacamento-paragrafo != auto { espacamento-paragrafo } else { 0.55em }
  set par(
    leading: entrelinha,
    spacing: par-spacing,
    first-line-indent: (amount: recuo, all: true),
    justify: justificar-corpo,
  )

  show figure.caption: set text(size: 0.9em)

  // Formatação de títulos no estilo IEEE
  show heading: it => {
    set text(font: familia-fonte)
    set par(first-line-indent: 0pt)
    let prefix = if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ] else []
    if it.level == 1 {
      if quebra-h1 { pagebreak(weak: true) }
      v(1.2em, weak: true)
      align(center)[
        #text(size: 1em, weight: "regular")[
          #prefix#smallcaps(it.body)
        ]
      ]
      v(0.6em, weak: true)
    } else if it.level == 2 {
      v(0.9em, weak: true)
      text(size: 1em, style: "italic", weight: "regular")[
        #prefix#it.body
      ]
      v(0.4em, weak: true)
    } else {
      v(0.7em, weak: true)
      text(size: 1em, style: "italic")[
        #prefix#it.body
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
      #if logo != none {
        logo
        v(0.3cm)
      }
      #v(0.4cm)
      #text(size: 2.4em, weight: "regular")[#titulo]
      #if subtitulo != none [
        \ #v(0.2cm) #text(size: 1.4em, style: "italic")[#subtitulo]
      ]
      #v(0.5cm)

      #grid(
        columns: (1fr,),
        align: center,
        [
          #text(size: 1.1em)[#autor] \
          #text(size: 0.9em, style: "italic")[
            #if curso != "" [#curso, ]
            #if instituicao != "" [#instituicao]
            #if local != "" [ \ #local]
          ]
        ]
      )
      #v(0.6cm)
    ]
  )

  let render-abstract-and-body = {
    let mainAbstract = if abstract != none { abstract } else { resumo }
    let mainKeywords = if keywords.len() > 0 { keywords } else { palavras-chave }
    let absLabel = if abstract == none and idioma == "pt" [Resumo] else if abstract == none and idioma == "es" [Resumen] else [Abstract]
    let kwLabel = if keywords.len() == 0 and idioma == "pt" [Palavras-chave] else if keywords.len() == 0 and idioma == "es" [Palabras clave] else [Index Terms]

    if mainAbstract != none [
      #block(
        width: 100%,
        below: 1em,
        [
          #set text(size: 0.9em)
          #set par(leading: entrelinha, first-line-indent: 0pt, justify: true)
          #strong[#emph[#absLabel]—#mainAbstract]
          #if mainKeywords.len() > 0 [
            \ \ #strong[#emph[#kwLabel]—#mainKeywords.join(", ").]
          ]
        ]
      )
    ]

    body
  }

  // --- CORPO COM ABSTRACT E INDEX TERMS ---
  if colunas > 1 {
    columns(colunas, gutter: 0.42cm)[#render-abstract-and-body]
  } else {
    render-abstract-and-body
  }
}
