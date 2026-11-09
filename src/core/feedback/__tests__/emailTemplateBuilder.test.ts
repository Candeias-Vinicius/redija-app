import { describe, it, expect } from 'vitest';
import { buildFeedbackEmailContent, escapeHtml } from '../emailTemplateBuilder';

describe('emailTemplateBuilder', () => {
  it('escapa caracteres HTML perigosos (prevenção contra XSS em e-mails)', () => {
    expect(escapeHtml('<script>alert("xss")</script> & \'test\'')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#039;test&#039;',
    );
  });

  it('gera assunto, HTML escapado e versão texto para relatos de bug com diagnóstico', () => {
    const rendered = buildFeedbackEmailContent(
      {
        tipo: 'bug',
        protocolo: 'RDJ-2026-AAA111',
        categoria: 'abnt_pdf',
        remetente: 'dev@redija.app',
        assunto: 'Margem <incorreta>',
        descricao: 'Corpo com <b>tag</b>',
        projetoAtivo: 'TCC Teste',
        quantidadePrints: 2,
        diagnostico: {
          horario: '2026-11-09T04:00:00Z',
          navegador: 'Chrome',
          resolucao: '1440x900',
          temaEscuro: true,
        },
      },
      'Corpo com <b>tag</b>',
    );

    expect(rendered.subjectLine).toBe('[RedijaApp] RDJ-2026-AAA111: 🐛 Bug: Margem <incorreta>');
    expect(rendered.effectiveSender).toBe('dev@redija.app');
    expect(rendered.htmlContent).toContain('Relato de Problema / Bug');
    expect(rendered.htmlContent).toContain('Margem &lt;incorreta&gt;');
    expect(rendered.htmlContent).toContain('Corpo com &lt;b&gt;tag&lt;/b&gt;');
    expect(rendered.htmlContent).toContain('<td>Tema Escuro</td><td>Sim</td>');
    expect(rendered.textContent).toContain('Protocolo: RDJ-2026-AAA111');
    expect(rendered.textContent).toContain('Prints: 2');
  });

  it('renderiza corretamente mensagens de contato sem protocolo', () => {
    const rendered = buildFeedbackEmailContent(
      {
        tipo: 'contato',
        email: 'visitante@uni.br',
        assunto: 'Parceria',
      },
      'Olá equipe!',
    );

    expect(rendered.subjectLine).toBe('[RedijaApp] ✉️ Contato: Parceria');
    expect(rendered.htmlContent).toContain('Mensagem de Contato');
    expect(rendered.effectiveSender).toBe('visitante@uni.br');
  });
});
