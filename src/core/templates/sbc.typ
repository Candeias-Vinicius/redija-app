// =====================================================================
// RedijaApp — Modelo Oficial para Artigos da SBC
// Sociedade Brasileira de Computação (SBC Guidelines)
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let entrelinha-simples = 0.52em
#let recuo-paragrafo = 1.25cm

// Citação direta longa
#let citacao(referencia: none, parenteses: true, corpo) = block(
  inset: (left: 3cm),
  above: 1.2em,
  below: 1.2em,
  width: 100%,
  {
    set text(size: 10pt)
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
        align(center + horizon, text(fill: luma(120), size: 10pt)[Imagem]),
      )
    } else {
      imagem
    }
    v(0.3em)
    text(size: 10pt)[Fonte: #fonte.]
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
    text(size: 10pt)[Fonte: #fonte.]
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
    text(size: 10pt)[Fonte: #fonte.]
  },
)

// Lista de referências no padrão SBC (configurável)
#let referencias(
  alinhamento: "justify",
  espacamento: 0.8em,
  numeracao: none,
  ..itens
) = {
  v(1.4em, weak: true)
  heading(numbering: none)[Referências]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: entrelinha-simples,
  )
  set text(size: 11pt)
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
  resumo: none,
  palavras-chave: (),
  abstract: none,
  keywords: (),
  fonte: "serif",
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

  // Normas SBC: A4, margem superior 3.5cm, inferior 2.5cm, laterais 3cm
  set page(
    paper: "a4",
    margin: (
      top: 3.5cm,
      bottom: 2.5cm,
      left: 3.0cm,
      right: 3.0cm,
    ),
    header: align(right)[
      #text(size: 9pt, fill: luma(120))[
        #context {
          if counter(page).get().first() > 1 [
            #titulo
          ]
        }
      ]
    ],
    footer: context {
      let page-num = counter(page).get().first()
      align(center, text(size: 10pt)[#page-num])
    },
  )

  set text(
    font: familia-fonte,
    size: 12pt,
    lang: "pt",
    region: "BR",
  )

  set par(
    leading: entrelinha-simples,
    first-line-indent: (amount: recuo-paragrafo, all: true),
    justify: true,
  )

  // Formatação de títulos no padrão SBC
  show heading: it => {
    set text(font: familia-fonte)
    set par(first-line-indent: 0pt)
    if it.level == 1 {
      v(1.4em, weak: true)
      text(size: 13pt, weight: "bold")[
        #it.body
      ]
      v(0.7em, weak: true)
    } else if it.level == 2 {
      v(1.1em, weak: true)
      text(size: 12pt, weight: "bold")[
        #it.body
      ]
      v(0.6em, weak: true)
    } else {
      v(0.9em, weak: true)
      text(size: 12pt, style: "italic", weight: "bold")[
        #it.body
      ]
      v(0.5em, weak: true)
    }
  }

  // --- CABEÇALHO DO ARTIGO SBC ---
  align(center)[
    #v(0.5cm)
    #text(size: 16pt, weight: "bold")[#titulo]
    #if subtitulo != none [
      \ #v(0.2cm) #text(size: 14pt, weight: "medium")[#subtitulo]
    ]
    #v(0.6cm)

    #text(size: 12pt)[#autor]
    #v(0.2cm)

    #text(size: 10pt)[
      #if curso != "" [#curso \ ]
      #if instituicao != "" [#instituicao \ ]
      #if local != "" [#local]
    ]
    #v(0.8cm)
  ]

  // --- RESUMO EM PORTUGUÊS ---
  if resumo != none [
    #block(
      inset: (x: 0.8cm),
      {
        set text(size: 10pt)
        set par(leading: entrelinha-simples, first-line-indent: 0pt, justify: true)
        [*Resumo.* #resumo]
        if palavras-chave.len() > 0 [
          \ \ *Palavras-chave:* #palavras-chave.join(", ").
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
        set text(size: 10pt)
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
