import { test, expect } from '@playwright/test';

test.describe('RedijaApp — Épico 9 (RDJ-09): Do TCC aos Slides de Defesa e Pôster em 1 Clique', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
  });

  test('gera slides de defesa em 1 clique a partir do TCC, edita tema/proporção, insere figura do trabalho e compila no Typst WASM', async ({
    page,
  }) => {
    // 1. Cria um projeto TCC inicial na HomePage
    await page.getByRole('button', { name: /Ver todos os modelos/i }).click();
    await page.getByPlaceholder(/Se deixar em branco/i).fill('TCC Defesa E2E');
    await page.getByRole('button', { name: /Monografia \/ TCC/i }).first().click();
    await expect(page.getByText('TCC Defesa E2E')).toBeVisible();

    // 2. Clica em "Gerar slides de defesa" na barra lateral
    const generateSlidesBtn = page.getByRole('button', { name: /Gerar slides de defesa/i }).first();
    await expect(generateSlidesBtn).toBeVisible();
    await generateSlidesBtn.click();

    // 3. Verifica que um novo projeto do tipo Apresentação foi criado e mostra o vínculo com a origem
    await expect(page.getByText('Slides de Defesa — TCC Defesa E2E')).toBeVisible();
    await expect(page.getByTestId('generated-from-banner')).toContainText(
      'Gerado a partir de TCC Defesa E2E',
    );

    // 4. Quando o projeto é uma apresentação, o botão "Gerar slides de defesa" não aparece
    await expect(page.getByRole('button', { name: /Gerar slides de defesa/i })).not.toBeVisible();

    // 5. Muda tema para Sóbrio e proporção para 4:3 (RDJ-09.5)
    await page.getByLabel('Tema dos slides').selectOption('sobrio');
    await page.getByLabel('Proporção dos slides').selectOption('4:3');

    // 6. Abre o seletor "Inserir figura do trabalho" e insere figura do TCC original (RDJ-09.4)
    await page.getByRole('button', { name: /Inserir figura do trabalho/i }).click();
    await expect(
      page.getByRole('heading', { name: /Inserir figura ou tabela do trabalho/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Inserir no slide/i }).first().click();

    // 7. Verifica o código Typst gerado para a apresentação
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#import "presentation.typ": *');
    await expect(codeViewer).toContainText('#show: defense-presentation.with');
    await expect(codeViewer).toContainText('tema: "sobrio"');
    await expect(codeViewer).toContainText('proporcao: "4-3"');
    await expect(codeViewer).toContainText('= Agradecimentos');
  });

  test('gera pôster A0 em 1 clique a partir do TCC sem avisos estruturais no linter (RDJ-09.7)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Ver todos os modelos/i }).click();
    await page.getByPlaceholder(/Se deixar em branco/i).fill('TCC Poster E2E');
    await page.getByRole('button', { name: /Monografia \/ TCC/i }).first().click();

    const generatePosterBtn = page.getByRole('button', { name: /Gerar pôster/i }).first();
    await expect(generatePosterBtn).toBeVisible();
    await generatePosterBtn.click();

    await expect(page.getByText('Pôster A0 — TCC Poster E2E')).toBeVisible();
    await expect(page.getByTestId('generated-from-banner')).toContainText(
      'Gerado a partir de TCC Poster E2E',
    );

    // No pôster, a opção "Gerar slides de defesa" não aparece (Cenário 6)
    await expect(page.getByRole('button', { name: /Gerar slides de defesa/i })).not.toBeVisible();

    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#show: academic-poster.with');
  });
});
