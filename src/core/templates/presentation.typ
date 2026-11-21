// =====================================================================
// RedijaApp — Modelo Oficial para Apresentação de Slides de Defesa (TCC / Artigo)
// Compatível com a semântica de slides por seção (@preview/touying) e Typst 0.13+
// Suporta proporções 16:9 e 4:3 e temas Sóbrio, Institucional (Esmeralda) e Escuro
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let slide-temas = (
  sobrio: (
    bg: rgb("#ffffff"),
    text: rgb("#1e293b"),
    muted: rgb("#64748b"),
    primary: rgb("#1e3a8a"),
    accent: rgb("#2563eb"),
    cover-bg: rgb("#0f172a"),
    cover-text: rgb("#ffffff"),
    cover-muted: rgb("#cbd5e1"),
    header-bg: rgb("#f8fafc"),
    header-text: rgb("#0f172a"),
    header-border: rgb("#cbd5e1"),
    card-bg: rgb("#f8fafc"),
    card-border: rgb("#e2e8f0"),
  ),
  institucional: (
    bg: rgb("#ffffff"),
    text: rgb("#0f172a"),
    muted: rgb("#475569"),
    primary: rgb("#065f46"),
    accent: rgb("#059669"),
    cover-bg: rgb("#064e3b"),
    cover-text: rgb("#ffffff"),
    cover-muted: rgb("#a7f3d0"),
    header-bg: rgb("#ecfdf5"),
    header-text: rgb("#064e3b"),
    header-border: rgb("#6ee7b7"),
    card-bg: rgb("#f0fdf4"),
    card-border: rgb("#bbf7d0"),
  ),
  dark: (
    bg: rgb("#0f172a"),
    text: rgb("#f1f5f9"),
    muted: rgb("#94a3b8"),
    primary: rgb("#38bdf8"),
    accent: rgb("#10b981"),
    cover-bg: rgb("#020617"),
    cover-text: rgb("#f8fafc"),
    cover-muted: rgb("#94a3b8"),
    header-bg: rgb("#1e293b"),
    header-text: rgb("#f8fafc"),
    header-border: rgb("#334155"),
    card-bg: rgb("#1e293b"),
    card-border: rgb("#334155"),
  ),
)

// Citação destacada em slide
#let citacao(referencia: none, parenteses: true, corpo) = block(
  width: 100%,
  inset: (left: 1.2cm, right: 0.8cm, y: 0.6cm),
  stroke: (left: 3pt + rgb("#059669")),
  fill: luma(248),
  radius: (right: 6pt),
  above: 0.6em,
  below: 0.6em,
  {
    set text(size: 0.88em, style: "italic", fill: rgb("#1e293b"))
    corpo
    if referencia != none {
      v(0.25em)
      align(right, text(style: "normal", weight: "bold", size: 0.9em)[
        #if parenteses [(#referencia)] else [#referencia]
      ])
    }
  },
)

// Figura otimizada para altura de slide (16:9 ou 4:3)
#let figura(legenda: [], fonte: [do autor], imagem: none) = figure(
  kind: image,
  supplement: [Figura],
  caption: legenda,
  {
    if imagem == none {
      rect(
        width: 75%,
        height: 5.5cm,
        stroke: 1pt + luma(180),
        radius: 6pt,
        align(center + horizon, text(fill: luma(120), size: 0.85em)[Figura / Ilustração do Slide]),
      )
    } else {
      block(width: 100%, height: 6.2cm, align(center + horizon, imagem))
    }
    v(0.2em)
    text(size: 0.72em, fill: luma(110))[*Fonte:* #fonte.]
  },
)

// Tabela otimizada para slide
#let tabela(legenda: [], fonte: [do autor], corpo) = figure(
  kind: table,
  supplement: [Tabela],
  caption: legenda,
  {
    set text(size: 0.78em)
    corpo
    v(0.2em)
    text(size: 0.72em, fill: luma(110))[*Fonte:* #fonte.]
  },
)

// Quadro otimizado para slide
#let quadro(legenda: [], fonte: [do autor], corpo) = figure(
  kind: "quadro",
  supplement: [Quadro],
  caption: legenda,
  {
    set text(size: 0.78em)
    corpo
    v(0.2em)
    text(size: 0.72em, fill: luma(110))[*Fonte:* #fonte.]
  },
)

// Bloco de código para slide
#let codigo(legenda: none, fonte: none, corpo) = block(
  width: 100%,
  above: 0.6em,
  below: 0.6em,
  {
    if legenda != none {
      align(left, text(size: 0.78em, weight: "bold")[Algoritmo — #legenda])
      v(0.2em)
    }
    block(
      width: 100%,
      inset: 10pt,
      radius: 6pt,
      fill: luma(245),
      stroke: 0.6pt + luma(200),
      {
        set par(justify: false, first-line-indent: 0pt, leading: 0.48em)
        set text(size: 0.72em, fill: rgb("#0f172a"))
        corpo
      },
    )
    if fonte != none {
      v(0.15em)
      align(right, text(size: 0.68em, fill: luma(110))[*Fonte:* #fonte.])
    }
  },
)

// Lista de referências em slide final
#let referencias(
  titulo: auto,
  alinhamento: "left",
  espacamento: 0.55em,
  numeracao: none,
  ..itens
) = {
  let heading-title = if titulo != auto { titulo } else [Referências Principais]
  heading(level: 1, numbering: none)[#heading-title]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: 0.48em,
  )
  set text(size: 0.76em)
  let idx = 1
  for item in itens.pos() {
    if numeracao == "bracket" {
      block(
        above: 0pt,
        below: espacamento,
        grid(
          columns: (1.8em, 1fr),
          gutter: 0.35em,
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
          gutter: 0.35em,
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
// Função Principal do Modelo Apresentação de Defesa
// =====================================================================
#let defense-presentation(
  titulo: "",
  subtitulo: none,
  autor: "",
  orientador: none,
  coorientador: none,
  instituicao: "",
  curso: "",
  local: "",
  ano: "",
  logo: none,
  tema: "institucional",
  proporcao: "16-9",
  fonte: "sans",
  tamanho-fonte: 18pt,
  idioma: "pt",
  regiao: auto,
  numeracao-secoes: "none",
  incluir-capa: true,
  body,
) = {
  set document(title: titulo, author: autor)

  let familia-fonte = if type(fonte) == array {
    fonte
  } else if fonte == "serif" {
    fontes-serifadas
  } else if fonte == "sans" {
    fontes-sem-serifa
  } else {
    (fonte, ..fontes-sem-serifa)
  }

  let palette = slide-temas.at(tema, default: slide-temas.institucional)
  let safe-ratio = if proporcao == "4-3" { "4-3" } else { "16-9" }
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

  let lbl-orientador = if idioma == "en" [Advisor:] else if idioma == "es" [Director(a):] else [Orientador(a):]
  let lbl-coorientador = if idioma == "en" [Co-advisor:] else if idioma == "es" [Codirector(a):] else [Coorientador(a):]

  set page(
    paper: "presentation-" + safe-ratio,
    fill: palette.bg,
    margin: (top: 1.6cm, bottom: 1.5cm, left: 2cm, right: 2cm),
    footer: context {
      let pg = counter(page).get().first()
      let total = counter(page).final().first()
      if incluir-capa and pg == 1 {
        none
      } else {
        block(
          width: 100%,
          stroke: (top: 0.6pt + palette.header-border),
          inset: (top: 0.35cm),
          grid(
            columns: (1fr, auto, auto),
            gutter: 1cm,
            align: (left + horizon, right + horizon, right + horizon),
            text(size: 0.62em, fill: palette.muted)[
              #if instituicao != "" [*#instituicao*]
              #if instituicao != "" and titulo != "" [ • ]
              #if titulo != "" [#titulo]
            ],
            text(size: 0.62em, fill: palette.muted)[#autor],
            text(size: 0.65em, weight: "bold", fill: palette.accent)[#pg / #total],
          ),
        )
      }
    },
  )

  set text(
    font: familia-fonte,
    size: tamanho-fonte,
    fill: palette.text,
    lang: idioma,
    region: resolved-regiao,
  )

  set par(
    leading: 0.65em,
    spacing: 0.9em,
    first-line-indent: 0pt,
    justify: false,
  )

  set list(
    marker: text(fill: palette.accent, weight: "bold")[•],
    indent: 0.4cm,
    body-indent: 0.4cm,
    spacing: 0.85em,
  )

  set enum(
    indent: 0.4cm,
    body-indent: 0.4cm,
    spacing: 0.85em,
  )

  set heading(numbering: num-secoes)

  let is-first-slide = state("redija-first-slide", true)

  // Cada título de Nível 1 (= Título) abre um novo slide automaticamente
  show heading.where(level: 1): it => {
    context {
      if not is-first-slide.get() or incluir-capa {
        pagebreak(weak: true)
      }
    }
    is-first-slide.update(false)
    block(
      width: 100%,
      fill: palette.header-bg,
      stroke: (left: 5pt + palette.accent, bottom: 1pt + palette.header-border),
      radius: (right: 8pt),
      inset: (x: 0.9cm, y: 0.55cm),
      below: 0.9cm,
      [
        #set text(size: 1.25em, weight: "bold", fill: palette.header-text)
        #if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ]#it.body
      ],
    )
  }

  show heading.where(level: 2): it => block(
    above: 0.7cm,
    below: 0.4cm,
    [
      #set text(size: 1.05em, weight: "bold", fill: palette.primary)
      #if it.numbering != none [#numbering(it.numbering, ..counter(heading).at(it.location())) ]#it.body
    ],
  )

  // --- SLIDE 1: CAPA DA APRESENTAÇÃO DE DEFESA ---
  if incluir-capa {
    page(
      fill: palette.cover-bg,
      margin: (x: 2.4cm, y: 2cm),
      footer: none,
    )[
      #set text(fill: palette.cover-text)
      #grid(
        columns: if logo != none { (auto, 1fr) } else { (1fr,) },
        gutter: 1.2cm,
        align: horizon,
        ..if logo != none {
          (
            block(
              fill: rgb("#ffffff"),
              inset: 0.35cm,
              radius: 8pt,
              logo,
            ),
          )
        } else { () },
        [
          #if instituicao != "" [
            #text(size: 0.78em, weight: "bold", tracking: 0.06em, fill: palette.cover-muted)[
              #upper(instituicao)
            ]
          ]
          #if curso != "" [
            \ #text(size: 0.7em, fill: palette.cover-muted)[#curso]
          ]
        ],
      )

      #v(1fr)

      #block(
        width: 100%,
        stroke: (left: 5pt + palette.accent),
        inset: (left: 0.9cm, y: 0.2cm),
        [
          #text(size: 1.75em, weight: "bold")[#titulo]
          #if subtitulo != none and subtitulo != "" [
            \ #v(0.35cm)
            #text(size: 1.05em, weight: "medium", fill: palette.cover-muted)[#subtitulo]
          ]
        ],
      )

      #v(1fr)

      #block(
        width: 100%,
        fill: rgb(255, 255, 255, 18),
        radius: 10pt,
        inset: (x: 0.9cm, y: 0.65cm),
        grid(
          columns: (1fr, auto),
          gutter: 1cm,
          align: (left + horizon, right + horizon),
          [
            #text(size: 0.92em, weight: "bold")[#autor]
            #if orientador != none and orientador != "" [
              \ #v(0.15cm)
              #text(size: 0.76em, fill: palette.cover-muted)[*#lbl-orientador* #orientador]
            ]
            #if coorientador != none and coorientador != "" [
              \ #text(size: 0.74em, fill: palette.cover-muted)[*#lbl-coorientador* #coorientador]
            ]
          ],
          [
            #text(size: 0.76em, fill: palette.cover-muted)[
              #if local != "" [#local]
              #if local != "" and ano != "" [ • ]
              #if ano != "" [*#ano*]
            ]
          ],
        ),
      )
    ]
  }

  body
}
