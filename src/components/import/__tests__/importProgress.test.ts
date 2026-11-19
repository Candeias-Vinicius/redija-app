import { describe, expect, it } from 'vitest';
import {
  ImportCancelledError,
  ImportFailure,
  ImportServiceUnavailableError,
} from '@/core/storage/documentImporter';
import {
  describeImportError,
  describeImportProgress,
  formatImportWarnings,
  progressKey,
  progressPercent,
} from '../importProgress';

const MB = 1024 * 1024;

describe('describeImportProgress', () => {
  it('mostra porcentagem e quantidade enviada durante o envio', () => {
    expect(describeImportProgress({ stage: 'uploading', loaded: 54 * MB, total: 120 * MB })).toEqual({
      label: 'Enviando o arquivo para conversão…',
      percent: 45,
      detail: '54,0 MB de 120,0 MB',
      hint: 'Arquivos grandes, com muitas imagens, podem levar alguns minutos.',
      cancellable: true,
    });
  });

  it('usa barra indeterminada quando a etapa não tem como medir', () => {
    const converting = describeImportProgress({ stage: 'converting' });
    expect(converting.percent).toBeNull();
    expect(converting.label).toBe('Convertendo o documento…');
    expect(describeImportProgress({ stage: 'downloading', loaded: 10 }).percent).toBeNull();
  });

  it('mostra a porcentagem da descompactação local', () => {
    expect(describeImportProgress({ stage: 'extracting', percent: 37.8 })).toMatchObject({
      label: 'Descompactando…',
      percent: 37,
    });
  });

  it('não deixa cancelar depois que o projeto foi gravado', () => {
    expect(describeImportProgress({ stage: 'saving' }).cancellable).toBe(false);
    expect(describeImportProgress({ stage: 'opening' })).toMatchObject({
      label: 'Abrindo o trabalho…',
      cancellable: false,
    });
    expect(describeImportProgress({ stage: 'building' }).cancellable).toBe(true);
  });
});

describe('progressKey / progressPercent', () => {
  it('só muda quando a etapa ou o ponto percentual mudam (evita re-render a cada evento)', () => {
    const at = (loaded: number) => progressKey({ stage: 'uploading', loaded, total: 1000 });
    expect(at(101)).toBe(at(109));
    expect(at(101)).not.toBe(at(111));
    expect(progressKey({ stage: 'converting' })).not.toBe(progressKey({ stage: 'building' }));
  });

  it('limita a 0–100', () => {
    expect(progressPercent({ stage: 'extracting', percent: 140 })).toBe(100);
    expect(progressPercent({ stage: 'uploading', loaded: 5, total: 0 })).toBeNull();
  });
});

describe('describeImportError', () => {
  it('cancelamento não é erro', () => {
    expect(describeImportError(new ImportCancelledError())).toBeNull();
  });

  it('usa a mensagem e a possibilidade de nova tentativa dos erros de importação', () => {
    expect(describeImportError(new ImportServiceUnavailableError('Fora do ar.'))).toEqual({
      message: 'Fora do ar.',
      retriable: true,
    });
    expect(describeImportError(new ImportFailure('O .zip está vazio.'))).toEqual({
      message: 'O .zip está vazio.',
      retriable: false,
    });
  });

  it('não mostra detalhes técnicos de erros inesperados', () => {
    const description = describeImportError(new TypeError("Cannot read properties of undefined (reading 'blocks')"));
    expect(description?.message).toMatch(/^Não foi possível importar o arquivo/);
    expect(description?.message).not.toMatch(/undefined/);
  });

  it('explica falta de espaço no navegador ao salvar', () => {
    const description = describeImportError(new DOMException('quota', 'QuotaExceededError'));
    expect(description).toMatchObject({ retriable: true });
    expect(description?.message).toMatch(/Não há espaço no navegador/);
  });
});

describe('formatImportWarnings', () => {
  it('sem avisos, nada a mostrar', () => {
    expect(formatImportWarnings([])).toBeNull();
  });

  it('remove repetições e resume listas longas', () => {
    const warnings = [
      'Imagem não encontrada no upload: a.png',
      'Imagem não encontrada no upload: a.png',
      ...Array.from({ length: 6 }, (_, i) => `Formato de imagem não suportado: fig${i}.pdf`),
    ];
    const text = formatImportWarnings(warnings)!;
    expect(text.split('\n')).toEqual([
      'Alguns itens não puderam ser importados:',
      '• Imagem não encontrada no upload: a.png',
      '• Formato de imagem não suportado: fig0.pdf',
      '• Formato de imagem não suportado: fig1.pdf',
      '• Formato de imagem não suportado: fig2.pdf',
      '• Formato de imagem não suportado: fig3.pdf',
      '• e mais 2 avisos.',
    ]);
  });
});
