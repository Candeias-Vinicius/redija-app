// =====================================================================
// RedijaApp — Modelo Oficial para Artigos da SBC
// Sociedade Brasileira de Computação (SBC Guidelines)
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let entrelinha-1-5 = 1.05em
#let entrelinha-simples = 0.52em
#let entrelinha-dupla = 1.55em
#let recuo-paragrafo = 1.25cm

// Citação direta longa
#let citacao(referencia: none, parenteses: true, corpo) = block(
  inset: (left: 3cm),
  above: 1.2em,
  below: 1.2em,
  width: 100%,
  {
    set text(size: 0.85em)
    set par(leading: entrelinha-simples, first-line-indent: 0pt, justify: true)
    corpo
    if referencia != none {
      if parenteses [ (#referencia)] else [ #referencia]
    }
  },
)

// Figura com legenda e fonte no padrão SBC
#let figura(legenda: [], fonte: [do autor], imagem: none) = figure(
  kind: image,
  supplement: [Figura],
  caption: legenda,
  {
    if imagem == none {
      rect(
        width: 80%,
        height: 4cm,
        stroke: 0.5pt + luma(150),
        align(center + horizon, text(fill: luma(120), size: 0.85em)[Imagem]),
      )
    } else {
      imagem
    }
    v(0.3em)
    text(size: 0.85em)[Fonte: #fonte.]
  },
)

// Tabela no padrão SBC
#let tabela(legenda: [], fonte: [do autor], corpo) = figure(
  kind: table,
  supplement: [Tabela],
  caption: legenda,
  {
    corpo
    v(0.3em)
    text(size: 0.85em)[Fonte: #fonte.]
  },
)

// Quadro
#let quadro(legenda: [], fonte: [do autor], corpo) = figure(
  kind: "quadro",
  supplement: [Quadro],
  caption: legenda,
  {
    corpo
    v(0.3em)
    text(size: 0.85em)[Fonte: #fonte.]
  },
)

// Bloco de Código-Fonte / Algoritmo
#let codigo(legenda: none, fonte: none, corpo) = block(
  width: 100%,
  above: 1.2em,
  below: 1.2em,
  {
    if legenda != none {
      align(center, text(size: 0.85em, weight: "bold")[Algoritmo — #legenda])
      v(0.3em)
    }
    block(
      width: 100%,
      inset: 9pt,
      radius: 3pt,
      fill: luma(248),
      stroke: 0.5pt + luma(200),
      {
        set par(justify: false, first-line-indent: 0pt, leading: 0.55em)
        set text(size: 0.8em)
        corpo
      },
    )
    if fonte != none {
      v(0.2em)
      align(center, text(size: 0.85em)[Fonte: #fonte.])
    }
  },
)

// Lista de referências no padrão SBC (configurável)
#let referencias(
  titulo: auto,
  alinhamento: "justify",
  espacamento: 0.8em,
  numeracao: none,
  ..itens
) = {
  v(1.4em, weak: true)
  let heading-title = if titulo != auto { titulo } else [Referências]
  heading(numbering: none)[#heading-title]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: entrelinha-simples,
  )
  set text(size: 0.92em)
  let idx = 1
  for item in itens.pos() {
    if numeracao == "bracket" {
      block(
        above: 0pt,
        below: espacamento,
        grid(
          columns: (1.8em, 1fr),
          gutter: 0.4em,
          align: (left, left),
          [[#idx]],
          [#item],
        ),
      )
    } else if numeracao == "dot" {
      block(
        above: 0pt,
        below: espacamento,
        grid(
          columns: (1.8em, 1fr),
          gutter: 0.4em,
          align: (left, left),
          [#idx.],
          [#item],
        ),
      )
    } else {
      block(above: 0pt, below: espacamento, item)
    }
    idx = idx + 1
  }
}

// =====================================================================
// Função Principal do Modelo SBC
// =====================================================================
#let sbc-article(
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
  tamanho-fonte: 12pt,
  entrelinha: entrelinha-simples,
  recuo: recuo-paragrafo,
  espacamento-paragrafo: auto,
  justificar-corpo: true,
  margem-superior: 3.5cm,
  margem-inferior: 2.5cm,
  margem-esquerda: 3.0cm,
  margem-direita: 3.0cm,
  tamanho-papel: "a4",
  orientacao: "portrait",
  idioma: "pt",
  regiao: auto,
  posicao-pagina: "bottom_center",
  ocultar-pagina-1: false,
  cabecalho: auto,
  numeracao-secoes: "none",
  quebra-h1: false,
  colunas: 1,
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
  } else if idioma == "en" {
    "US"
  } else if idioma == "es" {
    "ES"
  } else {
    "BR"
  }
  let num-secoes = if numeracao-secoes == "none" or numeracao-secoes == none { none } else { numeracao-secoes }

  // Normas SBC: A4, margem superior 3.5cm, inferior 2.5cm, laterais 3cm (personalizáveis)
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
      let header-text = if cabecalho == auto {
        if page-num > 1 { titulo } else { none }
      } else if cabecalho != none and cabecalho != "" {
        cabecalho
      } else {
        none
      }
      let show-top-num = posicao-pagina == "top_right" and not (ocultar-pagina-1 and page-num == 1)
      if header-text != none or show-top-num {
        grid(
          columns: (1fr, auto),
          align(left, text(size: 0.75em, fill: luma(120))[#if header-text != none { header-text }]),
          align(right, text(size: 0.85em)[#if show-top-num { counter(page).display() }]),
        )
      }
    },
    footer: context {
      let page-num = counter(page).get().first()
      let is-bottom = posicao-pagina == "bottom_center" or posicao-pagina == "bottom_right"
      if is-bottom and not (ocultar-pagina-1 and page-num == 1) {
        align(
          if posicao-pagina == "bottom_right" { right } else { center },
          text(size: 0.85em)[#counter(page).display()],
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

  let par-spacing = if espacamento-paragrafo != auto { espacamento-paragrafo } else { 0.65em }
  set par(
    leading: entrelinha,
    spacing: par-spacing,
    first-line-indent: (amount: recuo, all: true),
    justify: justificar-corpo,
  )

  show figure.caption: set text(size: 0.85em)

  // Formatação de títulos no padrão SBC
  show heading: it => {
    set text(font: familia-fonte)
    set par(first-line-indent: 0pt)
    if it.level == 1 {
      if quebra-h1 { pagebreak(weak: true) }
      v(1.4em, weak: true)
      text(size: 1.08em, weight: "bold")[
        #if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ]#it.body
      ]
      v(0.7em, weak: true)
    } else if it.level == 2 {
      v(1.1em, weak: true)
      text(size: 1em, weight: "bold")[
        #if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ]#it.body
      ]
      v(0.6em, weak: true)
    } else {
      v(0.9em, weak: true)
      text(size: 1em, style: "italic", weight: "bold")[
        #if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ]#it.body
      ]
      v(0.5em, weak: true)
    }
  }

  // --- CABEÇALHO DO ARTIGO SBC ---
  align(center)[
    #if logo != none {
      logo
      v(0.4cm)
    }
    #v(0.5cm)
    #text(size: 1.33em, weight: "bold")[#titulo]
    #if subtitulo != none [
      \ #v(0.2cm) #text(size: 1.17em, weight: "medium")[#subtitulo]
    ]
    #v(0.6cm)

    #text(size: 1em)[#autor]
    #v(0.2cm)

    #text(size: 0.85em)[
      #if curso != "" [#curso \ ]
      #if instituicao != "" [#instituicao \ ]
      #if local != "" [#local]
    ]
    #v(0.8cm)
  ]

  let lbl-resumo = if idioma == "es" [Resumen.] else if idioma == "en" [Summary.] else [Resumo.]
  let lbl-palavras = if idioma == "es" [Palabras clave:] else if idioma == "en" [Keywords:] else [Palavras-chave:]

  // --- RESUMO EM PORTUGUÊS ---
  if resumo != none [
    #block(
      inset: (x: 0.8cm),
      {
        set text(size: 0.85em)
        set par(leading: entrelinha-simples, first-line-indent: 0pt, justify: true)
        [*#lbl-resumo* #resumo]
        if palavras-chave.len() > 0 [
          \ \ *#lbl-palavras* #palavras-chave.join(", ").
        ]
      }
    )
    #v(0.5cm)
  ]

  // --- ABSTRACT EM INGLÊS ---
  if abstract != none [
    #block(
      inset: (x: 0.8cm),
      {
        set text(size: 0.85em)
        set par(leading: entrelinha-simples, first-line-indent: 0pt, justify: true)
        [*Abstract.* #abstract]
        if keywords.len() > 0 [
          \ \ *Keywords:* #keywords.join(", ").
        ]
      }
    )
    #v(0.8cm)
  ]

  // --- CORPO DO TEXTO ---
  if colunas > 1 {
    columns(colunas, gutter: 0.7cm)[#body]
  } else {
    body
  }
}
