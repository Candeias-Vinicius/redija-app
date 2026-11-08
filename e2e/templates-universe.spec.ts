import { test, expect, Page } from '@playwright/test';

async function ensureProjectsModal(page: Page) {
  const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
  try {
    await modalHeading.waitFor({ state: 'visible', timeout: 3500 });
  } catch {
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();
  }
  return modalHeading;
}

test.describe('RedijaApp: Templates SBC, IEEE, Pôster A0 e Typst Universe E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Aceita diálogos nativos automaticamente
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/');
    // Entra como convidado
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
  });

  test('cria projeto com modelo SBC e valida show rule sbc.with no código Typst', async ({ page }) => {
    const modalHeading = await ensureProjectsModal(page);

    // Seleciona template SBC
    await page.getByRole('button', { name: /Artigo SBC/i }).click();
    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('Artigo SBC E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Valida que o projeto está ativo no cabeçalho
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Artigo SBC E2E')).toBeVisible();

    // Alterna para o código Typst gerado
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#show: sbc-article.with');
    await expect(codeViewer).toContainText('sbc.typ');
  });

  test('cria projeto com modelo IEEE e valida show rule ieee.with no código Typst', async ({ page }) => {
    const modalHeading = await ensureProjectsModal(page);

    // Seleciona template IEEE
    await page.getByRole('button', { name: /Artigo IEEE Conference/i }).click();
    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('Artigo IEEE E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Valida que o projeto está ativo
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Artigo IEEE E2E')).toBeVisible();

    // Alterna para o código Typst gerado
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#show: ieee-article.with');
    await expect(codeViewer).toContainText('ieee.typ');
  });

  test('cria projeto com Pôster Acadêmico A0 e valida caixas poster-box no Typst', async ({ page }) => {
    const modalHeading = await ensureProjectsModal(page);

    // Seleciona template Pôster Acadêmico A0
    await page.getByRole('button', { name: /Pôster Acadêmico A0/i }).click();
    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('Banner Simposio E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Valida que o projeto está ativo
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Banner Simposio E2E')).toBeVisible();

    // Alterna para o código Typst gerado
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#show: academic-poster.with');
    await expect(codeViewer).toContainText('poster.typ');
  });

  test('cria projeto com pacote Typst Universe customizado', async ({ page }) => {
    const modalHeading = await ensureProjectsModal(page);

    // Seleciona template Typst Universe pelo role button
    await page.getByRole('button', { name: /Typst Universe \(Template/i }).click();

    // Valida que o campo de pacote do Typst Universe apareceu
    await expect(page.getByText('Pacote Typst Universe:')).toBeVisible();

    // Preenche o identificador do pacote oficial
    await page.getByPlaceholder('Ex: @preview/charged-ieee:0.1.1').fill('@preview/charged-ieee:0.1.1');

    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('Artigo Universe E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Valida que o projeto está ativo
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Artigo Universe E2E')).toBeVisible();

    // Alterna para o código Typst gerado
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('@preview/charged-ieee');
  });

  test('configura parâmetros avançados de Pôster no Template Customizer', async ({ page }) => {
    const modalHeading = await ensureProjectsModal(page);
    // Cria projeto inicial
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Projeto Pôster Custom ${Date.now()}`);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    // Abre o Template Customizer
    const customizerBtn = page.getByRole('button', {
      name: 'Layout das Referências e Citações (Norma & Layout)',
      exact: true,
    });
    await expect(customizerBtn).toBeVisible();
    await customizerBtn.click();

    // Valida abertura do modal
    await expect(page.getByText('Personalizar Norma, Template e Layout da Faculdade')).toBeVisible();

    // Seleciona o preset Pôster Acadêmico A0
    await page.getByRole('button', { name: /Pôster Acadêmico A0 \(Banner\)/i }).click();

    // Valida que as opções de Pôster estão visíveis
    await expect(page.getByText(/Configurações de Pôster Acadêmico/i)).toBeVisible();
    await expect(page.getByText('Tamanho do Pôster')).toBeVisible();
    await expect(page.getByText('Orientação do Banner')).toBeVisible();
    await expect(page.getByText('Número de Colunas no Pôster')).toBeVisible();

    // Aplica configurações
    await page.getByRole('button', { name: /Aplicar e Atualizar PDF/i }).click();
    await expect(page.getByText('Personalizar Norma, Template e Layout da Faculdade')).not.toBeVisible();
  });
});
