import { test, expect } from '@playwright/test';
import { modelsPanel, openNewProjectDialog } from './helpers';

test.describe('RedijaApp: Jornada Completa do Estudante', () => {
  test.beforeEach(async ({ page }) => {
    // Aceita automaticamente qualquer alerta nativo e silencia modal de boas-vindas do beta durante testes E2E
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });

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
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();

    // 2. Confirma que o cabeçalho carregou
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // 3. Na Home, abre o diálogo "Novo trabalho acadêmico"
    await openNewProjectDialog(page);

    // 4. Cria trabalho com modelo TCC (NBR 14724)
    const nameInput = page.getByPlaceholder(/Ex: TCC Engenharia/i);
    await nameInput.fill('TCC de Inteligência Artificial 2026');
    await modelsPanel(page).getByRole('button', { name: /Trabalho de Conclusão de Curso/ }).click();

    // 5. Confirma que o novo trabalho está ativo no cabeçalho
    await expect(page.getByText('TCC de Inteligência Artificial 2026')).toBeVisible();

    // 6. Preenche dados da Capa e Folha de Rosto na aba lateral
    const authorInput = page.getByPlaceholder(/Ex: Nome do Autor/i);
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

    // Testa minimizar a Estrutura pelo próprio painel e restaurá-la pela barra lateral
    await page.getByRole('button', { name: 'Minimizar painel Estrutura' }).click();
    await expect(page.getByPlaceholder(/Ex: Nome do Autor/i)).not.toBeVisible();
    await page.getByRole('button', { name: 'Mostrar painel Estrutura' }).click();
    await expect(page.getByPlaceholder(/Ex: Nome do Autor/i)).toBeVisible();

    // 10. Testa o botão Baixar: só o ícone, abre o menu com os formatos (incluindo .docx)
    const downloadBtn = page.getByRole('button', { name: 'Baixar trabalho' });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
    await expect(downloadBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: /PDF \(\.pdf\)/ })).toBeEnabled();
    const docxBtn = page.getByRole('button', { name: /Baixar \.docx/i });
    await expect(docxBtn).toBeVisible();
    await expect(page.getByRole('button', { name: /Projeto completo \(\.zip\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Código Typst \(\.typ\)/ })).toBeVisible();

    // 11. Clica em "Baixar .docx", valida o arquivo baixado e o aviso de primeira conversão
    const downloadPromise = page.waitForEvent('download');
    await docxBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('TCC de Inteligência Artificial 2026.docx');
    await expect(
      page.getByText(/O \.docx é uma conversão\. O PDF continua sendo a versão de referência/i),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Não mostrar novamente' })).toBeVisible();
  });

  test('abre modal de personalização de normas (Template Customizer)', async ({ page }) => {
    // Entra como convidado
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();

    // Aguarda o modal inicial de projetos carregar
    const modalHeading = await openNewProjectDialog(page);

    // Cria um trabalho com nome único para inicializar a sessão
    await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Projeto Customizer ${Date.now()}`);
    await modelsPanel(page).getByRole('button', { name: /Trabalho de Conclusão de Curso/ }).click();

    // Garante que o modal fechou completamente e o cabeçalho está ativo
    await expect(modalHeading).not.toBeVisible();
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // Abre o modal de Norma & Layout a partir do topo da barra de estrutura
    const customizerOption = page.getByRole('button', {
      name: 'Norma & Layout',
      exact: true,
    });
    await expect(customizerOption).toBeVisible();
    await customizerOption.click();

    // Valida que o modal de personalização abriu com opções de layout e normas
    await expect(
      page.getByText('Personalizar Norma, Template e Layout da Faculdade'),
    ).toBeVisible();
    await expect(page.getByText(/Escolha um Padrão de Layout/i)).toBeVisible();
  });
});
