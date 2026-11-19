import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

/**
 * Importação pela Home. Só formatos locais (.redija, .json e .zip do Redija): o serviço de
 * conversão (.docx/.tex/.typ/.md) não roda no e2e, e o transporte dele tem testes unitários
 * (src/core/storage/__tests__/importServiceClient.test.ts).
 */

/** Backup no formato `.redija` (o mesmo de serializeBackup). */
function redijaBackup(name: string, paragraph: string): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      name,
      templateType: 'artigo',
      metadata: { title: name, author: 'Estudante E2E' },
      blocks: [
        { id: 'h1', type: 'h1', content: 'Introdução' },
        { id: 'p1', type: 'paragraph', content: paragraph },
      ],
      references: [],
    },
  });
}

const importInput = (page: Page) => page.locator('input[type="file"][accept*=".zip"]');
const progressDialog = (page: Page) => page.getByRole('dialog', { name: 'Importando arquivo' });

async function expectEditorWith(page: Page, name: string, paragraph: string) {
  await expect(page.getByRole('button', { name: 'Voltar para Meus trabalhos' })).toBeVisible();
  await expect(page.getByText(paragraph)).toBeVisible();
  await expect(page.getByText(`"${name}" foi importado.`)).toBeVisible();
  await expect(progressDialog(page)).toHaveCount(0);
}

test.describe('Importação de arquivos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: /Experimentar como Convidado/i })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'Ver todos os modelos' })).toBeVisible();
  });

  test('abre o .zip exportado pelo Redija mesmo recompactado no macOS (com __MACOSX)', async ({
    page,
  }) => {
    const zip = new JSZip();
    // O Finder grava o "._" (AppleDouble) do .redija, que também termina em .redija
    zip.file('__MACOSX/meu_tcc/._meu_tcc.redija', new Uint8Array([0, 5, 22, 7, 0, 2, 0, 0]));
    zip.file(
      'meu_tcc/meu_tcc.redija',
      redijaBackup('TCC Recompactado', 'Parágrafo vindo do .zip.'),
    );
    zip.file('meu_tcc/.DS_Store', 'lixo do Finder');

    await importInput(page).setInputFiles({
      name: 'meu_tcc.zip',
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });

    await expectEditorWith(page, 'TCC Recompactado', 'Parágrafo vindo do .zip.');
  });

  test('aceita o backup salvo como .json', async ({ page }) => {
    await importInput(page).setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(redijaBackup('Backup em JSON', 'Parágrafo do backup.')),
    });

    await expectEditorWith(page, 'Backup em JSON', 'Parágrafo do backup.');
  });

  test('explica um .zip corrompido e continua na Home', async ({ page }) => {
    await importInput(page).setInputFiles({
      name: 'projeto.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('%PDF-1.7 isto não é um zip'),
    });

    await expect(page.getByRole('alert')).toContainText('O arquivo não é um .zip válido');
    await expect(progressDialog(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver todos os modelos' })).toBeVisible();
  });

  test('explica um arquivo vazio', async ({ page }) => {
    await importInput(page).setInputFiles({
      name: 'vazio.redija',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(0),
    });

    await expect(page.getByRole('alert')).toContainText('O arquivo está vazio (0 bytes)');
    await expect(page.getByRole('button', { name: 'Ver todos os modelos' })).toBeVisible();
  });
});
