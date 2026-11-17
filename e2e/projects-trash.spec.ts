import { test, expect } from '@playwright/test';

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
    // Entra como convidado
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
  });

  test('cria múltiplos projetos, alterna entre eles e valida integridade no cabeçalho', async ({
    page,
  }) => {
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });

    // 1. Cria primeiro projeto: Artigo de Robótica
    await expect(modalHeading).toBeVisible();
    await page.getByText('Artigo Científico').click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('Artigo de Robótica 2026');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Artigo de Robótica 2026')).toBeVisible();

    // 2. Abre modal novamente e cria segundo projeto: Relatório de Estágio
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();

    await page.getByText('Relatório Técnico').click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('Relatório de Estágio 2026');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Relatório de Estágio 2026')).toBeVisible();

    // 3. Alterna de volta para o Artigo de Robótica
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();

    await page.getByRole('button', { name: /Artigo de Robótica 2026/i }).first().click();
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Artigo de Robótica 2026')).toBeVisible();
  });

  test('move trabalho para a lixeira sem confirmação e desfaz pelo aviso', async ({ page }) => {
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    await expect(modalHeading).toBeVisible();

    const targetProjectName = 'Trabalho Para Desfazer';
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(targetProjectName);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();

    await page.getByTitle('Mover para a Lixeira').first().click();

    // Sem sub-modal de confirmação: vai direto para a lixeira com opção de desfazer
    await expect(page.getByText(/Mover trabalho para a Lixeira\?/i)).not.toBeVisible();
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('status')).toContainText(targetProjectName);
    await modal.getByRole('button', { name: 'Desfazer', exact: true }).click();

    await expect(modal.getByRole('button', { name: /^Lixeira \(0\)/ })).toBeVisible();
    await expect(modal.getByText(targetProjectName)).toBeVisible();
  });

  test('move trabalho para a lixeira e restaura com segurança', async ({ page }) => {
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    await expect(modalHeading).toBeVisible();

    // Cria projeto para teste de exclusão
    const targetProjectName = 'Trabalho Temporário Descartável';
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(targetProjectName);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText(targetProjectName)).toBeVisible();

    // Abre modal de projetos para mover para a lixeira
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();

    // Clica no botão de lixeira do projeto alvo (move na hora, sem confirmação)
    await page.getByTitle('Mover para a Lixeira').first().click();

    // Fecha o aviso de "Desfazer" para validar só a lista da Lixeira
    const modal = page.getByRole('dialog');
    await modal.getByTitle('Fechar aviso').click();

    // Acessa a aba da Lixeira no modal (ex: "Lixeira (1)")
    await modal.getByRole('button', { name: /^Lixeira \(/ }).click();

    // Valida que o trabalho está na Lixeira com aviso de retenção de 30 dias
    await expect(modal.getByText(targetProjectName)).toBeVisible();
    await expect(modal.getByText(/Expira em \d+ dias/i)).toBeVisible();

    // Restaura o trabalho da lixeira
    await modal.getByRole('button', { name: /Restaurar/i }).click();

    // Volta para a aba de Trabalhos Salvos e confirma restauração
    await modal.getByRole('button', { name: /^Trabalhos Salvos \(/ }).click();
    await expect(modal.getByText(targetProjectName)).toBeVisible();
  });
});
