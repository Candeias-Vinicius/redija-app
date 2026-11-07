import { test, expect } from '@playwright/test';

test.describe('RedijaApp — Fluxo Principal E2E', () => {
  test('carrega o editor ABNT, gerencia projetos e renderiza o preview Typst WASM', async ({
    page,
  }) => {
    await page.goto('/');

    // Verifica que o cabeçalho do RedijaApp carregou
    await expect(page.getByText('Redija')).toBeVisible();
    await expect(page.getByRole('button', { name: /Baixar PDF/i })).toBeVisible();

    // Abre o modal de projetos clicando no nome do trabalho ativo
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(page.getByText('Meus Trabalhos Acadêmicos')).toBeVisible();

    // Cria um novo projeto a partir do modelo de Artigo Científico
    await page.getByText('Artigo Científico').click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('Artigo E2E Teste');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Confirma que o novo projeto está ativo no cabeçalho
    await expect(page.getByText('Artigo E2E Teste')).toBeVisible();

    // Alterna para visualização do código Typst gerado e verifica que contém #show: abnt.with
    await page.getByRole('button', { name: /Ver Typst/i }).click();
    await expect(page.locator('pre')).toContainText('#show: abnt.with');
  });
});
