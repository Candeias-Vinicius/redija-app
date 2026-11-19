import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ProjectCover } from '@/components/home/ProjectCover';
import {
  getAllInstitutionalTemplates,
  getInstitutionalTemplateBySlug,
  InstitutionalTemplateDefinition,
  resolveInstitutionalTemplateConfig,
  searchInstitutionalTemplates,
} from '@/core/templates/institutions';
import {
  GITHUB_CONTRIBUTING_URL,
  GITHUB_INSTITUTION_MODEL_REQUEST_URL,
} from '@/core/links';
import type { DocumentProject } from '@/types/document';

interface ModelsPublicPagesProps {
  modelSlug?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigateHome: () => void;
  onNavigateDocs: () => void;
  onNavigateToModels: (slug?: string) => void;
  onUseModel: (slug: string) => void;
}

const FONT_LABELS: Record<string, string> = {
  serif: 'Serifada (Times New Roman / Tinos)',
  sans: 'Sem serifa (Arial / Arimo)',
  libertinus: 'Libertinus Serif',
  new_cm: 'New Computer Modern',
  lora: 'Lora',
  eb_garamond: 'EB Garamond',
  inter: 'Inter',
  roboto: 'Roboto',
  fira_sans: 'Fira Sans',
};

/**
 * Páginas públicas e indexáveis de modelos institucionais (`/modelos` e `/modelos/<slug>` — RDJ-02.5).
 */
export const ModelsPublicPages: React.FC<ModelsPublicPagesProps> = ({
  modelSlug,
  darkMode,
  onToggleDarkMode,
  onNavigateHome,
  onNavigateDocs,
  onNavigateToModels,
  onUseModel,
}) => {
  const model = useMemo(
    () => (modelSlug ? getInstitutionalTemplateBySlug(modelSlug) : undefined),
    [modelSlug],
  );

  useEffect(() => {
    if (!modelSlug) {
      document.title = 'Modelos Acadêmicos por Instituição (ABNT) — RedijaApp';
      return;
    }
    if (model) {
      document.title = `${model.displayTitle} — Modelo ${model.institutionAcronym} (ABNT) | RedijaApp`;
    } else {
      document.title = 'Modelo não encontrado (404) — RedijaApp';
    }
  }, [modelSlug, model]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-muted text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="flex items-center gap-2 focus:outline-none"
              aria-label="Ir para o RedijaApp"
            >
              <Logo className="w-7 h-7" />
              <span className="font-bold text-base tracking-tight text-fg">RedijaApp</span>
            </a>
            <nav aria-label="Navegação pública" className="hidden sm:flex items-center gap-4 text-sm">
              <a
                href="/modelos"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateToModels();
                }}
                className="font-semibold text-brand-700 dark:text-brand-400"
              >
                Modelos por Instituição
              </a>
              <a
                href="/docs"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateDocs();
                }}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                Documentação
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
              className="touch-target inline-flex items-center justify-center rounded-lg border border-line bg-surface p-2 text-slate-600 dark:text-slate-300 hover:bg-surface-sunken"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="rounded-lg bg-brand-700 hover:bg-brand-800 px-3.5 py-2 text-sm font-semibold text-white transition-colors"
            >
              Abrir editor
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {!modelSlug ? (
          <ModelsCatalogView onNavigateToModels={onNavigateToModels} onUseModel={onUseModel} />
        ) : model ? (
          <ModelDetailView
            model={model}
            onBackToCatalog={() => onNavigateToModels()}
            onUseModel={onUseModel}
          />
        ) : (
          <ModelNotFoundView
            slug={modelSlug}
            onBackToCatalog={() => onNavigateToModels()}
          />
        )}
      </main>

      <footer className="border-t border-line bg-surface py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 text-xs text-fg-muted">
          <p>
            RedijaApp — Modelos institucionais abertos mantidos pela comunidade. Nenhum brasão de
            terceiros é distribuído sem autorização.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_INSTITUTION_MODEL_REQUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 dark:text-brand-400 hover:underline"
            >
              Solicitar modelo
            </a>
            <a
              href={GITHUB_CONTRIBUTING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-fg-muted hover:text-fg hover:underline"
            >
              Contribuir no GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModelsCatalogViewProps {
  onNavigateToModels: (slug?: string) => void;
  onUseModel: (slug: string) => void;
}

const ModelsCatalogView: React.FC<ModelsCatalogViewProps> = ({
  onNavigateToModels,
  onUseModel,
}) => {
  const [query, setQuery] = useState('');
  const allModels = useMemo(() => getAllInstitutionalTemplates(), []);
  const filteredModels = useMemo(
    () => searchInstitutionalTemplates(query, allModels),
    [query, allModels],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <Building2 className="w-3.5 h-3.5" />
            Catálogo Comunitário · {allModels.length} modelos publicados
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Modelos de TCC, Dissertação e Tese por Instituição
          </h1>
          <p className="text-sm sm:text-base text-fg-muted leading-relaxed">
            Comece seu trabalho acadêmico já configurado conforme o manual de normalização da sua
            universidade ou instituto federal — sem brigar com margens no Word ou configurar LaTeX.
          </p>
        </div>

        <div className="mt-6 max-w-xl">
          <label htmlFor="catalog-institution-search" className="sr-only">
            Buscar instituição ou tipo de trabalho
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="catalog-institution-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por instituição, sigla ou cidade (ex.: USP, UNICAMP, IFSP, UFMG, PUC-SP)..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-surface-muted pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>
      </section>

      {filteredModels.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-surface p-8 text-center space-y-3">
          <p className="text-base font-semibold text-fg">
            Ainda não temos o modelo para &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Você pode solicitar o modelo da sua instituição gratuitamente — basta enviar o link do
            manual oficial no formulário do GitHub.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface-sunken"
            >
              Ver todos os modelos
            </button>
            <a
              href={GITHUB_INSTITUTION_MODEL_REQUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Solicitar modelo
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <li
              key={model.slug}
              className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-brand-500/70 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 shrink-0">
                  <ProjectCover
                    project={{
                      name: model.displayTitle,
                      templateType: model.baseTemplateType,
                      metadata: {
                        title: model.displayTitle,
                        institution: model.institutionName,
                      } as DocumentProject['metadata'],
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-block rounded-md bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
                    {model.institutionAcronym}
                  </span>
                  <h2 className="text-base font-bold text-fg leading-snug">
                    <a
                      href={`/modelos/${model.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateToModels(model.slug);
                      }}
                      className="hover:text-brand-700 dark:hover:text-brand-400 hover:underline"
                    >
                      {model.displayTitle}
                    </a>
                  </h2>
                  <p className="text-xs text-fg-muted">{model.institutionName}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-fg-muted">
                    <MapPin className="w-3 h-3" />
                    {model.cityState}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-fg-muted leading-relaxed line-clamp-3 flex-1">
                {model.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {model.workTypes.map((wt) => (
                  <span
                    key={wt}
                    className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted"
                  >
                    {wt}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                <a
                  href={`/modelos/${model.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToModels(model.slug);
                  }}
                  className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline"
                >
                  Ver detalhes
                </a>
                <button
                  type="button"
                  onClick={() => onUseModel(model.slug)}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-700 hover:bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  Usar este modelo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border border-line bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-fg">Não encontrou sua faculdade?</h2>
          <p className="text-sm text-fg-muted">
            Peça o modelo da sua instituição ou contribua diretamente com um arquivo JSON via Pull
            Request.
          </p>
        </div>
        <a
          href={GITHUB_INSTITUTION_MODEL_REQUEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-50 dark:bg-brand-950/50 px-4 py-2 text-sm font-semibold text-brand-800 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-950 transition-colors"
        >
          Solicitar ou enviar modelo
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>
    </div>
  );
};

interface ModelDetailViewProps {
  model: InstitutionalTemplateDefinition;
  onBackToCatalog: () => void;
  onUseModel: (slug: string) => void;
}

const ModelDetailView: React.FC<ModelDetailViewProps> = ({
  model,
  onBackToCatalog,
  onUseModel,
}) => {
  const cfg = useMemo(() => resolveInstitutionalTemplateConfig(model), [model]);

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-fg-muted">
        <a
          href="/modelos"
          onClick={(e) => {
            e.preventDefault();
            onBackToCatalog();
          }}
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 dark:text-brand-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para todos os modelos
        </a>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-700 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                {model.institutionAcronym}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
                <MapPin className="w-3.5 h-3.5" />
                {model.cityState}
              </span>
              <span className="text-xs text-fg-muted">· Manual {model.manualVersion}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              {model.displayTitle}
            </h1>
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">
              {model.institutionName}
            </p>
            <p className="text-sm sm:text-base text-fg-muted leading-relaxed">
              {model.description}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {model.workTypes.map((wt) => (
                <span
                  key={wt}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-fg"
                >
                  <FileText className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400" />
                  {wt}
                </span>
              ))}
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onUseModel(model.slug)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 hover:bg-brand-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Usar este modelo
              </button>
              <a
                href={model.manualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-muted hover:bg-surface-sunken px-4 py-3 text-sm font-medium text-fg transition-colors"
              >
                <BookOpen className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                Consultar manual oficial ({model.manualVersion})
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-fg">Configuração aplicada automaticamente</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-surface-muted p-3.5 border border-line">
                <dt className="text-xs font-medium text-fg-muted">Margens (Sup / Esq / Inf / Dir)</dt>
                <dd className="mt-1 font-semibold text-fg">
                  {cfg.marginTopCm} cm / {cfg.marginLeftCm} cm / {cfg.marginBottomCm} cm /{' '}
                  {cfg.marginRightCm} cm
                </dd>
              </div>
              <div className="rounded-xl bg-surface-muted p-3.5 border border-line">
                <dt className="text-xs font-medium text-fg-muted">Tipografia e Espaçamento</dt>
                <dd className="mt-1 font-semibold text-fg">
                  {FONT_LABELS[cfg.fontFamily] ?? cfg.fontFamily} · {cfg.fontSizePt} pt · entrelinha{' '}
                  {cfg.lineSpacing}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-muted p-3.5 border border-line">
                <dt className="text-xs font-medium text-fg-muted">Elementos estruturais</dt>
                <dd className="mt-1 font-semibold text-fg">
                  {[
                    cfg.includeCoverPage && 'Capa',
                    cfg.includeTitlePage && 'Folha de rosto',
                    (model.defaultMetadata?.includeApprovalPage ||
                      model.linterOverrides?.requireApprovalPage) &&
                      'Folha de aprovação',
                    cfg.includeToc && 'Sumário automático',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-muted p-3.5 border border-line">
                <dt className="text-xs font-medium text-fg-muted">Brasão da instituição</dt>
                <dd className="mt-1 font-semibold text-fg">
                  {model.cover?.showLogo
                    ? 'Suportado na capa (enviado por você no editor)'
                    : 'Opcional na capa'}
                </dd>
              </div>
            </dl>

            <div className="flex items-start gap-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
              <span>
                Os verificadores automáticos do RedijaApp respeitam as regras deste manual e alertam
                caso algum elemento obrigatório da {model.institutionAcronym} esteja faltando.
                Contribuição de <strong>{model.author}</strong>.
              </span>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-fg">Prévia da capa</h2>
            <div className="mx-auto max-w-[220px]">
              <ProjectCover
                project={{
                  name: model.displayTitle,
                  templateType: model.baseTemplateType,
                  metadata: {
                    title: model.displayTitle,
                    institution: model.defaultMetadata?.institution || model.institutionName,
                    author: 'Seu Nome Completo',
                    location: model.defaultMetadata?.location || model.cityState.split('/')[0]?.trim() || '',
                    year: String(new Date().getFullYear()),
                  } as DocumentProject['metadata'],
                }}
              />
            </div>
            <p className="text-xs text-fg-muted text-center">
              Capa, folha de rosto e pré-textuais formatados automaticamente em PDF via Typst.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
};

interface ModelNotFoundViewProps {
  slug: string;
  onBackToCatalog: () => void;
}

const ModelNotFoundView: React.FC<ModelNotFoundViewProps> = ({ slug, onBackToCatalog }) => (
  <section className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-xs space-y-4">
    <span className="inline-block rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-1 font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
      Erro 404
    </span>
    <h1 className="text-2xl font-bold text-fg">Modelo não encontrado</h1>
    <p className="text-sm text-fg-muted leading-relaxed">
      Não encontramos nenhum modelo institucional publicado com o endereço{' '}
      <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs">/modelos/{slug}</code>.
    </p>
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      <a
        href="/modelos"
        onClick={(e) => {
          e.preventDefault();
          onBackToCatalog();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-4 py-2 text-sm font-semibold text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Ver todos os modelos
      </a>
      <a
        href={GITHUB_INSTITUTION_MODEL_REQUEST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface-sunken"
      >
        Solicitar este modelo
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  </section>
);
