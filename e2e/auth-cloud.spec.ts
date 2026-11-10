import { test, expect } from '@playwright/test';

test.describe('RedijaApp: Autenticação, Nuvem e Compartilhamento', () => {
  test.beforeEach(async ({ page }) => {
    // Silencia modal de boas-vindas do beta antes da navegação para evitar interceptação de cliques
    await page.addInitScript(() => {
      localStorage.setItem('redija:beta_notice_dismissed', 'true');
    });

    // Aceita diálogos nativos automaticamente
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/');
  });

  test('conecta em modo demonstração, valida Drive Sync e modal de colaboração', async ({
    page,
  }) => {
    // 1. Verifica landing page
    await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();

    // 2. Entra em Modo Demonstração
    const demoBtn = page.getByRole('button', { name: /Entrar como Usuário Demonstração/i });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    } else {
      // Se já configurado com Client ID, usa fluxo de convidado
      await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
    }

    // 3. Aguarda o cabeçalho carregar
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // 4. Se o modal de projetos abrir automaticamente, inicializa um trabalho
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    try {
      await modalHeading.waitFor({ state: 'visible', timeout: 1800 });
      await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Projeto Cloud ${Date.now()}`);
      await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
      await expect(modalHeading).not.toBeVisible();
    } catch {
      // Modal não abriu, projeto já ativo
    }

    // 5. Clica no botão "Compartilhar"
    const shareBtn = page.getByRole('button', { name: /Compartilhar/i });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // 6. Valida que o modal de compartilhamento abriu
    const shareModal = page.locator('div.fixed.z-50');
    await expect(shareModal.getByText('Compartilhar Trabalho')).toBeVisible();
    await expect(shareModal.getByPlaceholder('exemplo@gmail.com')).toBeVisible();

    // 7. Fecha o modal de compartilhamento pelo botão de fechar (X)
    const closeBtn = shareModal.getByRole('button').filter({ has: page.locator('svg.lucide-x') }).first();
    await closeBtn.click();
    await expect(shareModal.getByText('Compartilhar Trabalho')).not.toBeVisible();
  });

  test('abre menu de usuário, acessa configurações de conta e realiza logout para a landing page', async ({
    page,
  }) => {
    // 1. Entra em Modo Demonstração
    const demoBtn = page.getByRole('button', { name: /Entrar como Usuário Demonstração/i });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();

      // Fecha modal inicial se abrir
      const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
      try {
        await modalHeading.waitFor({ state: 'visible', timeout: 1800 });
        await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Projeto Perfil ${Date.now()}`);
        await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
        await expect(modalHeading).not.toBeVisible();
      } catch {
        // Modal não abriu, projeto já ativo
      }

      // 2. Abre o menu do usuário (avatar no cabeçalho)
      const userMenuTrigger = page.locator('header button.rounded-full');
      await expect(userMenuTrigger).toBeVisible();
      await userMenuTrigger.click();

      // 3. Valida e clica em Configurações da Conta
      const settingsOption = page.getByText('Configurações da Conta');
      await expect(settingsOption).toBeVisible();
      await settingsOption.click();

      // 4. Confirma abertura do modal de configurações
      await expect(page.getByRole('heading', { name: 'Configurações da Conta' })).toBeVisible();

      // 5. Fecha o modal de configurações
      const closeSettingsBtn = page.locator('div.fixed.z-50 button').filter({ has: page.locator('svg.lucide-x') }).first();
      await closeSettingsBtn.click();

      // 6. Reabre o menu do usuário e realiza Logout
      await userMenuTrigger.click();
      const logoutBtn = page.getByRole('button', { name: /Sair da Conta Google/i });
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();

      // 7. Confirma retorno para a Landing Page
      await expect(page.getByText(/O Redija cuida das normas por você/i)).toBeVisible();
    }
  });

  test('preserva a sessão do usuário e o editor após recarregar a página (F5) sem voltar para login', async ({
    page,
  }) => {
    // 1. Entra na aplicação (Demo ou Convidado)
    const demoBtn = page.getByRole('button', { name: /Entrar como Usuário Demonstração/i });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    } else {
      await page.getByRole('button', { name: /Experimentar como Convidado/i }).first().click();
    }

    // 2. Aguarda o cabeçalho do editor carregar
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();

    // Fecha modal de boas-vindas/projetos se abrir
    const modalHeading = page.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i });
    try {
      await modalHeading.waitFor({ state: 'visible', timeout: 1800 });
      await page.getByPlaceholder(/Ex: TCC Engenharia/i).fill(`Trabalho F5 ${Date.now()}`);
      await page.getByRole('button', { name: /Criar Novo Trabalho/i }).click();
      await expect(modalHeading).not.toBeVisible();
    } catch {
      // Modal não abriu
    }

    // 3. Simula F5 (Reload completo da página)
    await page.reload();

    // 4. Valida que o editor continua aberto imediatamente e NÃO foi deslogado para a landing page
    await expect(page.getByText('Redija', { exact: true })).toBeVisible();
    await expect(page.getByText(/O Redija cuida das normas por você/i)).not.toBeVisible();
  });

  test('abre link direto ?driveFileId=, exibe link direto no ShareModal e modal Abrir Compartilhado', async ({
    page,
  }) => {
    // 1. Acessa diretamente um link compartilhado ?driveFileId=...
    await page.goto('/?driveFileId=mock_shared_file_999');

    // 2. Valida banner de convite dentro do card de login
    await expect(
      page.getByText(/Você foi convidado para um trabalho no RedijaApp/i),
    ).toBeVisible();

    const demoBtn = page.getByRole('button', { name: /Entrar como Usuário Demonstração/i });
    if (!(await demoBtn.isVisible())) {
      // Caso rodando em ambiente com Client ID real sem login OAuth, o banner da landing já foi validado
      return;
    }

    await demoBtn.click();

    // 3. O projeto compartilhado deve abrir automaticamente no workspace e limpar ?driveFileId da URL
    await expect(
      page.locator('header').getByText('Artigo Compartilhado (Demo)'),
    ).toBeVisible({ timeout: 6000 });
    await expect(page).not.toHaveURL(/driveFileId=/);

    // 4. Valida ShareModal: link direto (?driveFileId=mock_shared_file_999), status E2EE e seletor Editor/Leitor
    await page.getByRole('button', { name: /Compartilhar/i }).click();
    const shareModal = page.locator('div.fixed.z-50');
    await expect(shareModal.getByText('Compartilhar Trabalho')).toBeVisible();
    await expect(
      shareModal.locator('input[readonly][value*="?driveFileId=mock_shared_file_999"]'),
    ).toBeVisible();
    await expect(shareModal.getByLabel('Nível de permissão do convidado')).toBeVisible();

    // Fecha ShareModal
    await shareModal.getByRole('button', { name: 'Fechar' }).click();
    await expect(shareModal.getByText('Compartilhar Trabalho')).not.toBeVisible();

    // 5. Abre ProjectsModal e valida botão "Abrir Compartilhado (Drive)" -> SharedDriveAccessModal
    await page.locator('header button', { hasText: 'Artigo Compartilhado (Demo)' }).click();
    const projectsModal = page.locator('div.fixed.z-50');
    await expect(
      projectsModal.getByRole('heading', { name: /Meus Trabalhos Acadêmicos/i }),
    ).toBeVisible();

    const openSharedBtn = projectsModal.getByRole('button', {
      name: /Abrir Compartilhado \(Drive\)/i,
    });
    await expect(openSharedBtn).toBeVisible();
    await openSharedBtn.click();

    const accessModal = page.locator('div[role="dialog"]');
    await expect(
      accessModal.getByRole('heading', { name: /Abrir Trabalho Compartilhado/i }),
    ).toBeVisible();
    await expect(accessModal.getByText(/drive\.file/)).toBeVisible();
    await expect(
      accessModal.getByRole('button', { name: /Importar arquivo \.redija/i }),
    ).toBeVisible();
    await accessModal.getByRole('button', { name: 'Fechar' }).last().click();
  });

  test('sincroniza edições em tempo real via P2P criptografado E2EE entre duas abas (BroadcastChannel)', async ({
    page,
    context,
  }) => {
    await page.goto('/?driveFileId=mock_p2p_room_e2ee');

    const demoBtn = page.getByRole('button', { name: /Entrar como Usuário Demonstração/i });
    if (!(await demoBtn.isVisible())) {
      return;
    }

    await demoBtn.click();
    await expect(
      page.locator('header').getByText('Artigo Compartilhado (Demo)'),
    ).toBeVisible({ timeout: 6000 });

    // Abre segunda aba no mesmo contexto compartilhando BroadcastChannel + IndexedDB
    const page2 = await context.newPage();
    page2.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page2.goto('/');
    await expect(
      page2.locator('header').getByText('Artigo Compartilhado (Demo)'),
    ).toBeVisible({ timeout: 6000 });

    // Aguarda descoberta mútua via BroadcastChannel E2EE antes de digitar
    await expect(page.locator('header').getByText(/1 online/i)).toBeVisible({ timeout: 8000 });

    // Digita em um bloco editável na Aba 1 e verifica propagação instantânea cifrada na Aba 2
    const firstParagraphTab1 = page.locator('.ProseMirror[contenteditable="true"]').first();
    await firstParagraphTab1.click();
    await firstParagraphTab1.pressSequentially(' TESTE_E2EE_REDIJA', { delay: 10 });

    await expect(page2.getByText(/TESTE_E2EE_REDIJA/)).toBeVisible({ timeout: 8000 });
    await expect(page2.locator('header').getByText(/1 online/i)).toBeVisible({ timeout: 6000 });

    await page2.close();
  });
});
