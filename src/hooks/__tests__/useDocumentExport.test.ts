import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { exportTypstProjectZip } from '@/core/transpiler/projectExporter';
import { triggerBlobDownload } from '@/core/typst/projectCompiler';
import { toast } from '@/components/ui/toastStore';
import { downloadProjectZip, PROJECT_ZIP_EXPORT_ERROR_MESSAGE } from '../useDocumentExport';

vi.mock('@/core/transpiler/projectExporter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/transpiler/projectExporter')>()),
  exportTypstProjectZip: vi.fn(),
}));

// O compilador real carrega o Web Worker do Typst; aqui só interessa o download
vi.mock('@/core/typst/projectCompiler', () => ({
  compileProjectToPdf: vi.fn(),
  triggerBlobDownload: vi.fn(),
}));

const exportZip = vi.mocked(exportTypstProjectZip);
const download = vi.mocked(triggerBlobDownload);

describe('downloadProjectZip (exportar projeto Typst .zip)', () => {
  const project = createProjectFromTemplate('tcc', 'Meu TCC');
  let toastError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    exportZip.mockReset();
    download.mockReset();
  });

  it('baixa o pacote com o nome do projeto e não mostra erro', async () => {
    const blob = new Blob(['zip']);
    exportZip.mockResolvedValue(blob);

    await expect(downloadProjectZip(project)).resolves.toBe(true);

    expect(download).toHaveBeenCalledWith(blob, 'meu_tcc_typst.zip');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('avisa o usuário com "Tentar novamente" quando a exportação falha', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Corrupted zip');
    exportZip.mockRejectedValue(failure);
    const onRetry = vi.fn();

    await expect(downloadProjectZip(project, { onRetry })).resolves.toBe(false);

    expect(download).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Erro ao exportar pacote do projeto:', failure);
    expect(toastError).toHaveBeenCalledTimes(1);
    const [message, options] = toastError.mock.calls[0];
    expect(message).toBe(PROJECT_ZIP_EXPORT_ERROR_MESSAGE);
    expect(options).toMatchObject({ action: { label: 'Tentar novamente' } });

    options.action.onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sem onRetry, "Tentar novamente" repete a exportação e baixa o pacote', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const blob = new Blob(['zip']);
    exportZip.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(blob);

    await downloadProjectZip(project);
    const [, options] = toastError.mock.calls[0];
    options.action.onClick();

    await vi.waitFor(() => expect(download).toHaveBeenCalledWith(blob, 'meu_tcc_typst.zip'));
    expect(exportZip).toHaveBeenCalledTimes(2);
  });
});
