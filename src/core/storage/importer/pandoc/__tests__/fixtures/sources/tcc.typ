#import "@preview/abnt-ufpe:0.1.0": tcc
#show: tcc.with(
  titulo: "Trabalho em Typst",
  autor: "Pedro Alves",
  orientador: "Profa. Dra. Lúcia",
  instituicao: "UFPE",
  ano: "2025",
)

= Introdução
Um parágrafo com *negrito* e _itálico_ e $x^2 + 1$.

$ sum_(i=1)^n i = (n(n+1))/2 $

== Subseção
- item um
- item dois

#figure(
  table(columns: 2, [A], [B], [1], [2]),
  caption: [Tabela simples],
)
