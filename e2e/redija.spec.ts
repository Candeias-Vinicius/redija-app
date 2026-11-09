import { test, expect } from '@playwright/test';

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

    // Se o modal de projetos não abriu automaticamente (ex: primeiro acesso sem projetos), abre pelo cabeçalho
    const projectsModalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    try {
      await projectsModalHeading.waitFor({ state: 'visible', timeout: 3500 });
    } catch {
      await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
      await expect(projectsModalHeading).toBeVisible();
    }

    // Cria um novo projeto a partir do modelo de Artigo Científico
    await page.getByText('Artigo Científico').click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('Artigo E2E Teste');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Confirma que o novo projeto está ativo no cabeçalho e botão Baixar PDF está visível no preview
    await expect(page.getByText('Artigo E2E Teste')).toBeVisible();
    await expect(page.getByRole('button', { name: /Baixar PDF/i })).toBeVisible();

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
