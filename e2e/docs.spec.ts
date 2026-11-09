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

    await expect(page.getByText(/localStorage/i)).toBeVisible();
    await expect(page.getByText(/apenas na memória da aba \(RAM\)/i)).not.toBeVisible();

    // Retorna para a Landing Page via CTA
    await page.getByRole('button', { name: /Abrir RedijaApp/i }).click();
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();
  });

  test('exibe múltiplos padrões, galeria com Typst Universe e linters com capturas reais na landing page', async ({
    page,
  }) => {
    await page.goto('/');

    // Selo antigo focado apenas em ABNT foi removido e substituído por múltiplos padrões
    await expect(page.getByText(/Novo Padrão Científico Brasileiro/i)).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /ABNT • SBC • IEEE • APA 7ª • Pôsteres • Typst Universe/i }),
    ).toBeVisible();
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();

    // Galeria de Modelos inclui padrões novos e Typst Universe
    const modelosSection = page.locator('#modelos');
    await modelosSection.scrollIntoViewIfNeeded();
    await modelosSection.getByRole('button', { name: /Artigo SBC/i }).click();
    await expect(modelosSection.getByText(/Manual de Submissão SBC acessível direto/i)).toBeVisible();

    await modelosSection.getByRole('button', { name: /Typst Universe/i }).click();
    await expect(
      modelosSection.getByText('@preview/charged-ieee:0.1.4', { exact: true }),
    ).toBeVisible();
    const universeExternalLink = modelosSection.getByRole('link', { name: /typst\.app\/universe/i });
    await expect(universeExternalLink).toHaveAttribute('href', 'https://typst.app/universe');

    // Seção de Linters exibe capturas reais e alterna entre modelos
    const lintersSection = page.locator('#linters');
    await lintersSection.scrollIntoViewIfNeeded();

    const linterTabs = [
      { tab: 'ABNT (TCC & Artigos)', file: '/images/linters/linter-abnt.png' },
      { tab: 'Artigo SBC', file: '/images/linters/linter-sbc.png' },
      { tab: 'IEEE Conference', file: '/images/linters/linter-ieee.png' },
      { tab: 'Pôster A0 / A1', file: '/images/linters/linter-poster.png' },
      { tab: 'ABNT Modificado', file: '/images/linters/linter-abnt-modified.png' },
      { tab: 'Typst Universe & Livre', file: '/images/linters/linter-universe.png' },
    ];

    for (const item of linterTabs) {
      await lintersSection.getByRole('tab', { name: item.tab, exact: true }).click();
      const img = lintersSection.locator('img');
      await expect(img).toHaveAttribute('src', item.file);
      await expect
        .poll(async () =>
          img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
        )
        .toBe(true);
    }
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
