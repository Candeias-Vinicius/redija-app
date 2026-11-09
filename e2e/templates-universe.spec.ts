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

  test('adapta aba lateral ao template SBC (oculta Pré-Textuais e Guia ABNT) e entra em modo ABNT Modificado ao customizar TCC', async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });
    const modalHeading = await ensureProjectsModal(page);

    // 1. Cria artigo SBC e verifica adaptação imediata da aba lateral
    await page.getByRole('button', { name: /Artigo SBC/i }).click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('SBC Adaptativo E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByText('Artigo SBC', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Pré-Textuais & Listas')).not.toBeVisible();
    await expect(sidebar.getByText('Guia de Normas ABNT')).not.toBeVisible();
    await expect(sidebar.getByText('Manual de Submissão SBC')).toBeVisible();
    await expect(sidebar.getByText(/Verificador SBC \(\d+\)/)).toBeVisible();

    // 2. Cria TCC e aplica formatação customizada para validar ABNT Modificado
    await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    await expect(modalHeading).toBeVisible();
    await page.getByText('Trabalho de Conclusão de Curso (TCC)').click();
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill('TCC Modificado E2E');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    await expect(sidebar.getByText('NBR 14724', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Guia de Normas ABNT')).toBeVisible();

    // Personaliza a capa para mudar preset de abnt_classic -> custom
    await sidebar
      .getByRole('button', {
        name: 'Layout das Referências e Citações (Norma & Layout)',
        exact: true,
      })
      .click();
    await page.getByLabel(/Gerar Capa \(NBR 14724\)/i).uncheck();
    await page.getByRole('button', { name: /Aplicar e Atualizar PDF/i }).click();

    await expect(sidebar.getByText('ABNT Modificado', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Verificador ABNT (Pausado)')).toBeVisible();
    await expect(sidebar.getByText('Guia de Normas ABNT')).toBeVisible();
  });

  test('personaliza campos da barra lateral e restaura padrão do modelo com zero perda de dados', async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });
    const modalHeading = await ensureProjectsModal(page);
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`TCC Campos ${Date.now()}`);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByText('NBR 14724', { exact: true })).toBeVisible();
    await expect(sidebar.getByText(/Coorientador\(a\)/)).toBeVisible();

    // Abre Personalizar Campos e oculta Coorientador(a)
    await sidebar.getByRole('button', { name: /Personalizar Campos/i }).click();
    await expect(page.getByText('Personalizar Campos da Barra Lateral')).toBeVisible();
    await page.getByLabel(/Coorientador\(a\)/).uncheck();
    await page.getByRole('button', { name: /Salvar Campos/i }).click();

    await expect(sidebar.getByText('ABNT Modificado', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Verificador ABNT (Pausado)')).toBeVisible();
    await expect(sidebar.getByText(/Coorientador\(a\)/)).not.toBeVisible();

    // Restaura padrão do modelo
    await sidebar.getByRole('button', { name: /Personalizar Campos/i }).click();
    await page.getByRole('button', { name: /Restaurar Padrão do Modelo/i }).click();

    await expect(sidebar.getByText('NBR 14724', { exact: true })).toBeVisible();
    await expect(sidebar.getByText(/Coorientador\(a\)/)).toBeVisible();
  });

  test('configura Central Universal de Citações/Referências e fonte CDN no Typst gerado', async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });
    const modalHeading = await ensureProjectsModal(page);
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Artigo Central ${Date.now()}`);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
    await expect(modalHeading).not.toBeVisible();

    await page
      .getByRole('button', {
        name: 'Layout das Referências e Citações (Norma & Layout)',
        exact: true,
      })
      .click();

    await page.locator('#template-font-family').selectOption('inter');
    await page.locator('#template-citation-format').selectOption('ieee_numeric');
    await page.locator('#template-reference-alignment').selectOption('justify');
    await page.locator('#template-reference-spacing').selectOption('compact');
    await page.locator('#template-reference-highlight').selectOption('underline');

    // Prévia instantânea reflete configuração selecionada
    await expect(page.getByText(/Prévia Instantânea de Citação/i)).toBeVisible();
    await expect(page.getByText(/Justificada • Espaço Compacto/i)).toBeVisible();

    await page.getByRole('button', { name: /Aplicar e Atualizar PDF/i }).click();

    await page.getByRole('button', { name: /Ver Typst/i }).click();
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('fonte: ("Inter"');
    await expect(codeViewer).toContainText('alinhamento: "justify"');
    await expect(codeViewer).toContainText('espacamento: 0.5em');
    await expect(codeViewer).toContainText('numeracao: "bracket"');
  });
});
