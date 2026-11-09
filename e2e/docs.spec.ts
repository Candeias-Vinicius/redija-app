import { test, expect } from '@playwright/test';

test.describe('RedijaApp: Documentação Integrada (/docs) & Links GitHub', () => {
  test('renderiza /docs diretamente com busca funcional, logo carregado, link do GitHub e retorno ao app', async ({
    page,
  }) => {
    await page.goto('/docs');

    await expect(
      page.getByRole('heading', { name: /Guia Completo de Uso & Normas Científicas/i }),
    ).toBeVisible();

    // Garante que a logo carregou corretamente mesmo estando em /docs (base: '/')
    const logoLoaded = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.some((img) => img.src.includes('/logo.png') && img.complete && img.naturalWidth > 0);
    });
    expect(logoLoaded).toBe(true);

    // Link oficial para o repositório no GitHub e atribuições AGPL-3.0 / Typst visíveis
    const githubLink = page.getByRole('link', { name: /Ver Código no GitHub/i });
    await expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/Candeias-Vinicius/redija-app',
    );
    await expect(page.getByText(/Código aberto sob licença AGPL-3\.0/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Créditos & Typst \(Apache-2\.0\)/i })).toBeVisible();

    // Testa filtro de busca rápida
    await page.getByLabel('Buscar na documentação', { exact: true }).fill('NBR 14724');
    await expect(page.getByText('ABNT NBR 14724', { exact: true })).toBeVisible();
    await expect(page.getByText(/Colaboração ao Vivo via WebRTC/i)).not.toBeVisible();

    await page.getByLabel('Limpar busca').click();
    await expect(page.getByText(/Colaboração ao Vivo via WebRTC/i)).toBeVisible();

    // Retorna para a Landing Page via CTA
    await page.getByRole('button', { name: /Abrir RedijaApp/i }).click();
    await expect(page.getByText(/O Redija cuida de toda a ABNT/i)).toBeVisible();
  });

  test('exibe links para /docs e GitHub na página inicial e navega via SPA', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('a[href="/docs"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="https://github.com/Candeias-Vinicius/redija-app"]').first(),
    ).toBeVisible();

    // Navega para /docs pelo link do topo
    await page.locator('header a[href="/docs"]').click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(
      page.getByRole('heading', { name: /Guia Completo de Uso & Normas Científicas/i }),
    ).toBeVisible();
  });
});
