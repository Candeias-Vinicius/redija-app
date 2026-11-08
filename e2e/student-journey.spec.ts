import { test, expect } from '@playwright/test';

test.describe('RedijaApp: Jornada Completa do Estudante', () => {
  test.beforeEach(async ({ page }) => {
    // Aceita automaticamente qualquer alerta nativo
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Inicia na landing page
    await page.goto('/');
  });

  test('conclui fluxo de criação de TCC, edição de metadados, digitação e preview Typst', async ({
    page,
  }) => {
    // 1. Verifica landing page e entra como convidado
    await expect(page.getByText(/O Redija cuida de toda a ABNT/i)).toBeVisible();
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();

    // 2. Confirma que o cabeçalho carregou
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // 3. Se o modal de projetos não abrir automaticamente, abre pelo cabeçalho
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    if (!(await modalHeading.isVisible())) {
      await page.getByTitle('Alternar ou criar trabalho acadêmico').click();
    }
    await expect(modalHeading).toBeVisible();

    // 4. Cria trabalho com modelo TCC (NBR 14724)
    await page.getByText('Trabalho de Conclusão de Curso (TCC)').click();
    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('TCC de Inteligência Artificial 2026');
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // 5. Confirma que o novo trabalho está ativo no cabeçalho
    await expect(page.getByText('TCC de Inteligência Artificial 2026')).toBeVisible();

    // 6. Preenche dados da Capa e Folha de Rosto na aba lateral
    const authorInput = page.getByPlaceholder(/Ex: Vinícius Candeias/i);
    await authorInput.fill('Carlos Alberto Santos');

    const titleInput = page.getByPlaceholder(/Ex: Análise da Eficiência Energética/i);
    await titleInput.fill('Impacto dos Modelos de Linguagem na Automação');

    // 7. Escreve parágrafo no editor de texto (TipTap ProseMirror)
    const editorArea = page.locator('.tiptap.ProseMirror').first();
    await editorArea.click();
    await page.keyboard.type(' Este parágrafo foi inserido automaticamente pelo teste E2E.');

    // 8. Alterna para visualização do código Typst gerado
    await page.getByRole('button', { name: /Ver Typst/i }).click();

    // Valida que o código Typst inclui o novo título e o show rule da ABNT
    const codeViewer = page.locator('pre');
    await expect(codeViewer).toContainText('#show: abnt.with');
    await expect(codeViewer).toContainText('Impacto dos Modelos de Linguagem');

    // 9. Volta para o preview visual e testa alternadores de painéis (Estrutura, Texto, PDF)
    await page.getByRole('button', { name: /Ver PDF/i }).click();

    // Testa ocultar e reabrir barra de estrutura com exact match
    await page.getByRole('button', { name: 'Estrutura', exact: true }).click();
    await expect(page.getByPlaceholder(/Ex: Vinícius Candeias/i)).not.toBeVisible();
    await page.getByRole('button', { name: 'Estrutura', exact: true }).click();
    await expect(page.getByPlaceholder(/Ex: Vinícius Candeias/i)).toBeVisible();

    // 10. Testa o botão de Baixar PDF
    const downloadBtn = page.getByRole('button', { name: /Baixar PDF/i });
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
  });

  test('abre modal de personalização de normas (Template Customizer)', async ({ page }) => {
    // Entra como convidado
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();

    // Aguarda o modal inicial de projetos carregar
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    await expect(modalHeading).toBeVisible();

    // Cria um trabalho com nome único para inicializar a sessão
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Projeto Customizer ${Date.now()}`);
    await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();

    // Garante que o modal fechou completamente e o cabeçalho está ativo
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // Abre o menu de Ferramentas no cabeçalho
    const toolsBtn = page.getByRole('button', { name: /Ferramentas/i });
    await expect(toolsBtn).toBeVisible();
    await toolsBtn.click();

    // Clica na opção "Norma & Layout" dentro do menu de ferramentas
    const customizerOption = page.getByRole('button', { name: /Norma & Layout ABNT, APA/i });
    await expect(customizerOption).toBeVisible();
    await customizerOption.click();

    // Valida que o modal de personalização abriu com opções de layout e normas
    await expect(
      page.getByText('Personalizar Norma, Template e Layout da Faculdade'),
    ).toBeVisible();
    await expect(page.getByText(/Escolha um Padrão de Norma/i)).toBeVisible();
  });
});
