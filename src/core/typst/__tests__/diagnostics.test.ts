import { describe, it, expect } from 'vitest';
import { formatTypstDiagnostic, filterErrors, type TypstDiagnostic } from '../diagnostics';

describe('formatTypstDiagnostic', () => {
  it('traduz delimitador não fechado para mensagem amigável em português', () => {
    const raw: TypstDiagnostic = {
      package: '',
      path: '/main.typ',
      severity: 'error',
      range: '12:5-12:10',
      message: 'unclosed delimiter',
    };

    const result = formatTypstDiagnostic(raw);
    expect(result.severity).toBe('error');
    expect(result.location).toBe('Documento (linha 12:5-12:10)');
    expect(result.message).toContain('Delimitador não fechado');
  });

  it('identifica diagnósticos originados no modelo ABNT', () => {
    const raw: TypstDiagnostic = {
      package: '',
      path: '/abnt.typ',
      severity: 'warning',
      range: '15:1',
      message: 'unknown font family: NonExistentFont',
    };

    const result = formatTypstDiagnostic(raw);
    expect(result.severity).toBe('warning');
    expect(result.location).toBe('Modelo ABNT (linha 15:1)');
    expect(result.message).toContain('Família de fonte não encontrada: NonExistentFont');
  });

  it('filtra apenas erros fatais em filterErrors', () => {
    const list: TypstDiagnostic[] = [
      {
        package: '',
        path: '/main.typ',
        severity: 'warning',
        range: '1:1',
        message: 'unknown font family: Foo',
      },
      {
        package: '',
        path: '/main.typ',
        severity: 'error',
        range: '8:2',
        message: 'unknown variable: bar',
      },
    ];

    const errors = filterErrors(list);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Variável ou símbolo desconhecido no Typst: bar');
  });
});
