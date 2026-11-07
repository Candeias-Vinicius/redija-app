// =====================================================================
// RedijaApp — Modelo ABNT para Typst
// Referências: NBR 14724 (trabalhos acadêmicos), NBR 10520 (citações),
//              NBR 6023 (referências), NBR 6027 (sumário), NBR 6028 (resumo)
//
// Requer Typst >= 0.13 (usa `context` e `first-line-indent: (all: true)`).
//
// Este arquivo é carregado como módulo pelo documento gerado:
//   #import "abnt.typ": *
//   #show: abnt.with(titulo: "...", ...)
// =====================================================================

// Fontes em ordem de preferência. As primeiras são livres e têm as
// mesmas métricas da Times New Roman (embutidas no navegador).
#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")

// Espaçamentos (o "leading" do Typst é o espaço entre linhas, não a altura
// total da linha; os valores abaixo aproximam o espaçamento 1,5 e simples
// do Word para fonte de 12 pt).
#let entrelinha-1-5 = 1.05em
#let entrelinha-simples = 0.5em
#let recuo-paragrafo = 1.25cm

// ---------------------------------------------------------------------
// Citação direta longa (NBR 10520): mais de 3 linhas, recuo de 4 cm,
// fonte menor, espaçamento simples, sem aspas.
// ---------------------------------------------------------------------
#let citacao(referencia: none, corpo) = block(
  inset: (left: 4cm),
  above: 1.5em,
  below: 1.5em,
  width: 100%,
  {
    set text(size: 10pt)
    set par(leading: entrelinha-simples, first-line-indent: 0pt, justify: true)
    corpo
    if referencia != none [ (#referencia)]
  },
)

// ---------------------------------------------------------------------
// Figura com legenda acima e fonte abaixo (NBR 14724).
// Enquanto o upload de imagens não existir, `imagem` pode ser none e um
// quadro de espaço reservado é desenhado.
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// Tabela com título acima e fonte abaixo (NBR 14724 / IBGE).
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// Lista de referências (NBR 6023): alinhadas à esquerda, espaçamento
// simples, separadas por uma linha em branco.
// ---------------------------------------------------------------------
#let referencias(..itens) = {
  heading(numbering: none)[Referências]
  set par(justify: false, first-line-indent: 0pt, leading: entrelinha-simples)
  for item in itens.pos() {
    block(above: 0pt, below: 1.2em, item)
  }
}

// ---------------------------------------------------------------------
// Função principal do modelo
// ---------------------------------------------------------------------
#let abnt(
  instituicao: "",
  curso: "",
  autor: "",
  titulo: "",
  subtitulo: none,
  natureza: none,
  orientador: none,
  local: "",
  ano: "",
  dedicatoria: none,
  agradecimentos: none,
  epigrafe: none,
  epigrafe-autor: none,
  resumo: none,
  palavras-chave: (),
  abstract: none,
  keywords: (),
  lista-figuras: false,
  lista-tabelas: false,
  body,
) = {
  set document(title: titulo, author: autor)

  set page(
    paper: "a4",
    margin: (top: 3cm, left: 3cm, bottom: 2cm, right: 2cm),
    header: none,
  )

  set text(font: fontes-serifadas, size: 12pt, lang: "pt", region: "br")
  set par(justify: true, leading: entrelinha-1-5, spacing: entrelinha-1-5, first-line-indent: 0pt)

  // Títulos: numeração progressiva (NBR 6024)
  set heading(numbering: "1.1")
  show heading: set text(size: 12pt)
  show heading: set block(above: 1.5em, below: 1.5em)
  show heading.where(level: 1): it => {
    // Seções primárias começam em página nova
    pagebreak(weak: true)
    text(weight: "bold", upper(it))
  }
  show heading.where(level: 2): it => text(weight: "bold", it)
  show heading.where(level: 3): it => text(weight: "regular", style: "italic", it)

  // Figuras e Tabelas: legenda acima, texto 10 pt, sem recuo
  show figure.where(kind: image): set figure.caption(position: top)
  show figure.where(kind: table): set figure.caption(position: top)
  show figure.caption: set text(size: 10pt)
  show figure: set par(first-line-indent: 0pt)
  show figure: set block(above: 1.5em, below: 1.5em)

  let titulo-completo = if subtitulo != none and subtitulo != "" [
    #upper(titulo): #subtitulo
  ] else [#upper(titulo)]

  // ------------------------------- CAPA -------------------------------
  // A capa não é contada na paginação.
  {
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #text(weight: "bold")[#upper(instituicao)] \
      #upper(curso)

      #v(1fr)
      #text(weight: "bold")[#upper(autor)]

      #v(1fr)
      #text(weight: "bold")[#titulo-completo]

      #v(2fr)
      #text(weight: "bold")[#local \ #ano]
    ]
  }

  // -------------------------- FOLHA DE ROSTO --------------------------
  // A contagem de páginas começa aqui (mas o número só aparece a partir
  // da parte textual).
  pagebreak()
  counter(page).update(1)
  {
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #text(weight: "bold")[#upper(autor)]

      #v(1fr)
      #text(weight: "bold")[#titulo-completo]
    ]
    v(1fr)
    if natureza != none {
      align(right, block(width: 50%, {
        set par(leading: entrelinha-simples, justify: true)
        set text(size: 11pt)
        natureza
        if orientador != none [

          Orientador(a): #orientador
        ]
      }))
    }
    v(1fr)
    align(center, text(weight: "bold")[#local \ #ano])
  }

  // --------------------------- DEDICATÓRIA ----------------------------
  if dedicatoria != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    v(1fr)
    align(right, block(width: 55%, align(left, dedicatoria)))
  }

  // ------------------------- AGRADECIMENTOS ---------------------------
  if agradecimentos != none {
    pagebreak()
    set par(first-line-indent: (amount: recuo-paragrafo, all: true), leading: entrelinha-1-5)
    align(center, text(weight: "bold")[AGRADECIMENTOS])
    v(1.5em)
    agradecimentos
  }

  // ----------------------------- EPÍGRAFE -----------------------------
  if epigrafe != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    v(1fr)
    align(right, block(width: 60%, {
      align(left, emph(epigrafe))
      if epigrafe-autor != none [
        \
        #align(right, text(size: 10pt)[(#epigrafe-autor)])
      ]
    }))
  }

  // ------------------------------ RESUMO ------------------------------
  if resumo != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples, spacing: entrelinha-simples)
    align(center, text(weight: "bold")[RESUMO])
    v(1.5em)
    resumo
    if palavras-chave.len() > 0 {
      v(1.5em)
      [*Palavras-chave:* #palavras-chave.join(". ").]
    }
  }

  // ----------------------------- ABSTRACT -----------------------------
  if abstract != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples, spacing: entrelinha-simples)
    align(center, text(weight: "bold")[ABSTRACT])
    v(1.5em)
    abstract
    if keywords.len() > 0 {
      v(1.5em)
      [*Keywords:* #keywords.join(". ").]
    }
  }

  // ----------------------- LISTA DE ILUSTRAÇÕES -----------------------
  if lista-figuras {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[LISTA DE ILUSTRAÇÕES])
    v(1.5em)
    outline(title: none, target: figure.where(kind: image))
  }

  // ------------------------- LISTA DE TABELAS -------------------------
  if lista-tabelas {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[LISTA DE TABELAS])
    v(1.5em)
    outline(title: none, target: figure.where(kind: table))
  }

  // ------------------------------ SUMÁRIO -----------------------------
  pagebreak()
  {
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[SUMÁRIO])
    v(1.5em)
    outline(title: none, indent: auto)
  }

  // -------------------------- PARTE TEXTUAL ---------------------------
  // A partir daqui o número da página aparece no canto superior direito.
  set page(header: context align(right, text(size: 10pt, counter(page).display())))
  // `all: true`: a ABNT recua também o primeiro parágrafo após um título.
  set par(first-line-indent: (amount: recuo-paragrafo, all: true))
  body
}
