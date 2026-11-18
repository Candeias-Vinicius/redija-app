import { test, expect } from '@playwright/test';
import { createProject } from './helpers';

test.describe('RedijaApp: Fluxo Principal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Silencia modal de boas-vindas do beta durante os testes do fluxo principal
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });
  });

  test('exibe a tela de login, entra como convidado e interage com o editor ABNT', async ({
    page,
  }) => {
    await page.goto('/');

    // Verifica que a Landing Page carregou
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();

    // Clica para continuar como Convidado (Modo Local Offline)
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();

    // Verifica que o cabeçalho do RedijaApp carregou
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // Cria um novo projeto a partir do modelo de Artigo Científico pela Home
    await createProject(page, 'Artigo E2E Teste', /Artigo Científico/);

    // Confirma que o novo projeto está ativo no cabeçalho e o botão Baixar está visível no preview
    await expect(page.getByText('Artigo E2E Teste')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar trabalho' })).toBeVisible();

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
