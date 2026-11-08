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
// mesmas métricas da Times New Roman ou Arial (embutidas no navegador).
#let fontes-serifadas = ("Tinos", "TeX Gyre Termes", "Liberation Serif", "Times New Roman")
#let fontes-sem-serifa = ("Arimo", "Liberation Sans", "Arial", "Helvetica")

// Espaçamentos (o "leading" do Typst é o espaço entre linhas, não a altura
// total da linha; os valores abaixo aproximam o espaçamento 1,5, simples e
// duplo do Word para fonte de 12 pt).
#let entrelinha-1-5 = 1.05em
#let entrelinha-simples = 0.5em
#let entrelinha-dupla = 1.55em
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
// Tabela com título acima e fonte abaixo (NBR 14724 / IBGE — aberta nas laterais).
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
// Quadro com bordas fechadas nos 4 lados (NBR 14724 — dados textuais).
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// Bloco de Código-Fonte / Algoritmo com borda sutil e fonte monoespaçada.
// ---------------------------------------------------------------------
#let codigo(legenda: none, fonte: none, corpo) = block(
  width: 100%,
  above: 1.4em,
  below: 1.4em,
  {
    if legenda != none {
      align(center, text(size: 10pt, weight: "bold")[Algoritmo — #legenda])
      v(0.3em)
    }
    block(
      width: 100%,
      inset: 10pt,
      radius: 3pt,
      fill: luma(248),
      stroke: 0.5pt + luma(200),
      {
        set par(justify: false, first-line-indent: 0pt, leading: 0.55em)
        set text(size: 9.5pt)
        corpo
      },
    )
    if fonte != none {
      v(0.2em)
      align(center, text(size: 10pt)[Fonte: #fonte.])
    }
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
// Função principal do modelo (configurável por norma / universidade)
// ---------------------------------------------------------------------
#let abnt(
  instituicao: "",
  curso: "",
  autor: "",
  titulo: "",
  subtitulo: none,
  natureza: none,
  orientador: none,
  coorientador: none,
  local: "",
  ano: "",
  logo: none,
  incluir-folha-aprovacao: false,
  data-aprovacao: none,
  banca: (),
  dedicatoria: none,
  agradecimentos: none,
  epigrafe: none,
  epigrafe-autor: none,
  resumo: none,
  palavras-chave: (),
  abstract: none,
  keywords: (),
  lista-figuras: false,
  lista-quadros: false,
  lista-tabelas: false,
  siglas: none,
  simbolos: none,
  // Parâmetros de personalização de norma / layout
  fonte: "serif",
  tamanho-fonte: 12pt,
  entrelinha: entrelinha-1-5,
  recuo: recuo-paragrafo,
  margem-superior: 3cm,
  margem-esquerda: 3cm,
  margem-inferior: 2cm,
  margem-direita: 2cm,
  colunas: 1,
  incluir-capa: true,
  incluir-folha-rosto: true,
  incluir-sumario: true,
  body,
) = {
  set document(title: titulo, author: autor)

  let familia-fonte = if fonte == "sans" { fontes-sem-serifa } else { fontes-serifadas }

  set page(
    paper: "a4",
    margin: (
      top: margem-superior,
      left: margem-esquerda,
      bottom: margem-inferior,
      right: margem-direita,
    ),
    header: none,
  )

  set text(font: familia-fonte, size: tamanho-fonte, lang: "pt", region: "br")
  set par(justify: true, leading: entrelinha, spacing: entrelinha, first-line-indent: 0pt)

  // Títulos: numeração progressiva (NBR 6024)
  set heading(numbering: "1.1")
  show heading: set text(size: tamanho-fonte)
  show heading: set block(above: 1.5em, below: 1.5em)
  show heading.where(level: 1): it => {
    // Em trabalhos de 1 coluna com capa, seções primárias começam em página nova
    if incluir-capa and colunas == 1 {
      pagebreak(weak: true)
    }
    text(weight: "bold", upper(it))
  }
  show heading.where(level: 2): it => text(weight: "bold", it)
  show heading.where(level: 3): it => text(weight: "regular", style: "italic", it)
  show heading.where(level: 4): it => text(weight: "regular", underline(it))
  show heading.where(level: 5): it => text(weight: "regular", it)

  // Figuras, Tabelas e Quadros: legenda acima, texto 10 pt, sem recuo
  show figure.where(kind: image): set figure.caption(position: top)
  show figure.where(kind: table): set figure.caption(position: top)
  show figure.where(kind: "quadro"): set figure.caption(position: top)
  show figure.caption: set text(size: 10pt)
  show figure: set par(first-line-indent: 0pt)
  show figure: set block(above: 1.5em, below: 1.5em)

  let titulo-completo = if subtitulo != none and subtitulo != "" [
    #upper(titulo): #subtitulo
  ] else [#upper(titulo)]

  // ------------------------------- CAPA -------------------------------
  if incluir-capa {
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #if logo != none {
        logo
        v(0.8em)
      }
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
  if incluir-folha-rosto {
    if incluir-capa {
      pagebreak()
    }
    counter(page).update(1)
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
        if coorientador != none [

          Coorientador(a): #coorientador
        ]
      }))
    }
    v(1fr)
    align(center, text(weight: "bold")[#local \ #ano])
  } else if not incluir-capa {
    // Modo Artigo Científico (sem capa e sem folha de rosto): cabeçalho direto no topo
    counter(page).update(1)
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #if logo != none {
        logo
        v(0.5em)
      }
      #if instituicao != "" [
        #text(size: 10pt)[#upper(instituicao) — #curso] \
        #v(0.4em)
      ]
      #text(size: 14pt, weight: "bold")[#titulo-completo] \
      #v(0.5em)
      #text(size: 11pt, weight: "bold")[#autor]
      #if orientador != none [
        \ #text(size: 10pt)[Orientador(a): #orientador]
      ]
      #if coorientador != none [
        \ #text(size: 10pt)[Coorientador(a): #coorientador]
      ]
    ]
    v(1em)
  }

  let tem-pre-textual = incluir-capa or incluir-folha-rosto

  // ----------------------- FOLHA DE APROVAÇÃO -------------------------
  if incluir-folha-aprovacao {
    pagebreak()
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #text(weight: "bold")[#upper(autor)]

      #v(2em)
      #text(weight: "bold")[#titulo-completo]
    ]
    v(2em)
    if natureza != none {
      align(right, block(width: 55%, {
        set par(leading: entrelinha-simples, justify: true)
        set text(size: 11pt)
        natureza
      }))
    }
    v(2em)
    if data-aprovacao != none and data-aprovacao != "" [
      Aprovado em: #data-aprovacao.
    ] else [
      Aprovado em: \_\_\_\_/\_\_\_\_/\_\_\_\_\_\_\_\_.
    ]

    v(2.5em)
    align(center)[
      #text(weight: "bold")[BANCA EXAMINADORA]
      #v(2.5em)

      #if orientador != none [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 11pt)[#orientador (Orientador(a)) \ #instituicao]
        #v(2.2em)
      ]

      #if coorientador != none [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 11pt)[#coorientador (Coorientador(a)) \ #instituicao]
        #v(2.2em)
      ]

      #for membro in banca [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 11pt)[#membro]
        #v(2.2em)
      ]
    ]
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
    set par(first-line-indent: (amount: recuo, all: true), leading: entrelinha)
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
    if tem-pre-textual {
      pagebreak()
    } else {
      v(0.8em)
    }
    set par(first-line-indent: 0pt, leading: entrelinha-simples, spacing: entrelinha-simples)
    align(center, text(weight: "bold")[RESUMO])
    v(1em)
    resumo
    if palavras-chave.len() > 0 {
      v(1em)
      [*Palavras-chave:* #palavras-chave.join(". ").]
    }
  }

  // ----------------------------- ABSTRACT -----------------------------
  if abstract != none {
    if tem-pre-textual {
      pagebreak()
    } else {
      v(1em)
    }
    set par(first-line-indent: 0pt, leading: entrelinha-simples, spacing: entrelinha-simples)
    align(center, text(weight: "bold")[ABSTRACT])
    v(1em)
    abstract
    if keywords.len() > 0 {
      v(1em)
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

  // ------------------------- LISTA DE QUADROS -------------------------
  if lista-quadros {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[LISTA DE QUADROS])
    v(1.5em)
    outline(title: none, target: figure.where(kind: "quadro"))
  }

  // ------------------------- LISTA DE TABELAS -------------------------
  if lista-tabelas {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[LISTA DE TABELAS])
    v(1.5em)
    outline(title: none, target: figure.where(kind: table))
  }

  // --------------- LISTA DE ABREVIATURAS E SIGLAS ---------------------
  if siglas != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    align(center, text(weight: "bold")[LISTA DE ABREVIATURAS E SIGLAS])
    v(1.5em)
    siglas
  }

  // ----------------------- LISTA DE SÍMBOLOS --------------------------
  if simbolos != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    align(center, text(weight: "bold")[LISTA DE SÍMBOLOS])
    v(1.5em)
    simbolos
  }

  // ------------------------------ SUMÁRIO -----------------------------
  if incluir-sumario {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[SUMÁRIO])
    v(1.5em)
    outline(title: none, indent: auto)
  } else if not tem-pre-textual {
    v(1.5em)
  }

  // -------------------------- PARTE TEXTUAL ---------------------------
  // A partir daqui o número da página aparece no canto superior direito.
  set page(
    header: context align(right, text(size: 10pt, counter(page).display())),
    columns: colunas,
  )
  // `all: true`: a ABNT recua também o primeiro parágrafo após um título.
  set par(first-line-indent: (amount: recuo, all: true))
  body
}
