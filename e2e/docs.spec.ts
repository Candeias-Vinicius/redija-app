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

  test('exibe múltiplos padrões, galeria com Typst Universe, workspace real adaptativo ao tema e linters focados na landing page', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('redija:darkMode', '0');
    });
    await page.goto('/');

    // Selo antigo focado apenas em ABNT foi removido e texto inicial está livre de jargões técnicos
    await expect(page.getByText(/Novo Padrão Científico Brasileiro/i)).not.toBeVisible();
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();
    await expect(
      page.getByText(/O editor acadêmico em blocos que automatiza a formatação/i),
    ).toBeVisible();
    await expect(page.getByText(/Typst em WebAssembly/i)).not.toBeVisible();

    // Workspace Real (Aba 1) começa no modo claro e preserva aba Editor & PDF
    const demoSection = page.locator('#demonstracao');
    await demoSection.scrollIntoViewIfNeeded();
    const workspaceImg = demoSection.locator('img');
    await expect(workspaceImg).toHaveAttribute('src', '/images/workspace-real-light.png');
    await expect
      .poll(async () =>
        workspaceImg.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      )
      .toBe(true);

    await demoSection.getByRole('button', { name: /Editor & PDF/i }).click();
    await expect(demoSection.getByText('Editor de Texto (Blocos ABNT)')).toBeVisible();
    await expect(demoSection.getByText('Prévia PDF • NBR 14724')).toBeVisible();
    await expect(demoSection.getByTestId('mockup-editor-panel')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await expect(demoSection.getByTestId('mockup-a4-sheet')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );

    await demoSection.getByRole('button', { name: /Typst \(\.typ\)/i }).click();
    await expect(demoSection.getByTestId('mockup-typst-panel')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );

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

    // Seção de Linters exibe recortes focados no modo claro e alterna entre modelos
    const lintersSection = page.locator('#linters');
    await lintersSection.scrollIntoViewIfNeeded();

    const linterTabs = [
      { tab: 'ABNT (TCC & Artigos)', slug: 'linter-abnt' },
      { tab: 'Artigo SBC', slug: 'linter-sbc' },
      { tab: 'IEEE Conference', slug: 'linter-ieee' },
      { tab: 'Pôster A0 / A1', slug: 'linter-poster' },
      { tab: 'ABNT Modificado', slug: 'linter-abnt-modified' },
      { tab: 'Typst Universe & Livre', slug: 'linter-universe' },
    ];

    for (const item of linterTabs) {
      await lintersSection.getByRole('tab', { name: item.tab, exact: true }).click();
      const img = lintersSection.locator('img');
      await expect(img).toHaveAttribute('src', `/images/linters/${item.slug}-light.png`);
      await expect
        .poll(async () =>
          img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
        )
        .toBe(true);
    }

    // Alterna Landing Page para Modo Escuro -> Workspace Real e Linters trocam para captura escura,
    // e a folha A4 na aba Editor & PDF permanece sempre clara (branca)
    await page.getByRole('button', { name: 'Alternar tema' }).click();
    await demoSection.getByRole('button', { name: /Workspace Real \(3 Painéis\)/i }).click();
    await expect(workspaceImg).toHaveAttribute('src', '/images/workspace-real-dark.png');
    await expect
      .poll(async () =>
        workspaceImg.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      )
      .toBe(true);

    const editPdfBtn = demoSection.getByRole('button', { name: /Editor & PDF/i });
    await editPdfBtn.click();
    await expect(editPdfBtn).not.toHaveCSS('background-color', 'rgb(30, 41, 59)');
    await expect(editPdfBtn).toHaveCSS('background-color', /oklch\(0\.696/);
    await expect(demoSection.getByTestId('mockup-editor-panel')).toHaveCSS(
      'background-color',
      'rgb(12, 20, 36)',
    );
    await expect(demoSection.getByTestId('mockup-a4-sheet')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );

    await demoSection.getByRole('button', { name: /Typst \(\.typ\)/i }).click();
    await expect(demoSection.getByTestId('mockup-typst-panel')).toHaveCSS(
      'background-color',
      'rgb(10, 17, 32)',
    );

    await lintersSection.scrollIntoViewIfNeeded();
    const linterImgDark = lintersSection.locator('img');
    await expect(linterImgDark).toHaveAttribute('src', '/images/linters/linter-universe-dark.png');
    await expect
      .poll(async () =>
        linterImgDark.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      )
      .toBe(true);
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
