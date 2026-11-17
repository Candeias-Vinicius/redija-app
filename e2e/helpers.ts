import { expect, type Page } from '@playwright/test';

/** Painel "Todos os modelos" da Home (aberto por "Ver todos os modelos" ou "Mais modelos"). */
export function modelsPanel(page: Page) {
  return page.getByRole('region', { name: 'Todos os modelos' });
}

/**
 * Abre o painel "Todos os modelos" na Home. Se estiver no editor, volta antes para a Home.
 * Retorna o título do painel para as asserções.
 */
export async function openNewProjectDialog(page: Page) {
  const backButton = page.getByRole('button', { name: 'Voltar para Meus trabalhos' });
  if (await backButton.isVisible().catch(() => false)) {
    await backButton.click();
  }
  const heading = page.getByRole('heading', { name: 'Todos os modelos' });
  if (!(await heading.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Ver todos os modelos' }).click();
  }
  await expect(heading).toBeVisible();
  return heading;
}

/**
 * Cria um trabalho pelo painel de modelos: digita o nome e clica no modelo
 * (o clique já cria e abre o editor). Sem modelo, usa o TCC.
 */
export async function createProject(
  page: Page,
  name: string,
  templateLabel: RegExp | string = /Trabalho de Conclusão de Curso/,
) {
  const heading = await openNewProjectDialog(page);
  await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(name);
  await modelsPanel(page).getByRole('button', { name: templateLabel }).first().click();
  await expect(heading).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar para Meus trabalhos' })).toBeVisible();
}

/** Volta do editor para a Home. */
export async function goHome(page: Page) {
  await page.getByRole('button', { name: 'Voltar para Meus trabalhos' }).click();
  await expect(page.getByRole('tablist', { name: 'Filtrar trabalhos' })).toBeVisible();
}
