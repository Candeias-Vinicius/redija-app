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
// fonte proporcional (~10pt em 12pt), espaçamento simples, sem aspas.
// ---------------------------------------------------------------------
#let citacao(referencia: none, parenteses: true, corpo) = block(
  inset: (left: 4cm),
  above: 1.5em,
  below: 1.5em,
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

// ---------------------------------------------------------------------
// Figura com legenda acima e fonte abaixo (NBR 14724).
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
        align(center + horizon, text(fill: luma(120), size: 0.85em)[Imagem]),
      )
    } else {
      imagem
    }
    v(0.3em)
    text(size: 0.85em)[Fonte: #fonte.]
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
    text(size: 0.85em)[Fonte: #fonte.]
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
    text(size: 0.85em)[Fonte: #fonte.]
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
      align(center, text(size: 0.85em, weight: "bold")[Algoritmo — #legenda])
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

// ---------------------------------------------------------------------
// Lista de referências (NBR 6023): alinhadas à esquerda, espaçamento
// simples, separadas por uma linha em branco (configurável multi-norma).
// ---------------------------------------------------------------------
#let referencias(
  titulo: auto,
  alinhamento: "left",
  espacamento: 1.2em,
  numeracao: none,
  ..itens
) = {
  let heading-title = if titulo != auto { titulo } else [Referências]
  heading(numbering: none)[#heading-title]
  set par(
    justify: alinhamento == "justify",
    first-line-indent: 0pt,
    leading: entrelinha-simples,
  )
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
  espacamento-paragrafo: auto,
  justificar-corpo: true,
  margem-superior: 3cm,
  margem-esquerda: 3cm,
  margem-inferior: 2cm,
  margem-direita: 2cm,
  tamanho-papel: "a4",
  orientacao: "portrait",
  idioma: "pt",
  regiao: auto,
  posicao-pagina: "top_right",
  ocultar-pagina-1: false,
  romano-pre-textual: false,
  cabecalho: none,
  numeracao-secoes: "1.1",
  quebra-h1: auto,
  colunas: 1,
  incluir-capa: true,
  incluir-folha-rosto: true,
  incluir-sumario: true,
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
    "us"
  } else if idioma == "es" {
    "es"
  } else {
    "br"
  }
  let espaco-paragrafo = if espacamento-paragrafo != auto { espacamento-paragrafo } else { entrelinha }
  let num-secoes = if numeracao-secoes == "none" or numeracao-secoes == none { none } else { numeracao-secoes }

  let lbl-orientador = if idioma == "en" [Advisor:] else if idioma == "es" [Director(a):] else [Orientador(a):]
  let lbl-coorientador = if idioma == "en" [Co-advisor:] else if idioma == "es" [Codirector(a):] else [Coorientador(a):]
  let lbl-aprovado = if idioma == "en" [Approved on:] else if idioma == "es" [Aprobado el:] else [Aprovado em:]
  let lbl-banca = if idioma == "en" [EXAMINATION COMMITTEE] else if idioma == "es" [TRIBUNAL EXAMINADOR] else [BANCA EXAMINADORA]
  let lbl-agradecimentos = if idioma == "en" [ACKNOWLEDGMENTS] else if idioma == "es" [AGRADECIMIENTOS] else [AGRADECIMENTOS]
  let lbl-resumo = if idioma == "en" [SUMMARY] else if idioma == "es" [RESUMEN] else [RESUMO]
  let lbl-palavras = if idioma == "en" [Keywords:] else if idioma == "es" [Palabras clave:] else [Palavras-chave:]
  let lbl-lista-fig = if idioma == "en" [LIST OF FIGURES] else if idioma == "es" [LISTA DE FIGURAS] else [LISTA DE ILUSTRAÇÕES]
  let lbl-lista-qua = if idioma == "en" [LIST OF CHARTS] else if idioma == "es" [LISTA DE CUADROS] else [LISTA DE QUADROS]
  let lbl-lista-tab = if idioma == "en" [LIST OF TABLES] else if idioma == "es" [LISTA DE TABLAS] else [LISTA DE TABELAS]
  let lbl-siglas = if idioma == "en" [LIST OF ABBREVIATIONS] else if idioma == "es" [LISTA DE SIGLAS] else [LISTA DE ABREVIATURAS E SIGLAS]
  let lbl-simbolos = if idioma == "en" [LIST OF SYMBOLS] else if idioma == "es" [LISTA DE SÍMBOLOS] else [LISTA DE SÍMBOLOS]
  let lbl-sumario = if idioma == "en" [CONTENTS] else if idioma == "es" [ÍNDICE] else [SUMÁRIO]

  let doc-phase = state("redija-abnt-phase", if incluir-capa { "cover" } else { "pre" })

  set page(
    paper: papel-typst,
    flipped: (orientacao == "landscape"),
    margin: (
      top: margem-superior,
      left: margem-esquerda,
      bottom: margem-inferior,
      right: margem-direita,
    ),
    header: context {
      let phase = doc-phase.get()
      if phase == "cover" {
        none
      } else {
        let pg = counter(page).get().first()
        let show-num = if phase == "textual" {
          posicao-pagina == "top_right" and not (ocultar-pagina-1 and pg == 1)
        } else if romano-pre-textual {
          posicao-pagina == "top_right" and not (ocultar-pagina-1 and not incluir-capa and pg == 1)
        } else {
          false
        }
        let num-text = if phase == "pre" and romano-pre-textual {
          numbering("i", pg)
        } else {
          counter(page).display()
        }
        let header-left = if phase == "textual" and cabecalho != none and cabecalho != "" {
          cabecalho
        } else {
          none
        }
        if header-left != none or show-num {
          grid(
            columns: (1fr, auto),
            align(left, text(size: 0.85em, fill: luma(90))[#if header-left != none { header-left }]),
            align(right, text(size: 0.85em)[#if show-num { num-text }]),
          )
        }
      }
    },
    footer: context {
      let phase = doc-phase.get()
      if phase == "cover" {
        none
      } else {
        let pg = counter(page).get().first()
        let is-bottom = posicao-pagina == "bottom_center" or posicao-pagina == "bottom_right"
        let show-num = if not is-bottom {
          false
        } else if phase == "textual" {
          not (ocultar-pagina-1 and pg == 1)
        } else if romano-pre-textual {
          not (ocultar-pagina-1 and not incluir-capa and pg == 1)
        } else {
          false
        }
        if show-num {
          let num-text = if phase == "pre" and romano-pre-textual {
            numbering("i", pg)
          } else {
            counter(page).display()
          }
          align(
            if posicao-pagina == "bottom_center" { center } else { right },
            text(size: 0.85em)[#num-text],
          )
        }
      }
    },
  )

  set text(font: familia-fonte, size: tamanho-fonte, lang: idioma, region: resolved-regiao)
  set par(justify: justificar-corpo, leading: entrelinha, spacing: espaco-paragrafo, first-line-indent: 0pt)

  // Títulos: numeração progressiva (NBR 6024)
  set heading(numbering: num-secoes)
  show heading: set text(size: tamanho-fonte)
  show heading: set block(above: 1.5em, below: 1.5em)
  show heading.where(level: 1): it => {
    // Em trabalhos de 1 coluna com capa, seções primárias começam em página nova
    let deve-quebrar = if quebra-h1 != auto { quebra-h1 } else { incluir-capa and colunas == 1 }
    if deve-quebrar {
      pagebreak(weak: true)
    }
    text(weight: "bold", upper(it))
  }
  show heading.where(level: 2): it => text(weight: "bold", it)
  show heading.where(level: 3): it => text(weight: "regular", style: "italic", it)
  show heading.where(level: 4): it => text(weight: "regular", underline(it))
  show heading.where(level: 5): it => text(weight: "regular", it)

  // Figuras, Tabelas e Quadros: legenda acima, texto proporcional, sem recuo
  show figure.where(kind: image): set figure.caption(position: top)
  show figure.where(kind: table): set figure.caption(position: top)
  show figure.where(kind: "quadro"): set figure.caption(position: top)
  show figure.caption: set text(size: 0.85em)
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
      #if instituicao != "" [
        #text(weight: "bold")[#upper(instituicao)]#if curso != "" [ \ ]
      ]
      #if curso != "" [
        #upper(curso)
      ]

      #v(1fr)
      #text(weight: "bold")[#upper(autor)]

      #v(1fr)
      #text(weight: "bold")[#titulo-completo]

      #v(2fr)
      #if local != "" and ano != "" [
        #text(weight: "bold")[#local \ #ano]
      ] else if local != "" [
        #text(weight: "bold")[#local]
      ] else if ano != "" [
        #text(weight: "bold")[#ano]
      ]
    ]
    doc-phase.update("pre")
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
        set text(size: 0.92em)
        natureza
        if orientador != none [

          #lbl-orientador #orientador
        ]
        if coorientador != none [

          #lbl-coorientador #coorientador
        ]
      }))
    }
    v(1fr)
    if local != "" and ano != "" {
      align(center, text(weight: "bold")[#local \ #ano])
    } else if local != "" {
      align(center, text(weight: "bold")[#local])
    } else if ano != "" {
      align(center, text(weight: "bold")[#ano])
    }
  } else if not incluir-capa {
    // Modo Artigo Científico (sem capa e sem folha de rosto): cabeçalho direto no topo
    counter(page).update(1)
    set par(first-line-indent: 0pt, justify: false)
    align(center)[
      #if logo != none {
        logo
        v(0.5em)
      }
      #if instituicao != "" or curso != "" [
        #text(size: 0.85em)[#upper(instituicao)#if instituicao != "" and curso != "" [ — ]#curso] \
        #v(0.4em)
      ]
      #text(size: 1.17em, weight: "bold")[#titulo-completo] \
      #v(0.5em)
      #text(size: 0.92em, weight: "bold")[#autor]
      #if orientador != none [
        \ #text(size: 0.85em)[#lbl-orientador #orientador]
      ]
      #if coorientador != none [
        \ #text(size: 0.85em)[#lbl-coorientador #coorientador]
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
        set text(size: 0.92em)
        natureza
      }))
    }
    v(2em)
    if data-aprovacao != none and data-aprovacao != "" [
      #lbl-aprovado #data-aprovacao.
    ] else [
      #lbl-aprovado \_\_\_\_/\_\_\_\_/\_\_\_\_\_\_\_\_.
    ]

    v(2.5em)
    align(center)[
      #text(weight: "bold")[#lbl-banca]
      #v(2.5em)

      #if orientador != none [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 0.92em)[#orientador (Orientador(a)) \ #instituicao]
        #v(2.2em)
      ]

      #if coorientador != none [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 0.92em)[#coorientador (Coorientador(a)) \ #instituicao]
        #v(2.2em)
      ]

      #for membro in banca [
        #line(length: 65%, stroke: 0.5pt)
        #v(0.2em)
        #text(size: 0.92em)[#membro]
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
    align(center, text(weight: "bold")[#lbl-agradecimentos])
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
        #align(right, text(size: 0.85em)[(#epigrafe-autor)])
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
    align(center, text(weight: "bold")[#lbl-resumo])
    v(1em)
    resumo
    if palavras-chave.len() > 0 {
      v(1em)
      [*#lbl-palavras* #palavras-chave.join(". ").]
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
    align(center, text(weight: "bold")[#lbl-lista-fig])
    v(1.5em)
    outline(title: none, target: figure.where(kind: image))
  }

  // ------------------------- LISTA DE QUADROS -------------------------
  if lista-quadros {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[#lbl-lista-qua])
    v(1.5em)
    outline(title: none, target: figure.where(kind: "quadro"))
  }

  // ------------------------- LISTA DE TABELAS -------------------------
  if lista-tabelas {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[#lbl-lista-tab])
    v(1.5em)
    outline(title: none, target: figure.where(kind: table))
  }

  // --------------- LISTA DE ABREVIATURAS E SIGLAS ---------------------
  if siglas != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    align(center, text(weight: "bold")[#lbl-siglas])
    v(1.5em)
    siglas
  }

  // ----------------------- LISTA DE SÍMBOLOS --------------------------
  if simbolos != none {
    pagebreak()
    set par(first-line-indent: 0pt, leading: entrelinha-simples)
    align(center, text(weight: "bold")[#lbl-simbolos])
    v(1.5em)
    simbolos
  }

  // ------------------------------ SUMÁRIO -----------------------------
  if incluir-sumario {
    pagebreak()
    set par(first-line-indent: 0pt)
    align(center, text(weight: "bold")[#lbl-sumario])
    v(1.5em)
    outline(title: none, indent: auto)
  } else if not tem-pre-textual {
    v(1.5em)
  }

  // -------------------------- PARTE TEXTUAL ---------------------------
  doc-phase.update("textual")
  if romano-pre-textual and tem-pre-textual {
    counter(page).update(1)
  }
  set page(columns: colunas)
  // `all: true`: a ABNT recua também o primeiro parágrafo após um título.
  set par(first-line-indent: (amount: recuo, all: true))
  body
}
