import { test, expect } from '@playwright/test';
import { createProject, goHome } from './helpers';

test.describe('RedijaApp: Gestão de Projetos e Lixeira de Segurança', () => {
  test.beforeEach(async ({ page }) => {
    // Aceita diálogos nativos automaticamente e silencia modal de boas-vindas do beta durante automação
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/');
    // Entra como convidado: a Home é a tela inicial
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
    await expect(page.getByRole('tablist', { name: 'Filtrar trabalhos' })).toBeVisible();
  });

  test('cria múltiplos projetos, alterna entre eles e valida integridade no cabeçalho', async ({
    page,
  }) => {
    const header = page.locator('header');

    // 1. Cria primeiro projeto: Artigo de Robótica
    await createProject(page, 'Artigo de Robótica 2026', /Artigo Científico/);
    await expect(header.getByText('Artigo de Robótica 2026')).toBeVisible();

    // 2. Volta para a Home e cria o segundo projeto: Relatório de Estágio
    await createProject(page, 'Relatório de Estágio 2026', /Relatório Técnico/);
    await expect(header.getByText('Relatório de Estágio 2026')).toBeVisible();

    // 3. Pela Home, abre de novo o Artigo de Robótica
    await goHome(page);
    await page.getByRole('tabpanel').getByRole('heading', { name: 'Artigo de Robótica 2026' }).click();
    await expect(header.getByText('Artigo de Robótica 2026')).toBeVisible();
  });

  test('move trabalho para a lixeira sem confirmação e desfaz pelo aviso', async ({ page }) => {
    const targetProjectName = 'Trabalho Para Desfazer';
    await createProject(page, targetProjectName);
    await goHome(page);

    // Configurações do card > Mover para a Lixeira (sem sub-modal de confirmação)
    await page.getByRole('button', { name: `Configurações de ${targetProjectName}` }).click();
    await page.getByRole('button', { name: 'Mover para a Lixeira' }).click();

    const notifications = page.getByRole('region', { name: 'Notificações' });
    await expect(notifications.getByRole('status')).toContainText(targetProjectName);
    await notifications.getByRole('button', { name: 'Desfazer', exact: true }).click();

    await expect(page.getByRole('tab', { name: /Lixeira\s*0/ })).toBeVisible();
    await expect(page.getByRole('tabpanel').getByRole('heading', { name: targetProjectName })).toBeVisible();
  });

  test('move trabalho para a lixeira e restaura com segurança', async ({ page }) => {
    const targetProjectName = 'Trabalho Temporário Descartável';
    await createProject(page, targetProjectName);
    await goHome(page);

    await page.getByRole('button', { name: `Configurações de ${targetProjectName}` }).click();
    await page.getByRole('button', { name: 'Mover para a Lixeira' }).click();

    // Acessa a aba Lixeira e valida o aviso de retenção
    await page.getByRole('tab', { name: /Lixeira/ }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('heading', { name: targetProjectName })).toBeVisible();
    await expect(panel.getByText(/Expira em \d+ dias/i)).toBeVisible();

    // Restaura e confirma em Meus trabalhos
    await panel.getByRole('button', { name: /Restaurar/i }).click();
    await page.getByRole('tab', { name: /Meus trabalhos/ }).click();
    await expect(page.getByRole('tabpanel').getByRole('heading', { name: targetProjectName })).toBeVisible();
  });
});
