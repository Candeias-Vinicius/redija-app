import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { modelsPanel, openNewProjectDialog } from './helpers';
import { FakeDrive, routeUniversePackages } from './fakeDrive';

const ACCOUNT = {
  id: 'e2e_user',
  email: 'aluno.e2e@gmail.com',
  name: 'Aluno E2E',
  picture: '',
};

const TEMPLATE_NAME = 'Modelo Sincronizado';
const IMPORT_LINE = '#import "@preview/charged-ieee:0.1.4": ieee';

/**
 * Abre um "aparelho" (contexto novo do navegador, com IndexedDB próprio) já logado na conta
 * Google de teste. O token não é de demonstração, então o app conversa com o Drive (falso).
 */
async function openDevice(
  browser: Browser,
  drive: FakeDrive,
  name: string,
  options: { signedIn: boolean } = { signedIn: true },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  await drive.attach(context, name);
  await routeUniversePackages(context);
  await context.addInitScript(
    ({ profile, signedIn }) => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
      if (signedIn) {
        localStorage.setItem('redija:userProfile', JSON.stringify(profile));
        localStorage.setItem('redija:accessToken', 'e2e_access_token');
        localStorage.setItem('redija:tokenExpiresAt', String(Date.now() + 3_600_000));
      }
    },
    { profile: ACCOUNT, signedIn: options.signedIn },
  );
  const page = await context.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');
  if (!options.signedIn) {
    await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
  }
  await expect(page.getByRole('button', { name: 'Ver todos os modelos' })).toBeVisible();
  return { context, page };
}

async function addCustomTemplate(page: Page, templateName: string) {
  await openNewProjectDialog(page);
  await modelsPanel(page).getByRole('button', { name: 'Buscar novos modelos' }).click();
  const dialog = page.getByRole('dialog', { name: 'Buscar novos modelos' });
  await dialog.getByLabel('Linha de importação').fill(IMPORT_LINE);
  await dialog.getByLabel('Nome do modelo').fill(templateName);
  await dialog.getByRole('button', { name: 'Adicionar modelo' }).click();
  await expect(dialog).not.toBeVisible();
}

function customTile(page: Page, templateName = TEMPLATE_NAME) {
  return modelsPanel(page).getByRole('button', { name: `Criar ${templateName}` });
}

test.describe('Modelos personalizados acompanham a conta Google entre aparelhos', () => {
  test('adicionar num navegador aparece no outro, e remover num lado remove no outro', async ({
    browser,
  }) => {
    const drive = new FakeDrive();

    // Aparelho A adiciona o modelo; ele vai para RedijaApp/redija-modelos.json
    const a = await openDevice(browser, drive, 'A');
    await addCustomTemplate(a.page, TEMPLATE_NAME);
    await expect(customTile(a.page)).toBeVisible();
    // Capa real, extraída do thumbnail do pacote
    await expect(customTile(a.page).getByTestId('custom-template-thumbnail')).toBeVisible();

    await expect
      .poll(() => drive.customTemplates().map((t) => [t.name, t.packageId, t.deletedAt]), {
        timeout: 15_000,
      })
      .toEqual([[TEMPLATE_NAME, '@preview/charged-ieee:0.1.4', null]]);
    expect(drive.customTemplateFiles()).toEqual([
      { name: 'redija-modelos.json', parentName: 'RedijaApp' },
    ]);

    // Aparelho B (outro navegador, mesma conta) recebe o modelo ao abrir o app
    const b = await openDevice(browser, drive, 'B');
    await openNewProjectDialog(b.page);
    await expect(customTile(b.page)).toBeVisible({ timeout: 15_000 });

    // B remove o modelo; a marca de exclusão chega ao Drive
    await customTile(b.page).hover();
    await modelsPanel(b.page).getByRole('button', { name: `Remover modelo ${TEMPLATE_NAME}` }).click();
    await expect(customTile(b.page)).toHaveCount(0);
    await expect
      .poll(() => drive.customTemplates().map((t) => Boolean(t.deletedAt)), { timeout: 15_000 })
      .toEqual([true]);

    // A sincroniza de novo (ao voltar para a aba) e o modelo some lá também
    await a.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(customTile(a.page)).toHaveCount(0, { timeout: 15_000 });

    // Recarregar A não "ressuscita" o modelo
    await a.page.reload();
    await openNewProjectDialog(a.page);
    await expect(modelsPanel(a.page).getByText('Você ainda não adicionou modelos.')).toBeVisible({
      timeout: 15_000,
    });
    expect(drive.customTemplates().map((t) => Boolean(t.deletedAt))).toEqual([true]);

    await a.context.close();
    await b.context.close();
  });

  test('o perfil local guarda os modelos neste navegador sem tocar no Drive', async ({ browser }) => {
    const drive = new FakeDrive();
    const local = await openDevice(browser, drive, 'local', { signedIn: false });

    await addCustomTemplate(local.page, 'Modelo Offline');
    await expect(customTile(local.page, 'Modelo Offline')).toBeVisible();

    // Passa do tempo de espera da sincronização: nada pode ter ido para o Drive
    await local.page.waitForTimeout(3_000);
    expect(drive.requests).toEqual([]);
    expect(drive.customTemplates()).toEqual([]);

    // Continua salvo neste navegador depois de recarregar
    await local.page.reload();
    await openNewProjectDialog(local.page);
    await expect(customTile(local.page, 'Modelo Offline')).toBeVisible();

    await local.context.close();
  });
});
