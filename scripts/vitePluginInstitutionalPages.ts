import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

interface RawInstitutionalModel {
  slug: string;
  institutionName: string;
  institutionAcronym: string;
  cityState: string;
  workTypes: string[];
  displayTitle: string;
  description: string;
  manualUrl: string;
  manualVersion: string;
  author: string;
  templateConfigOverrides?: {
    fontFamily?: string;
    fontSizePt?: number;
    lineSpacing?: string;
    marginTopCm?: number;
    marginLeftCm?: number;
    marginBottomCm?: number;
    marginRightCm?: number;
  };
  cover?: {
    showLogo?: boolean;
  };
}

const SITE_URL = 'https://app.redija.com.br';
const OG_IMAGE_URL = `${SITE_URL}/logo.png`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}

export function loadInstitutionalModelsFromDisk(projectRoot: string): RawInstitutionalModel[] {
  const modelsDir = path.resolve(projectRoot, 'src/core/templates/institutions/models');
  if (!fs.existsSync(modelsDir)) return [];

  const files = fs
    .readdirSync(modelsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(modelsDir, file), 'utf-8');
    return JSON.parse(raw) as RawInstitutionalModel;
  });
}

function applySeoHead(
  baseHtml: string,
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogType?: string;
    jsonLd: Record<string, unknown>;
  },
): string {
  const safeTitle = escapeHtml(seo.title);
  const safeDesc = escapeHtml(seo.description);
  const safeUrl = escapeHtml(seo.canonicalUrl);
  const safeOgType = escapeHtml(seo.ogType ?? 'website');

  let html = baseHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${safeDesc}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/i,
    `<meta property="og:title" content="${safeTitle}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/i,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:type"[\s\S]*?\/>/i,
    `<meta property="og:type" content="${safeOgType}" />`,
  );

  const extraHead = [
    `    <link rel="canonical" href="${safeUrl}" />`,
    `    <meta property="og:url" content="${safeUrl}" />`,
    `    <meta property="og:image" content="${OG_IMAGE_URL}" />`,
    `    <meta property="og:locale" content="pt_BR" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${safeTitle}" />`,
    `    <meta name="twitter:description" content="${safeDesc}" />`,
    `    <script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`,
  ].join('\n');

  html = html.replace(/<\/head>/i, `${extraHead}\n  </head>`);
  return html;
}

function renderCatalogStaticBody(models: RawInstitutionalModel[]): string {
  const items = models
    .map(
      (m) => `
      <article style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;">
        <p style="font-size:12px;font-weight:700;color:#007a55;margin:0 0 4px;">${escapeHtml(m.institutionAcronym)} · ${escapeHtml(m.cityState)}</p>
        <h2 style="font-size:18px;margin:0 0 6px;"><a href="/modelos/${escapeHtml(m.slug)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(m.displayTitle)}</a></h2>
        <p style="font-size:13px;color:#475569;margin:0 0 8px;">${escapeHtml(m.institutionName)} — Manual ${escapeHtml(m.manualVersion)}</p>
        <p style="font-size:14px;color:#334155;margin:0 0 12px;">${escapeHtml(m.description)}</p>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">Tipos: ${escapeHtml(m.workTypes.join(', '))}</p>
        <a href="/?modelo=${escapeHtml(m.slug)}" style="display:inline-block;padding:8px 14px;border-radius:8px;background:#007a55;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">Usar este modelo</a>
      </article>`,
    )
    .join('\n');

  return `
    <main style="max-width:960px;margin:0 auto;padding:32px 16px;font-family:Inter,system-ui,sans-serif;">
      <header style="margin-bottom:24px;">
        <a href="/" style="font-weight:700;color:#007a55;text-decoration:none;">RedijaApp</a>
        <h1 style="font-size:28px;margin:12px 0 8px;color:#0f172a;">Modelos de TCC, Dissertação e Tese por Instituição (ABNT)</h1>
        <p style="font-size:15px;color:#475569;">Escolha o modelo da sua universidade ou instituto federal e gere seu PDF acadêmico nas normas vigentes sem configurar Word ou LaTeX.</p>
      </header>
      <section aria-label="Modelos disponíveis" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${items}
      </section>
    </main>`;
}

function renderModelDetailStaticBody(model: RawInstitutionalModel): string {
  const ov = model.templateConfigOverrides ?? {};
  const top = ov.marginTopCm ?? 3;
  const left = ov.marginLeftCm ?? 3;
  const bottom = ov.marginBottomCm ?? 2;
  const right = ov.marginRightCm ?? 2;
  const fontSize = ov.fontSizePt ?? 12;
  const lineSpacing = ov.lineSpacing ?? '1.5';

  return `
    <main style="max-width:860px;margin:0 auto;padding:32px 16px;font-family:Inter,system-ui,sans-serif;">
      <nav aria-label="Breadcrumb" style="margin-bottom:16px;font-size:14px;">
        <a href="/modelos" style="color:#007a55;text-decoration:none;">← Todos os modelos institucionais</a>
      </nav>
      <article style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;background:#fff;">
        <p style="font-size:13px;font-weight:700;color:#007a55;margin:0 0 6px;">${escapeHtml(model.institutionAcronym)} · ${escapeHtml(model.cityState)} · Manual ${escapeHtml(model.manualVersion)}</p>
        <h1 style="font-size:28px;margin:0 0 8px;color:#0f172a;">${escapeHtml(model.displayTitle)}</h1>
        <p style="font-size:16px;font-weight:600;color:#334155;margin:0 0 12px;">${escapeHtml(model.institutionName)}</p>
        <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">${escapeHtml(model.description)}</p>
        <p style="font-size:14px;color:#334155;margin:0 0 16px;"><strong>Tipos de trabalho cobertos:</strong> ${escapeHtml(model.workTypes.join(', '))}</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <a href="/?modelo=${escapeHtml(model.slug)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#007a55;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Usar este modelo</a>
          <a href="${escapeHtml(model.manualUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;border-radius:10px;border:1px solid #cbd5e1;color:#0f172a;font-size:14px;font-weight:500;text-decoration:none;">Manual oficial (${escapeHtml(model.manualVersion)})</a>
        </div>
        <section aria-label="Prévia da capa e especificações">
          <h2 style="font-size:18px;color:#0f172a;margin:0 0 10px;">Especificações do modelo</h2>
          <ul style="font-size:14px;color:#334155;line-height:1.7;padding-left:20px;">
            <li>Margens: superior ${top} cm, esquerda ${left} cm, inferior ${bottom} cm, direita ${right} cm</li>
            <li>Fonte: ${fontSize} pt, entrelinha ${escapeHtml(lineSpacing)}</li>
            <li>Brasão na capa: ${model.cover?.showLogo ? 'suportado (enviado pelo estudante no editor)' : 'opcional'}</li>
            <li>Contribuição: ${escapeHtml(model.author)}</li>
          </ul>
        </section>
      </article>
    </main>`;
}

export function generateSitemapXml(models: RawInstitutionalModel[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/docs`, priority: '0.8' },
    { loc: `${SITE_URL}/modelos`, priority: '0.9' },
    ...models.map((m) => ({
      loc: `${SITE_URL}/modelos/${m.slug}`,
      priority: '0.85',
    })),
  ];

  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

/**
 * Plugin Vite (RDJ-02.5): gera automaticamente páginas HTML estáticas pré-renderizadas
 * para `/modelos` e `/modelos/<slug>`, além de `/sitemap.xml` e `/robots.txt` no `dist/`.
 */
export function institutionalPagesPlugin(projectRoot: string): Plugin {
  return {
    name: 'redija-institutional-pages-ssg',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(projectRoot, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return;

      const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      const models = loadInstitutionalModelsFromDisk(projectRoot);

      // 1. /modelos/index.html
      const catalogDir = path.join(distDir, 'modelos');
      fs.mkdirSync(catalogDir, { recursive: true });
      const catalogTitle = 'Modelos de TCC e Trabalhos Acadêmicos por Instituição (ABNT) — RedijaApp';
      const catalogDesc = `Crie seu TCC, dissertação ou tese já no padrão da sua faculdade (${models
        .map((m) => m.institutionAcronym)
        .join(', ')} e mais) direto no navegador com o RedijaApp.`;
      const catalogHtml = applySeoHead(baseHtml, {
        title: catalogTitle,
        description: catalogDesc,
        canonicalUrl: `${SITE_URL}/modelos`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: catalogTitle,
          description: catalogDesc,
          url: `${SITE_URL}/modelos`,
        },
      }).replace('<div id="root"></div>', `<div id="root">${renderCatalogStaticBody(models)}</div>`);
      fs.writeFileSync(path.join(catalogDir, 'index.html'), catalogHtml, 'utf-8');

      // 2. /modelos/<slug>/index.html
      for (const model of models) {
        const modelDir = path.join(catalogDir, model.slug);
        fs.mkdirSync(modelDir, { recursive: true });
        const pageTitle = `${model.displayTitle} — Modelo ${model.institutionAcronym} (ABNT) | RedijaApp`;
        const pageDesc = `${model.description} Baseado no manual oficial da ${model.institutionName} (${model.manualVersion}).`;
        const pageUrl = `${SITE_URL}/modelos/${model.slug}`;

        const detailHtml = applySeoHead(baseHtml, {
          title: pageTitle,
          description: pageDesc,
          canonicalUrl: pageUrl,
          ogType: 'article',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: pageTitle,
            description: pageDesc,
            url: pageUrl,
            about: {
              '@type': 'CollegeOrUniversity',
              name: model.institutionName,
            },
          },
        }).replace(
          '<div id="root"></div>',
          `<div id="root">${renderModelDetailStaticBody(model)}</div>`,
        );

        fs.writeFileSync(path.join(modelDir, 'index.html'), detailHtml, 'utf-8');
      }

      // 3. /sitemap.xml e /robots.txt
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), generateSitemapXml(models), 'utf-8');
      fs.writeFileSync(
        path.join(distDir, 'robots.txt'),
        `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
        'utf-8',
      );
    },
  };
}
