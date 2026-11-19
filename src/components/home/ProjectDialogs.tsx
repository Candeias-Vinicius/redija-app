import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  Loader2,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { DocumentProject } from '@/types/document';
import type { CustomTemplate } from '@/core/storage/customTemplates';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/universeResolver';
import {
  checkUniversePackageExists,
  parseUniverseInput,
  suggestTemplateName,
} from '@/core/universe/universeInput';
import { toast } from '@/components/ui/toastStore';

const PANEL = 'w-full rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]';
const PRIMARY =
  'touch-target inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors';
const SECONDARY =
  'touch-target inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-line text-slate-700 dark:text-slate-200 hover:bg-surface-sunken text-sm font-medium transition-colors';

const DialogHeader: React.FC<{ id: string; title: string; subtitle?: string; onClose: () => void }> = ({
  id,
  title,
  subtitle,
  onClose,
}) => (
  <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
    <div className="min-w-0">
      <h2 id={id} className="text-base font-semibold text-fg">
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className="touch-target flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-surface-sunken"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

/* ------------------------------------------------------------------ */
/* Buscar novos modelos (Typst Universe)                               */
/* ------------------------------------------------------------------ */

const UNIVERSE_SEARCH_URL = 'https://typst.app/universe/search/?kind=templates';

interface UniverseModelDialogProps {
  isOpen: boolean;
  existing: CustomTemplate[];
  onClose: () => void;
  onAdd: (input: { name: string; packageId: string }) => void;
}

export const UniverseModelDialog: React.FC<UniverseModelDialogProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <UniverseModelDialogContent {...props} />;
};

const UniverseModelDialogContent: React.FC<Omit<UniverseModelDialogProps, 'isOpen'>> = ({
  existing,
  onClose,
  onAdd,
}) => {
  const [rawInput, setRawInput] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const parsed = parseUniverseInput(rawInput);
  const duplicate = parsed.ok
    ? existing.find((t) => t.packageId.toLowerCase() === parsed.packageId.toLowerCase())
    : undefined;
  const suggestedName = parsed.ok ? suggestTemplateName(parsed.name) : '';
  const effectiveName = nameTouched ? name : name || suggestedName;

  const statusId = 'universe-input-status';
  let status: { tone: 'ok' | 'warn' | 'error'; text: string } | null = null;
  if (parsed.ok && duplicate) {
    status = { tone: 'warn', text: `Você já salvou esse modelo como "${duplicate.name}".` };
  } else if (parsed.ok) {
    status = { tone: 'ok', text: `Pacote reconhecido: ${parsed.name} · versão ${parsed.version}` };
  } else if (parsed.reason === 'missing-version') {
    status = {
      tone: 'warn',
      text: 'Esse link não informa a versão. Copie a linha #import da página do modelo.',
    };
  } else if (parsed.reason === 'invalid') {
    status = { tone: 'error', text: 'Não encontramos um pacote nesse texto. Cole a linha #import do modelo.' };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!parsed.ok) {
      setSubmitError('Cole a linha de importação do modelo para continuar.');
      return;
    }
    if (duplicate) {
      setSubmitError(`Esse modelo já está em "Mais modelos" como "${duplicate.name}".`);
      return;
    }
    const finalName = effectiveName.trim();
    if (!finalName) {
      setSubmitError('Dê um nome ao modelo.');
      return;
    }
    setIsChecking(true);
    const check = await checkUniversePackageExists(parsed.namespace, parsed.name, parsed.version);
    setIsChecking(false);
    if (check === 'not-found') {
      setSubmitError('Não encontramos esse pacote no Typst Universe. Confira o nome e a versão.');
      return;
    }
    if (check === 'unknown') {
      toast.info('Não deu para confirmar o pacote agora (sem conexão?). O modelo foi salvo mesmo assim.');
    }
    onAdd({ name: finalName, packageId: parsed.packageId });
  };

  return (
    <Modal onClose={onClose} labelledBy="universe-dialog-title">
      <form onSubmit={handleSubmit} className={`${PANEL} max-w-xl`} noValidate>
        <DialogHeader
          id="universe-dialog-title"
          title="Buscar novos modelos"
          subtitle="Use modelos da comunidade Typst Universe e deixe-os salvos para os próximos trabalhos."
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <StepNumber n={1} />
              <div className="min-w-0 space-y-1.5">
                <p className="font-medium text-fg">Escolha um modelo no Typst Universe</p>
                <a
                  href={UNIVERSE_SEARCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${SECONDARY} !px-3 !py-1.5`}
                >
                  <Globe className="w-4 h-4" />
                  Abrir Typst Universe
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <StepNumber n={2} />
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-fg">Copie a linha de importação</p>
                <p className="text-fg-muted">
                  Na página do modelo, copie a linha que começa com <code className="font-mono">#import</code>, por
                  exemplo:
                </p>
                <code className="block truncate rounded-md bg-surface-sunken px-2 py-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                  #import "@preview/charged-ieee:0.1.4": ieee
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <StepNumber n={3} />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="font-medium text-fg">Cole aqui e dê um nome</p>
                <div>
                  <label htmlFor="universe-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Linha de importação
                  </label>
                  <input
                    id="universe-input"
                    type="text"
                    value={rawInput}
                    onChange={(e) => {
                      setRawInput(e.target.value);
                      setSubmitError(null);
                    }}
                    placeholder={'#import "@preview/nome-do-modelo:1.0.0"'}
                    aria-describedby={status ? statusId : undefined}
                    aria-invalid={status?.tone === 'error'}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 font-mono text-sm focus:outline-none"
                  />
                  {status && (
                    <p
                      id={statusId}
                      className={`mt-1 flex items-start gap-1.5 text-xs ${
                        status.tone === 'ok'
                          ? 'text-brand-800 dark:text-brand-300'
                          : status.tone === 'warn'
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {status.tone === 'ok' && <Check className="mt-px w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      {status.text}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Modelos populares">
                    <span className="text-xs text-fg-muted">Populares:</span>
                    {POPULAR_UNIVERSE_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setRawInput(t.id);
                          setSubmitError(null);
                        }}
                        title={`${t.title} (${t.id})`}
                        className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-slate-600 dark:text-slate-300 hover:border-slate-400"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="universe-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Nome do modelo
                  </label>
                  <input
                    id="universe-name"
                    type="text"
                    value={effectiveName}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameTouched(true);
                      setSubmitError(null);
                    }}
                    placeholder="Ex: Artigo da Revista de Educação"
                    className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-fg-muted">É assim que ele vai aparecer em "Mais modelos".</p>
                </div>
              </div>
            </li>
          </ol>

          {submitError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {submitError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-muted">
          <button type="button" onClick={onClose} className={SECONDARY}>
            Cancelar
          </button>
          <button type="submit" disabled={isChecking} className={PRIMARY}>
            {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isChecking ? 'Verificando…' : 'Adicionar modelo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const StepNumber: React.FC<{ n: number }> = ({ n }) => (
  <span
    aria-hidden="true"
    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white"
  >
    {n}
  </span>
);

/* ------------------------------------------------------------------ */
/* Renomear                                                            */
/* ------------------------------------------------------------------ */

interface RenameProjectDialogProps {
  project: DocumentProject | null;
  existingNames: string[];
  onClose: () => void;
  onRename: (project: DocumentProject, newName: string) => void;
}

export const RenameProjectDialog: React.FC<RenameProjectDialogProps> = ({ project, ...props }) => {
  if (!project) return null;
  return <RenameProjectDialogContent key={project.id} project={project} {...props} />;
};

const RenameProjectDialogContent: React.FC<
  Omit<RenameProjectDialogProps, 'project'> & { project: DocumentProject }
> = ({ project, existingNames, onClose, onRename }) => {
  const [name, setName] = useState(project.name);
  const trimmed = name.trim();
  const nameTaken =
    trimmed.toLowerCase() !== project.name.trim().toLowerCase() &&
    existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase());
  const canSave = trimmed.length > 0 && !nameTaken;

  return (
    <Modal onClose={onClose} labelledBy="rename-project-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onRename(project, trimmed);
        }}
        className={`${PANEL} max-w-md`}
      >
        <DialogHeader id="rename-project-title" title="Renomear trabalho" onClose={onClose} />
        <div className="px-5 py-4">
          <label htmlFor="rename-project-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nome do trabalho
          </label>
          <input
            id="rename-project-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            aria-invalid={nameTaken}
            aria-describedby={nameTaken ? 'rename-project-error' : undefined}
            className={`w-full text-sm px-3 py-2 rounded-lg border bg-surface focus:outline-none ${
              nameTaken ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {nameTaken && (
            <p id="rename-project-error" className="mt-1 text-xs text-red-700 dark:text-red-400">
              Já existe outro trabalho com esse nome.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-muted">
          <button type="button" onClick={onClose} className={SECONDARY}>
            Cancelar
          </button>
          <button type="submit" disabled={!canSave} className={PRIMARY}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Onde está guardado                                                  */
/* ------------------------------------------------------------------ */

interface StorageInfoDialogProps {
  project: DocumentProject | null;
  ownerLabel: string;
  isAuthenticated: boolean;
  onClose: () => void;
  onExportBackup: (project: DocumentProject) => void;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const StorageInfoDialog: React.FC<StorageInfoDialogProps> = ({
  project,
  ownerLabel,
  isAuthenticated,
  onClose,
  onExportBackup,
}) => {
  if (!project) return null;
  const driveUrl = project.driveFileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(project.driveFileId)}/view`
    : null;

  return (
    <Modal onClose={onClose} labelledBy="storage-info-title">
      <div className={`${PANEL} max-w-lg`}>
        <DialogHeader id="storage-info-title" title="Onde está guardado" subtitle={project.name} onClose={onClose} />
        <div className="px-5 py-4 space-y-3 text-sm">
          <section className="flex gap-3 rounded-xl border border-line p-3">
            <HardDrive className="w-5 h-5 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="font-semibold text-fg">Neste navegador</h3>
              <p className="mt-0.5 text-fg-muted leading-relaxed">
                Salvo automaticamente no armazenamento local deste navegador ({ownerLabel}).
                {formatDateTime(project.updatedAt) && <> Última alteração em {formatDateTime(project.updatedAt)}.</>}
              </p>
            </div>
          </section>

          <section className="flex gap-3 rounded-xl border border-line p-3">
            {project.isSharedWithMe ? (
              <Users className="w-5 h-5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
            ) : (
              <Cloud className="w-5 h-5 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-fg">Google Drive</h3>
              {project.isSharedWithMe ? (
                <p className="mt-0.5 text-fg-muted leading-relaxed">
                  Arquivo no Drive de {project.sharedBy?.name || 'quem compartilhou'}
                  {project.sharedBy?.email ? ` (${project.sharedBy.email})` : ''}, compartilhado com você.
                </p>
              ) : project.driveFileId ? (
                <p className="mt-0.5 text-fg-muted leading-relaxed">
                  Meu Drive › RedijaApp › {project.name}
                  {formatDateTime(project.driveSyncedAt) && (
                    <> · sincronizado em {formatDateTime(project.driveSyncedAt)}</>
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-fg-muted leading-relaxed">
                  {isAuthenticated
                    ? 'Ainda não sincronizado. Ele vai para o seu Drive na próxima sincronização.'
                    : 'Não está no Google Drive. Entre com sua conta Google para ter uma cópia na nuvem.'}
                </p>
              )}
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-medium text-brand-700 dark:text-brand-400 hover:underline"
                >
                  Abrir no Google Drive
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </section>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 px-5 py-3 border-t border-line bg-surface-muted">
          <button type="button" onClick={() => onExportBackup(project)} className={SECONDARY}>
            <Download className="w-4 h-4" />
            Baixar cópia de segurança (.redija)
          </button>
          <button type="button" onClick={onClose} className={PRIMARY}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Excluir de vez (digitando o nome)                                   */
/* ------------------------------------------------------------------ */

interface DeleteForeverDialogProps {
  project: DocumentProject | null;
  removesFromDrive: boolean;
  onClose: () => void;
  onConfirm: (project: DocumentProject) => void;
}

export const DeleteForeverDialog: React.FC<DeleteForeverDialogProps> = ({ project, ...props }) => {
  if (!project) return null;
  return <DeleteForeverDialogContent key={project.id} project={project} {...props} />;
};

const DeleteForeverDialogContent: React.FC<
  Omit<DeleteForeverDialogProps, 'project'> & { project: DocumentProject }
> = ({ project, removesFromDrive, onClose, onConfirm }) => {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toLowerCase() === project.name.trim().toLowerCase();

  return (
    <Modal onClose={onClose} labelledBy="delete-forever-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches) onConfirm(project);
        }}
        className={`${PANEL} max-w-md`}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-line">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="delete-forever-title" className="text-base font-semibold text-fg">
              Excluir trabalho permanentemente?
            </h2>
            <p className="mt-1 text-sm text-fg-muted leading-relaxed">
              Esta ação <strong>não pode ser desfeita</strong>. Todos os blocos, figuras e referências serão
              apagados definitivamente{removesFromDrive ? ', inclusive do seu Google Drive.' : '.'}
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <label htmlFor="delete-forever-input" className="block text-sm text-slate-700 dark:text-slate-200 mb-1">
            Para confirmar, digite o nome do trabalho:{' '}
            <strong className="font-mono text-red-700 dark:text-red-400 select-all">{project.name}</strong>
          </label>
          <input
            id="delete-forever-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={project.name}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-surface focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-muted">
          <button type="button" onClick={onClose} className={SECONDARY}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!matches}
            className="touch-target inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
          >
            Excluir Permanentemente
          </button>
        </div>
      </form>
    </Modal>
  );
};
