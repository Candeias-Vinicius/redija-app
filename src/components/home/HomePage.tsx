import React, { useId, useMemo, useState } from 'react';
import {
  Clock,
  FolderOpen,
  Globe,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import type { DocumentProject, ProjectTemplateType } from '@/types/document';
import { GoogleLogo } from '@/components/GoogleLogo';
import { TRASH_RETENTION_DAYS } from '@/core/storage/db';
import { ProjectCover } from './ProjectCover';
import { ContinueCard } from './ContinueCard';
import { ProjectCard, TrashProjectCard, type ProjectCardActions } from './ProjectCard';
import { AllModelsPanel, ALL_MODELS_PANEL_ID, NEW_PROJECT_NAME_INPUT_ID } from './AllModelsPanel';
import { HomeSearchField } from './HomeSearchField';
import { UniverseModelDialog } from './ProjectDialogs';
import type { CustomTemplate } from '@/core/storage/customTemplates';
import { scrollBehavior } from '@/core/motion';
import { toast } from '@/components/ui/toastStore';
import {
  matchesProjectSearch,
  quickTemplates,
  sortProjects,
  templateBadge,
  templateLabel,
  type ProjectSort,
} from './homeUtils';

type HomeTab = 'mine' | 'shared' | 'trash';
type HomeView = 'grid' | 'list';

const VIEW_KEY = 'redija:homeView';
const SORT_KEY = 'redija:homeSort';

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignora
  }
}

export interface HomePageProps extends ProjectCardActions {
  projects: DocumentProject[];
  trashedProjects: DocumentProject[];
  lastOpenedProjectId?: string;
  isStorageReady: boolean;
  isAuthenticated: boolean;
  downloadingId: string | null;
  isSyncingDrive?: boolean;
  onSyncFromDrive?: () => void;
  onQuickCreate: (templateType: ProjectTemplateType, name?: string) => void;
  customTemplates: CustomTemplate[];
  onAddCustomTemplate: (input: { name: string; packageId: string }) => CustomTemplate;
  onRemoveCustomTemplate: (template: CustomTemplate) => void;
  onCreateFromCustom: (template: CustomTemplate, name?: string) => void;
  onImport: () => void;
  onRestore: (project: DocumentProject) => void;
  onDeleteForever: (project: DocumentProject) => void;
  onConnectGoogle: () => void;
}

const TILE =
  'group/tile flex h-full w-full flex-col items-stretch gap-2 rounded-xl border border-line bg-surface-muted dark:bg-surface p-2.5 text-left hover:border-brand-600 hover:shadow-sm transition-colors';

/** Página inicial: continuar, criar a partir de modelos e gerenciar os trabalhos. */
export const HomePage: React.FC<HomePageProps> = ({
  projects,
  trashedProjects,
  lastOpenedProjectId,
  isStorageReady,
  isAuthenticated,
  downloadingId,
  isSyncingDrive = false,
  onSyncFromDrive,
  onQuickCreate,
  customTemplates,
  onAddCustomTemplate,
  onRemoveCustomTemplate,
  onCreateFromCustom,
  onImport,
  onRestore,
  onDeleteForever,
  onConnectGoogle,
  ...cardActions
}) => {
  const [tab, setTab] = useState<HomeTab>('mine');
  const [view, setView] = useState<HomeView>(() => readPref(VIEW_KEY, ['grid', 'list'] as const, 'grid'));
  const [sort, setSort] = useState<ProjectSort>(() => readPref(SORT_KEY, ['recent', 'name'] as const, 'recent'));
  const tabsId = useId();
  const [query, setQuery] = useState('');
  const isSearching = query.trim().length > 0;

  // "Mais modelos" expandido, nome do novo trabalho e janela do Typst Universe
  const [modelsOpen, setModelsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [universeOpen, setUniverseOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const trimmedNewName = newName.trim();
  const newNameTaken =
    trimmedNewName.length > 0 &&
    projects.some((p) => p.name.trim().toLowerCase() === trimmedNewName.toLowerCase());

  const openModels = (options?: { name?: string; focusName?: boolean }) => {
    if (options?.name !== undefined) setNewName(options.name);
    setModelsOpen(true);
    requestAnimationFrame(() => {
      document
        .getElementById(ALL_MODELS_PANEL_ID)
        ?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      if (options?.focusName) document.getElementById(NEW_PROJECT_NAME_INPUT_ID)?.focus();
    });
  };

  const toggleModels = () => (modelsOpen ? setModelsOpen(false) : openModels());

  const guardName = () => {
    if (!newNameTaken) return true;
    document.getElementById(NEW_PROJECT_NAME_INPUT_ID)?.focus();
    return false;
  };

  const handleAddCustom = (input: { name: string; packageId: string }) => {
    const template = onAddCustomTemplate(input);
    setUniverseOpen(false);
    setHighlightId(template.id);
    openModels();
    toast.success(`Modelo "${template.name}" adicionado. Ele fica salvo em "Mais modelos".`);
  };

  const ownProjects = useMemo(() => projects.filter((p) => !p.isSharedWithMe), [projects]);
  const sharedProjects = useMemo(() => projects.filter((p) => p.isSharedWithMe), [projects]);

  const source = tab === 'mine' ? ownProjects : tab === 'shared' ? sharedProjects : trashedProjects;
  const visible = useMemo(
    () => sortProjects(source.filter((p) => matchesProjectSearch(p, query)), sort),
    [source, query, sort],
  );

  const continueProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.find((p) => p.id === lastOpenedProjectId) ?? sortProjects(projects, 'recent')[0];
  }, [projects, lastOpenedProjectId]);

  // Até 6 modelos: 3 sempre visíveis, mais em telas largas para aproveitar a largura
  const templates = useMemo(() => quickTemplates(projects, 6), [projects]);

  const tabs: { id: HomeTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'mine', label: 'Meus trabalhos', icon: <FolderOpen className="w-4 h-4" />, count: ownProjects.length },
    { id: 'shared', label: 'Compartilhados comigo', icon: <Users className="w-4 h-4" />, count: sharedProjects.length },
    { id: 'trash', label: 'Lixeira', icon: <Trash2 className="w-4 h-4" />, count: trashedProjects.length },
  ];

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    setTab(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    event.preventDefault();
  };

  const isFirstTime = isStorageReady && projects.length === 0 && trashedProjects.length === 0;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-surface-muted" aria-labelledby="home-title">
      <div className="mx-auto w-full max-w-[2400px] px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 sm:py-8 space-y-8">
        <h1 id="home-title" className="sr-only">
          Meus trabalhos
        </h1>

        {/* ------------------------------------------------------------ */}
        {/* Faixa de ação: continuar + criar                              */}
        {/* ------------------------------------------------------------ */}
        <section
            aria-label="Começar"
            className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${continueProject ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}`}
          >
            {continueProject && (
              <ContinueCard
                project={continueProject}
                isDownloading={downloadingId === continueProject.id}
                onOpen={cardActions.onOpen}
                onDownloadPdf={cardActions.onDownloadPdf}
              />
            )}

            <section
              aria-labelledby="home-create-title"
              className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 id="home-create-title" className="text-sm font-semibold text-fg">
                    {isFirstTime ? 'Comece seu primeiro trabalho' : 'Novo trabalho'}
                  </h2>
                  {isFirstTime && (
                    <p className="mt-0.5 text-sm text-fg-muted">
                      Escolha um modelo com a estrutura da norma já montada, ou importe um arquivo.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleModels}
                  aria-expanded={modelsOpen}
                  aria-controls={ALL_MODELS_PANEL_ID}
                  className="text-sm font-medium text-brand-700 dark:text-brand-400 hover:underline"
                >
                  {modelsOpen ? 'Ocultar modelos' : 'Ver todos os modelos'}
                </button>
              </div>

              <ul className="mt-3 -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-5 sm:overflow-visible xl:grid-cols-6 2xl:grid-cols-8">
                <li className="w-28 shrink-0 snap-start sm:w-auto">
                  <button type="button" onClick={() => onQuickCreate('em_branco')} className={TILE}>
                    <span className="flex aspect-[1/1.414] w-full items-center justify-center rounded-[2px] border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 group-hover/tile:border-brand-600 group-hover/tile:text-brand-700">
                      <Plus className="w-7 h-7" />
                    </span>
                    <span className="text-sm font-semibold text-fg leading-tight">Em branco</span>
                  </button>
                </li>
                {templates.map((type, index) => (
                  <li
                    key={type}
                    className={`w-28 shrink-0 snap-start sm:w-auto ${
                      index >= 4 ? 'hidden 2xl:block' : index === 3 ? 'hidden xl:block' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onQuickCreate(type)}
                      className={TILE}
                      aria-label={`Criar ${templateLabel(type)}`}
                    >
                      <ProjectCover
                        project={{
                          name: templateLabel(type),
                          templateType: type,
                          metadata: {
                            title: templateLabel(type),
                          } as DocumentProject['metadata'],
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-fg leading-tight line-clamp-2">
                          {templateLabel(type).replace(/\s*\(.*\)$/, '')}
                        </span>
                        <span className="mt-0.5 block font-mono text-[0.7rem] font-semibold uppercase text-fg-muted">
                          {templateBadge(type)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                <li className="w-28 shrink-0 snap-start sm:w-auto">
                  <button
                    type="button"
                    onClick={toggleModels}
                    aria-expanded={modelsOpen}
                    aria-controls={ALL_MODELS_PANEL_ID}
                    className={`${TILE} ${modelsOpen ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : ''}`}
                  >
                    <span className="grid aspect-[1/1.414] w-full grid-cols-2 gap-1.5 rounded-[2px] bg-surface-sunken p-2.5">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="rounded-[2px] bg-surface ring-1 ring-black/5" />
                      ))}
                    </span>
                    <span className="text-sm font-semibold text-fg leading-tight">Mais modelos</span>
                  </button>
                </li>
              </ul>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <button
                  type="button"
                  onClick={onImport}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-400"
                >
                  <Upload className="w-4 h-4" />
                  Importar arquivo <span className="text-fg-muted font-normal">(.docx, .tex, .typ, .zip)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniverseOpen(true)}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-400"
                >
                  <Globe className="w-4 h-4" />
                  Buscar novos modelos
                </button>
              </div>
            </section>
          </section>

        {modelsOpen && (
          <AllModelsPanel
            customTemplates={customTemplates}
            highlightId={highlightId}
            projectName={newName}
            nameTaken={newNameTaken}
            onProjectNameChange={setNewName}
            onCreate={(type) => guardName() && onQuickCreate(type, trimmedNewName || undefined)}
            onCreateFromCustom={(tpl) => guardName() && onCreateFromCustom(tpl, trimmedNewName || undefined)}
            onRemoveCustom={onRemoveCustomTemplate}
            onOpenUniverse={() => setUniverseOpen(true)}
            onImport={onImport}
            onClose={() => setModelsOpen(false)}
          />
        )}

        {/* ------------------------------------------------------------ */}
        {/* Trabalhos                                                     */}
        {/* ------------------------------------------------------------ */}
        <section aria-labelledby="home-projects-title" className="space-y-4">
          <h2 id="home-projects-title" className="sr-only">
            {isSearching ? `Resultados para "${query}"` : 'Trabalhos'}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Filtrar trabalhos"
              onKeyDown={handleTabKeyDown}
              className="-mx-1 mr-auto flex max-w-full min-w-0 gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  data-tab={t.id}
                  id={`${tabsId}-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`touch-target inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-surface text-fg shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-surface hover:text-fg'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  <span className="rounded-full bg-surface-sunken px-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <HomeSearchField
              value={query}
              onChange={setQuery}
              className="order-first w-full sm:order-none sm:w-64 lg:w-80"
            />

            <div className="flex items-center gap-2">
              {isAuthenticated && onSyncFromDrive && (
                <button
                  type="button"
                  onClick={onSyncFromDrive}
                  disabled={isSyncingDrive}
                  className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-surface-sunken disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncingDrive ? 'Buscando…' : 'Atualizar do Drive'}</span>
                </button>
              )}
              {tab !== 'trash' && (
                <>
                  <label htmlFor="home-sort" className="sr-only">
                    Ordenar trabalhos
                  </label>
                  <select
                    id="home-sort"
                    value={sort}
                    onChange={(e) => {
                      const next = e.target.value as ProjectSort;
                      setSort(next);
                      writePref(SORT_KEY, next);
                    }}
                    className="h-9 rounded-lg border bg-surface px-2 text-sm text-fg"
                  >
                    <option value="recent">Recentes</option>
                    <option value="name">Nome (A–Z)</option>
                  </select>
                  <div role="group" aria-label="Modo de exibição" className="flex rounded-lg border border-line bg-surface p-0.5">
                    {(
                      [
                        ['grid', 'Grade', <LayoutGrid key="g" className="w-4 h-4" />],
                        ['list', 'Lista', <List key="l" className="w-4 h-4" />],
                      ] as const
                    ).map(([mode, label, icon]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setView(mode);
                          writePref(VIEW_KEY, mode);
                        }}
                        aria-pressed={view === mode}
                        aria-label={`Exibir em ${label.toLowerCase()}`}
                        title={label}
                        className={`touch-target flex items-center justify-center rounded-md p-1.5 ${
                          view === mode
                            ? 'bg-surface-sunken text-fg'
                            : 'text-slate-500 hover:text-fg'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-${tab}`}
          >
            {isSearching && (
              <p className="mb-3 text-sm text-fg-muted" role="status">
                {visible.length === 0
                  ? `Nenhum resultado para "${query}"`
                  : `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'} para "${query}"`}
                {' · '}
                <button type="button" onClick={() => setQuery('')} className="font-medium text-brand-700 dark:text-brand-400 hover:underline">
                  Limpar busca
                </button>
              </p>
            )}

            {tab === 'trash' && (
              <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Clock className="mt-0.5 w-4 h-4 shrink-0" aria-hidden="true" />
                Trabalhos na Lixeira ficam guardados por até {TRASH_RETENTION_DAYS} dias antes de serem apagados
                automaticamente.
              </p>
            )}

            {!isStorageReady ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="rounded-xl border border-line bg-surface p-3">
                    <span className="block aspect-[1/1.2] rounded-md bg-surface-sunken motion-safe:animate-pulse" />
                    <span className="mt-3 block h-3 w-3/4 rounded bg-surface-sunken motion-safe:animate-pulse" />
                    <span className="mt-2 block h-3 w-1/2 rounded bg-surface-sunken motion-safe:animate-pulse" />
                  </li>
                ))}
              </ul>
            ) : visible.length === 0 ? (
              <EmptyState
                tab={tab}
                isSearching={isSearching}
                query={query}
                isAuthenticated={isAuthenticated}
                isFirstTime={isFirstTime}
                onClearQuery={() => setQuery('')}
                onCreateNamed={() => openModels({ name: query.trim(), focusName: true })}
                onConnectGoogle={onConnectGoogle}
              />
            ) : tab === 'trash' ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {visible.map((project) => (
                  <TrashProjectCard
                    key={project.id}
                    project={project}
                    onRestore={onRestore}
                    onDeleteForever={onDeleteForever}
                  />
                ))}
              </ul>
            ) : view === 'grid' ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    view="grid"
                    isDownloading={downloadingId === project.id}
                    {...cardActions}
                  />
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-line bg-surface p-1">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    view="list"
                    isDownloading={downloadingId === project.id}
                    {...cardActions}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <UniverseModelDialog
        isOpen={universeOpen}
        existing={customTemplates}
        onClose={() => setUniverseOpen(false)}
        onAdd={handleAddCustom}
      />
    </main>
  );
};

interface EmptyStateProps {
  tab: HomeTab;
  isSearching: boolean;
  query: string;
  isAuthenticated: boolean;
  isFirstTime: boolean;
  onClearQuery: () => void;
  onCreateNamed: () => void;
  onConnectGoogle: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  tab,
  isSearching,
  query,
  isAuthenticated,
  isFirstTime,
  onClearQuery,
  onCreateNamed,
  onConnectGoogle,
}) => {
  let icon: React.ReactNode = <FolderOpen className="w-6 h-6" />;
  let title = 'Nenhum trabalho por aqui';
  let text: React.ReactNode = 'Crie um trabalho a partir de um modelo acima ou importe um arquivo.';
  let action: React.ReactNode = null;

  if (isSearching) {
    icon = <SearchX className="w-6 h-6" />;
    title = 'Nada encontrado';
    text = `Nenhum trabalho corresponde a "${query}".`;
    action = (
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onClearQuery}
          className="touch-target rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-surface-sunken"
        >
          Limpar busca
        </button>
        {tab === 'mine' && (
          <button
            type="button"
            onClick={onCreateNamed}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" />
            Criar "{query.trim()}"
          </button>
        )}
      </div>
    );
  } else if (tab === 'shared') {
    icon = <Users className="w-6 h-6" />;
    title = 'Nada compartilhado com você ainda';
    if (isAuthenticated) {
      text = 'Quando um colega compartilhar um trabalho do Redija com você pelo Google Drive, ele aparece aqui.';
    } else {
      text = 'Conecte sua conta Google para ver os trabalhos que colegas e orientadores compartilharam com você.';
      action = (
        <button
          type="button"
          onClick={onConnectGoogle}
          className="touch-target inline-flex items-center gap-2 rounded-full border border-[#747775] bg-[#ffffff] px-4 py-1.5 text-sm font-medium text-[#1f1f1f] hover:bg-[#f8f9fa] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f20] transition-colors"
        >
          <GoogleLogo />
          Conectar conta Google
        </button>
      );
    }
  } else if (tab === 'trash') {
    icon = <Trash2 className="w-6 h-6" />;
    title = 'A Lixeira está vazia';
    text = 'Trabalhos excluídos ficam aqui por um tempo, caso você mude de ideia.';
  } else if (isFirstTime) {
    title = 'Você ainda não tem trabalhos';
    text = 'Escolha um modelo em "Comece seu primeiro trabalho" para começar.';
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-slate-500">{icon}</span>
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-1 max-w-md text-sm text-fg-muted">{text}</p>
      </div>
      {action}
    </div>
  );
};
