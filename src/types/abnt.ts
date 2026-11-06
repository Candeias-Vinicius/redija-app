/**
 * Regras e constantes de configuração ABNT (NBR 14724, NBR 6023, NBR 10520)
 */

export const ABNT_CONFIG = {
  // Margens: 3cm superior e esquerda, 2cm inferior e direita
  margins: {
    top: '3cm',
    left: '3cm',
    bottom: '2cm',
    right: '2cm',
  },
  // Fontes padrão aceitas pela ABNT
  fonts: ['Times New Roman', 'Arial'],
  fontSize: '12pt',
  fontSizeFootnote: '10pt',
  fontSizeQuoteLong: '10pt',
  // Espaçamentos
  lineSpacing: 1.5,
  lineSpacingQuoteLong: 1.0,
  // Recuo de primeira linha do parágrafo
  paragraphIndent: '1.25cm',
  // Recuo para citação direta longa (mais de 3 linhas)
  quoteLongIndent: '4cm',
};
