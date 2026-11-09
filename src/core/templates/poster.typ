// =====================================================================
// RedijaApp — Modelo Oficial para Pôsteres Científicos e Acadêmicos (A0 / A1)
// Simpósios, Congressos, Encontros de IC e Mostras Científicas
// =====================================================================

#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

#let tema-cores = (
  emerald: (
    primary: rgb("#059669"),
    header-bg: rgb("#064e3b"),
    card-header-bg: rgb("#ecfdf5"),
    card-header-text: rgb("#065f46"),
    border: rgb("#a7f3d0"),
  ),
  blue: (
    primary: rgb("#2563eb"),
    header-bg: rgb("#1e3a8a"),
    card-header-bg: rgb("#eff6ff"),
    card-header-text: rgb("#1e40af"),
    border: rgb("#bfdbfe"),
  ),
  classic_dark: (
    primary: rgb("#27272a"),
    header-bg: rgb("#09090b"),
    card-header-bg: rgb("#f4f4f5"),
    card-header-text: rgb("#18181b"),
    border: rgb("#e4e4e7"),
  ),
  clean: (
    primary: rgb("#10b981"),
    header-bg: rgb("#ffffff"),
    card-header-bg: rgb("#f8fafc"),
    card-header-text: rgb("#0f172a"),
    border: rgb("#cbd5e1"),
  ),
)

// Citação no pôster
#let citacao(referencia: none, parenteses: true, corpo) = block(
  inset: (left: 2cm),
  above: 1em,
  below: 1em,
  width: 100%,
  {
    set text(size: 20pt, style: "italic")
    corpo
    if referencia != none {
      if parenteses [ (#referencia)] else [ #referencia]
    }
  },
)

// Figura em tamanho de banner de pôster
#let figura(legenda: [], fonte: [do autor], imagem: none) = figure(
  kind: image,
  supplement: [Figura],
  caption: legenda,
  {
    if imagem == none {
      rect(
        width: 100%,
        height: 12cm,
        stroke: 1pt + luma(180),
        radius: 8pt,
        align(center + horizon, text(fill: luma(120), size: 20pt)[Imagem / Gráfico]),
      )
    } else {
      imagem
    }
    v(0.4em)
    text(size: 18pt)[*Fonte:* #fonte.]
  },
)

// Tabela no pôster
#let tabela(legenda: [], fonte: [do autor], corpo) = figure(
  kind: table,
  supplement: [Tabela],
  caption: legenda,
  {
    corpo
    v(0.4em)
    text(size: 18pt)[*Fonte:* #fonte.]
  },
)

// Quadro no pôster
#let quadro(legenda: [], fonte: [do autor], corpo) = figure(
  kind: "quadro",
  supplement: [Quadro],
  caption: legenda,
  {
    corpo
    v(0.4em)
    text(size: 18pt)[*Fonte:* #fonte.]
  },
)

// Lista de referências compacta para pôster (configurável)
#let referencias(
  alinhamento: "justify",
  espacamento: 0.6em,
  numeracao: none,
  ..itens
) = {
  heading(level: 1)[Referências]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: 0.5em,
  )
  set text(size: 16pt)
  let idx = 1
  for item in itens.pos() {
    if numeracao == "bracket" {
      block(
        above: 0pt,
        below: espacamento,
        grid(
          columns: (2.2em, 1fr),
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
          columns: (2.2em, 1fr),
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
// Função Principal do Modelo Pôster Acadêmico A0 / A1
// =====================================================================
#let academic-poster(
  titulo: "",
  subtitulo: none,
  autor: "",
  instituicao: "",
  curso: "",
  local: "",
  ano: "",
  logo: none,
  fonte: "sans",
  dimensoes: "a0",
  orientacao: "portrait",
  colunas: 3,
  tema: "emerald",
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
  let colors = tema-cores.at(tema, default: tema-cores.emerald)

  let is-clean = tema == "clean"
  let header-text-color = if is-clean { rgb("#0f172a") } else { rgb("#ffffff") }

  // Tamanho do Pôster (A0: 84.1cm x 118.9cm)
  set page(
    paper: dimensoes,
    flipped: (orientacao == "landscape"),
    margin: (
      top: 2.5cm,
      bottom: 2.5cm,
      left: 2.5cm,
      right: 2.5cm,
    ),
    fill: rgb("#fcfcfc"),
  )

  set text(
    font: familia-fonte,
    size: 22pt,
    lang: "pt",
    region: "BR",
  )

  set par(
    leading: 0.65em,
    justify: true,
  )

  // Formatação de títulos como caixas visuais de seção (Cards)
  show heading.where(level: 1): it => block(
    width: 100%,
    stroke: 1.5pt + colors.primary,
    radius: 12pt,
    fill: colors.card-header-bg,
    inset: (x: 1.2cm, y: 0.8cm),
    above: 1.6cm,
    below: 0.8cm,
    [
      #set text(size: 28pt, weight: "bold", fill: colors.card-header-text)
      #it.body
    ]
  )

  show heading.where(level: 2): it => block(
    above: 1.2cm,
    below: 0.5cm,
    [
      #set text(size: 24pt, weight: "bold", fill: colors.primary)
      #it.body
    ]
  )

  // --- BANNER SUPERIOR INSTITUCIONAL ---
  block(
    width: 100%,
    fill: colors.header-bg,
    radius: 16pt,
    inset: (x: 3cm, y: 2.2cm),
    below: 2cm,
    stroke: if is-clean { 1.5pt + colors.border } else { none },
    [
      #grid(
        columns: if logo != none { (14cm, 1fr) } else { (1fr,) },
        gutter: 2.5cm,
        align: horizon + center,
        if logo != none [
          #align(center + horizon)[#logo]
        ],
        [
          #set text(fill: header-text-color)
          #text(size: 52pt, weight: "bold")[#titulo]
          #if subtitulo != none [
            \ #v(0.6cm) #text(size: 32pt, weight: "medium", fill: header-text-color.lighten(20%))[#subtitulo]
          ]
          #v(1cm)
          #text(size: 26pt, weight: "bold")[#autor] \
          #v(0.3cm)
          #text(size: 20pt, fill: header-text-color.lighten(15%))[
            #if curso != "" [#curso | ]
            #if instituicao != "" [#instituicao]
            #if local != "" [ — #local]
          ]
        ]
      )
    ]
  )

  // --- GRID DE COLUNAS DO PÔSTER ---
  columns(colunas, gutter: 2cm)[
    #body
  ]
}
