import { test, expect } from '@playwright/test';

test.describe('RedijaApp — Fluxo Principal E2E', () => {
  test('exibe a tela de login, entra como convidado e interage com o editor ABNT', async ({
    page,
  }) => {
    await page.goto('/');

    // Verifica que a Tela Inicial / Landing carregou
    await expect(page.getByText(/O Redija cuida de toda a ABNT/i)).toBeVisible();

    // Clica para continuar como Convidado
    await page.getByText(/Continuar como Convidado/i).first().click();

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

  test('conecta em modo demonstração e acessa recursos de nuvem e compartilhamento', async ({
    page,
  }) => {
    await page.goto('/');

    // Clica no modo demonstração na tela de login se visível
    const devBtn = page.getByRole('button', { name: /Entrar em Modo Demonstração/i });
    if (await devBtn.isVisible()) {
      await devBtn.click();

      // Confirma que entrou e o status de Drive está visível
      await expect(page.getByText(/Salvo no Drive/i)).toBeVisible();

      // Clica em Compartilhar
      await page.getByRole('button', { name: /Compartilhar/i }).click();
      await expect(page.getByText('Compartilhar Trabalho')).toBeVisible();
      await expect(page.getByText('Pessoas com acesso')).toBeVisible();
    }
  });
});
