import React, { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellOff,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Flag,
  Plus,
  Settings2,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import {
  DocumentProject,
  WritingGoals,
  WritingGoalUnit,
  WritingMilestone,
} from '@/types/document';
import {
  createEmptyWritingGoals,
  DEFAULT_REMINDER_TIME,
  formatDatePtBr,
  getChapterWordStats,
  getLast30DaysHistory,
  getLocalDateKey,
  isMilestoneAfterDeadline,
  isMilestoneOverdue,
  resolveDailyTargetLock,
  validateDeadlineDate,
  type WritingGoalStatus,
} from '@/core/goals/writingGoals';
import {
  buildGoogleCalendarUrl,
  downloadProjectCalendarIcs,
} from '@/core/goals/calendarExport';
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
} from '@/hooks/useWritingGoalReminder';
import { DailyHistoryChart } from './DailyHistoryChart';

type GoalsTabId = 'overview' | 'history' | 'settings';

interface WritingGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DocumentProject;
  goalStatus: WritingGoalStatus;
  onSaveGoals: (nextGoals: WritingGoals) => void;
}

export const WritingGoalsModal: React.FC<WritingGoalsModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <WritingGoalsModalContent {...props} />;
};

const WritingGoalsModalContent: React.FC<WritingGoalsModalProps> = ({
  onClose,
  project,
  goalStatus,
  onSaveGoals,
}) => {
  const titleId = useId();
  const goals = project.writingGoals ?? createEmptyWritingGoals();
  const todayKey = getLocalDateKey();

  const [activeTab, setActiveTab] = useState<GoalsTabId>('overview');
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);

  // Estado do formulário de prazo e meta (RDJ-06.1)
  const [deadlineDate, setDeadlineDate] = useState<string>(goals.deadlineDate ?? '');
  const [deadlineLabel, setDeadlineLabel] = useState<'entrega' | 'defesa'>(
    goals.deadlineLabel ?? 'entrega',
  );
  const [targetUnit, setTargetUnit] = useState<WritingGoalUnit>(goals.targetUnit ?? 'words');
  const [targetValueInput, setTargetValueInput] = useState<string>(
    goals.targetValue ? String(goals.targetValue) : '',
  );
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // Estado do formulário de marcos por capítulo (RDJ-06.1)
  const chapters = useMemo(() => getChapterWordStats(project.blocks), [project.blocks]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    chapters[0]?.blockId ?? '__custom__',
  );
  const [customMilestoneTitle, setCustomMilestoneTitle] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');

  // Estado de permissão de notificações (RDJ-06.5)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermissionState(),
  );

  const chartPoints = useMemo(
    () => getLast30DaysHistory(project.writingGoals, todayKey),
    [project.writingGoals, todayKey],
  );

  const googleCalendarUrl = useMemo(() => buildGoogleCalendarUrl(project), [project]);

  const effectiveDeadline = deadlineDate.trim() || goals.deadlineDate;
  const milestoneAfterDeadlineWarning = isMilestoneAfterDeadline(
    milestoneDueDate,
    effectiveDeadline,
  );

  const handleSaveDeadlineAndTarget = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedDate = deadlineDate.trim();
    const dateErr = validateDeadlineDate(trimmedDate, todayKey);
    if (dateErr) {
      setDeadlineError(dateErr);
      return;
    }
    setDeadlineError(null);

    const parsedTarget = targetValueInput.trim() ? Number(targetValueInput.trim()) : undefined;
    if (
      targetValueInput.trim() &&
      (parsedTarget === undefined || !Number.isFinite(parsedTarget) || parsedTarget <= 0)
    ) {
      toast.error('Informe uma meta numérica maior que zero.');
      return;
    }

    const nowIso = new Date().toISOString();
    const nextBase: WritingGoals = {
      ...goals,
      deadlineDate: trimmedDate || undefined,
      deadlineLabel,
      targetUnit,
      targetValue: parsedTarget ? Math.round(parsedTarget) : undefined,
      updatedAt: nowIso,
    };

    const currentTotal =
      nextBase.targetUnit === 'pages'
        ? (goalStatus.textualPages ?? 0)
        : goalStatus.currentWords;
    const nextLock = resolveDailyTargetLock(nextBase, currentTotal, todayKey);

    onSaveGoals({
      ...nextBase,
      dailyTargetLock: nextLock,
    });
    toast.success('Prazo e meta salvos no projeto.');
    setActiveTab('overview');
  };

  const handleAddMilestone = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedChapter = chapters.find((c) => c.blockId === selectedChapterId);
    const title =
      selectedChapterId === '__custom__' || !selectedChapter
        ? customMilestoneTitle.trim()
        : selectedChapter.title;

    if (!title) {
      toast.error('Escolha um capítulo ou informe o nome do marco.');
      return;
    }
    if (!milestoneDueDate.trim()) {
      toast.error('Informe a data do marco.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newMilestone: WritingMilestone = {
      id: crypto.randomUUID(),
      ...(selectedChapter && selectedChapterId !== '__custom__'
        ? { chapterBlockId: selectedChapter.blockId }
        : {}),
      title,
      dueDate: milestoneDueDate.trim(),
      completed: false,
      updatedAt: nowIso,
    };

    onSaveGoals({
      ...goals,
      milestones: [...goals.milestones, newMilestone].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate),
      ),
      updatedAt: nowIso,
    });
    setCustomMilestoneTitle('');
    setMilestoneDueDate('');
    toast.success(`Marco "${title}" adicionado.`);
  };

  const handleToggleMilestoneCompleted = (milestoneId: string) => {
    const nowIso = new Date().toISOString();
    onSaveGoals({
      ...goals,
      milestones: goals.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed, updatedAt: nowIso } : m,
      ),
      updatedAt: nowIso,
    });
  };

  const handleRemoveMilestone = (milestoneId: string) => {
    const nowIso = new Date().toISOString();
    onSaveGoals({
      ...goals,
      milestones: goals.milestones.filter((m) => m.id !== milestoneId),
      updatedAt: nowIso,
    });
  };

  const handleToggleReminder = async () => {
    const currentlyEnabled = Boolean(goals.reminder?.enabled);
    const nowIso = new Date().toISOString();

    if (currentlyEnabled) {
      onSaveGoals({
        ...goals,
        reminder: {
          enabled: false,
          time: goals.reminder?.time ?? DEFAULT_REMINDER_TIME,
          lastNotifiedDate: goals.reminder?.lastNotifiedDate,
        },
        updatedAt: nowIso,
      });
      toast.info('Lembrete diário desativado.');
      return;
    }

    const currentPerm = getNotificationPermissionState();
    setNotificationPermission(currentPerm);

    if (currentPerm === 'unsupported') {
      toast.error('Este navegador não oferece suporte a notificações locais.');
      return;
    }

    if (currentPerm === 'denied') {
      toast.error(
        'As notificações estão bloqueadas no navegador. Reative a permissão nas configurações do site.',
      );
      return;
    }

    let finalPerm: NotificationPermission = currentPerm;
    if (currentPerm === 'default') {
      try {
        finalPerm = await Notification.requestPermission();
        setNotificationPermission(finalPerm);
      } catch {
        setNotificationPermission('denied');
        return;
      }
    }

    if (finalPerm !== 'granted') {
      toast.info('Permissão de notificações não concedida. Nenhum lembrete será enviado.');
      return;
    }

    onSaveGoals({
      ...goals,
      reminder: {
        enabled: true,
        time: goals.reminder?.time ?? DEFAULT_REMINDER_TIME,
        lastNotifiedDate: goals.reminder?.lastNotifiedDate,
      },
      updatedAt: nowIso,
    });
    toast.success('Lembrete diário ativado.');
  };

  const handleReminderTimeChange = (nextTime: string) => {
    const nowIso = new Date().toISOString();
    onSaveGoals({
      ...goals,
      reminder: {
        enabled: Boolean(goals.reminder?.enabled),
        time: nextTime || DEFAULT_REMINDER_TIME,
        lastNotifiedDate: goals.reminder?.lastNotifiedDate,
      },
      updatedAt: nowIso,
    });
  };

  const handleDownloadIcs = () => {
    setIsCalendarMenuOpen(false);
    const ok = downloadProjectCalendarIcs(project);
    if (ok) {
      toast.success('Arquivo .ics baixado! Importe-o no Google Agenda ou Outlook.');
    }
  };

  // Mapeia marcos por capítulo (chapterBlockId) e marcos avulsos
  const milestonesByChapterId = useMemo(() => {
    const map = new Map<string, WritingMilestone[]>();
    for (const m of goals.milestones) {
      if (m.chapterBlockId) {
        const list = map.get(m.chapterBlockId) ?? [];
        list.push(m);
        map.set(m.chapterBlockId, list);
      }
    }
    return map;
  }, [goals.milestones]);

  const unlinkedMilestones = useMemo(() => {
    const chapterIds = new Set(chapters.map((c) => c.blockId));
    return goals.milestones.filter((m) => !m.chapterBlockId || !chapterIds.has(m.chapterBlockId));
  }, [goals.milestones, chapters]);

  const tabs: Array<{ id: GoalsTabId; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Visão Geral', icon: <Target className="w-4 h-4" /> },
    { id: 'history', label: 'Histórico (30d)', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurar & Lembretes', icon: <Settings2 className="w-4 h-4" /> },
  ];

  const unitLabel = goalStatus.targetUnit === 'pages' ? 'páginas' : 'palavras';

  return (
    <Modal onClose={onClose} labelledBy={titleId} closeOnBackdrop>
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold text-fg truncate">
                Prazos e Metas de Escrita
              </h2>
              <p className="text-xs text-fg-muted truncate">
                {project.name} • Dados salvos apenas no seu navegador e Drive
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-sunken transition-colors"
            aria-label="Fechar painel de prazos e metas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div
          className="px-5 pt-2 border-b border-line flex items-center gap-1 overflow-x-auto bg-surface-sunken/30"
          role="tablist"
          aria-label="Seções do painel de metas"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'overview' && (
            <>
              {/* Estado vazio: projeto sem prazo nem meta */}
              {goalStatus.state === 'unconfigured' ? (
                <div className="rounded-xl border border-dashed border-line bg-surface-sunken/40 p-6 text-center space-y-3">
                  <div className="mx-auto w-11 h-11 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-fg">
                      Defina o prazo e a meta do seu trabalho
                    </h3>
                    <p className="text-xs text-fg-muted max-w-md mx-auto">
                      Informe a data de entrega ou defesa e o tamanho esperado em palavras ou páginas.
                      O Redija calcula quanto escrever por dia e acompanha seu ritmo automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Definir prazo e meta</span>
                  </button>
                </div>
              ) : (
                /* Cartão principal de status diário (RDJ-06.2) */
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    goalStatus.state === 'total_reached' || goalStatus.state === 'today_reached'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                      : goalStatus.state === 'deadline_passed'
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
                        : 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-200/80 dark:border-brand-800/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {goalStatus.state === 'total_reached' ||
                        goalStatus.state === 'today_reached' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : goalStatus.state === 'deadline_passed' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Target className="w-5 h-5 text-brand-700 dark:text-brand-400 shrink-0" />
                        )}
                        <h3 className="text-sm font-bold text-fg">{goalStatus.statusMessage}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted pl-7">
                        {goals.deadlineDate && (
                          <span>
                            {goals.deadlineLabel === 'defesa' ? 'Defesa' : 'Entrega'}:{' '}
                            <strong className="text-fg">{formatDatePtBr(goals.deadlineDate)}</strong>
                            {goalStatus.remainingDays !== null && goalStatus.remainingDays > 0 && (
                              <span>
                                {' '}
                                ({goalStatus.remainingDays}{' '}
                                {goalStatus.remainingDays === 1 ? 'dia restante' : 'dias restantes'})
                              </span>
                            )}
                          </span>
                        )}
                        {goalStatus.dailyTarget !== null &&
                          goalStatus.dailyTarget > 0 &&
                          !goalStatus.isTotalGoalReached &&
                          !goalStatus.isDeadlinePassed && (
                            <span>
                              Meta de hoje:{' '}
                              <strong className="text-fg">
                                {goalStatus.dailyTarget.toLocaleString('pt-BR')} {unitLabel}
                              </strong>
                            </span>
                          )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-sunken text-fg transition-colors"
                    >
                      {goalStatus.state === 'deadline_passed' ? 'Atualizar data' : 'Editar meta'}
                    </button>
                  </div>

                  {/* Barra de progresso do dia (quando meta diária em palavras está ativa) */}
                  {goalStatus.dailyTarget !== null &&
                    goalStatus.dailyTarget > 0 &&
                    goalStatus.targetUnit === 'words' &&
                    !goalStatus.isTotalGoalReached &&
                    !goalStatus.isDeadlinePassed && (
                      <div className="space-y-1 pl-7">
                        <div className="flex items-center justify-between text-xs text-fg-muted">
                          <span>
                            Escritas hoje:{' '}
                            <strong className="text-fg">
                              {Math.max(0, goalStatus.todayNetWords).toLocaleString('pt-BR')}
                            </strong>{' '}
                            / {goalStatus.dailyTarget.toLocaleString('pt-BR')} palavras
                          </span>
                          <span className="font-semibold text-fg">
                            {goalStatus.todayProgressPct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              goalStatus.isTodayGoalReached
                                ? 'bg-emerald-500'
                                : 'bg-brand-600 dark:bg-brand-500'
                            }`}
                            style={{ width: `${goalStatus.todayProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Progresso total */}
              <div className="rounded-xl border border-line bg-surface p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                    Progresso Total
                  </h4>
                  <span className="text-xs font-semibold text-fg">
                    {goalStatus.currentTotal.toLocaleString('pt-BR')}
                    {goalStatus.targetValue
                      ? ` / ${goalStatus.targetValue.toLocaleString('pt-BR')} ${unitLabel} (${goalStatus.progressPct}%)`
                      : ` ${unitLabel}`}
                  </span>
                </div>

                {goalStatus.targetValue ? (
                  <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        goalStatus.isTotalGoalReached
                          ? 'bg-emerald-500'
                          : 'bg-brand-600 dark:bg-brand-500'
                      }`}
                      style={{ width: `${goalStatus.progressPct}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-fg-muted">
                    Total atual: {goalStatus.currentWords.toLocaleString('pt-BR')} palavras
                    {goalStatus.textualPages !== undefined
                      ? ` • ${goalStatus.textualPages} ${goalStatus.textualPages === 1 ? 'página textual' : 'páginas textuais'} no último PDF`
                      : ''}
                    .
                  </p>
                )}

                {goalStatus.targetUnit === 'pages' && (
                  <p className="text-[11px] text-fg-muted">
                    Baseado na contagem de páginas textuais do último PDF compilado (
                    {goalStatus.currentWords.toLocaleString('pt-BR')} palavras no documento).
                  </p>
                )}
              </div>

              {/* Exportar para agenda (RDJ-06.4) */}
              <div className="rounded-xl border border-line bg-surface p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                    <CalendarPlus className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                    <span>Agenda</span>
                  </h4>
                  <p className="text-xs text-fg-muted">
                    {goalStatus.hasDeadline
                      ? 'Exporte a entrega e os marcos com lembrete 1 dia antes.'
                      : 'Defina uma data de entrega para habilitar a exportação para sua agenda.'}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    disabled={!goalStatus.hasDeadline}
                    onClick={() => setIsCalendarMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-sunken text-xs font-semibold text-fg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={
                      goalStatus.hasDeadline
                        ? 'Exportar entrega e marcos para sua agenda'
                        : 'Defina uma data de entrega primeiro'
                    }
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400" />
                    <span>Adicionar à agenda</span>
                  </button>

                  {isCalendarMenuOpen && goalStatus.hasDeadline && (
                    <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-line bg-surface shadow-xl py-1 z-20 text-xs">
                      <button
                        type="button"
                        onClick={handleDownloadIcs}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-fg hover:bg-surface-sunken transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400 shrink-0" />
                        <span>Baixar arquivo (.ics)</span>
                      </button>
                      {googleCalendarUrl && (
                        <a
                          href={googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsCalendarMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-fg hover:bg-surface-sunken transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400 shrink-0" />
                          <span>Adicionar ao Google Agenda</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progresso por capítulo e marcos (RDJ-06.3) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                    Progresso por Capítulo &amp; Marcos
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:underline"
                  >
                    + Gerenciar marcos
                  </button>
                </div>

                {chapters.length === 0 && goals.milestones.length === 0 ? (
                  <p className="text-xs text-fg-muted rounded-lg border border-line p-3 bg-surface-sunken/30">
                    Adicione títulos de nível 1 (capítulos) no editor para acompanhar a contagem de
                    palavras por capítulo e criar marcos.
                  </p>
                ) : (
                  <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                    {chapters.map((chapter) => {
                      const chapterMilestones = milestonesByChapterId.get(chapter.blockId) ?? [];
                      return (
                        <div key={chapter.blockId} className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-fg truncate">
                              {chapter.chapterIndex}. {chapter.title}
                            </span>
                            <span className="text-xs font-semibold text-fg-muted shrink-0">
                              {chapter.words.toLocaleString('pt-BR')}{' '}
                              {chapter.words === 1 ? 'palavra' : 'palavras'}
                            </span>
                          </div>
                          {chapterMilestones.map((m) => {
                            const overdue = isMilestoneOverdue(m, todayKey);
                            return (
                              <div
                                key={m.id}
                                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs ${
                                  overdue
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
                                    : m.completed
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-surface-sunken/70 text-fg-muted'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(m.completed)}
                                    onChange={() => handleToggleMilestoneCompleted(m.id)}
                                    className="rounded border-line text-brand-600 focus:ring-brand-500"
                                  />
                                  <Flag className="w-3 h-3 shrink-0" />
                                  <span className={m.completed ? 'line-through' : ''}>
                                    Até {formatDatePtBr(m.dueDate)}
                                  </span>
                                </label>
                                {overdue && (
                                  <span className="font-bold uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 shrink-0">
                                    Atrasado
                                  </span>
                                )}
                                {m.completed && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold shrink-0">
                                    <Check className="w-3 h-3" /> Concluído
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Marcos personalizados ou de capítulos removidos */}
                    {unlinkedMilestones.map((m) => {
                      const overdue = isMilestoneOverdue(m, todayKey);
                      return (
                        <div
                          key={m.id}
                          className={`p-3 flex items-center justify-between gap-2 text-xs ${
                            overdue
                              ? 'bg-red-50/80 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                              : ''
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              checked={Boolean(m.completed)}
                              onChange={() => handleToggleMilestoneCompleted(m.id)}
                              className="rounded border-line text-brand-600 focus:ring-brand-500"
                            />
                            <Flag className="w-3.5 h-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                            <span
                              className={`font-medium truncate ${m.completed ? 'line-through text-fg-muted' : 'text-fg'}`}
                            >
                              {m.title}
                            </span>
                            <span className="text-fg-muted shrink-0">
                              • até {formatDatePtBr(m.dueDate)}
                            </span>
                          </label>
                          {overdue && (
                            <span className="font-bold uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 shrink-0">
                              Atrasado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && <DailyHistoryChart points={chartPoints} />}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* 1. Prazo e Meta Total (RDJ-06.1) */}
              <form
                onSubmit={handleSaveDeadlineAndTarget}
                className="rounded-xl border border-line bg-surface p-4 space-y-4"
              >
                <h3 className="text-sm font-bold text-fg flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                  <span>Prazo e Meta Total</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="goals-deadline-date" className="block text-xs font-semibold text-fg">
                      Data de entrega ou defesa
                    </label>
                    <input
                      id="goals-deadline-date"
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => {
                        setDeadlineDate(e.target.value);
                        setDeadlineError(null);
                      }}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="goals-deadline-label" className="block text-xs font-semibold text-fg">
                      Tipo do prazo
                    </label>
                    <select
                      id="goals-deadline-label"
                      value={deadlineLabel}
                      onChange={(e) =>
                        setDeadlineLabel(e.target.value === 'defesa' ? 'defesa' : 'entrega')
                      }
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="entrega">Data de entrega</option>
                      <option value="defesa">Data de defesa</option>
                    </select>
                  </div>
                </div>

                {deadlineError && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deadlineError}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="goals-target-value" className="block text-xs font-semibold text-fg">
                      Meta total ({targetUnit === 'pages' ? 'páginas' : 'palavras'})
                    </label>
                    <input
                      id="goals-target-value"
                      type="number"
                      min={1}
                      step={1}
                      placeholder={targetUnit === 'pages' ? 'Ex.: 50' : 'Ex.: 20000'}
                      value={targetValueInput}
                      onChange={(e) => setTargetValueInput(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-fg">Unidade da meta</span>
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-sunken p-1">
                      <button
                        type="button"
                        onClick={() => setTargetUnit('words')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          targetUnit === 'words'
                            ? 'bg-surface text-brand-700 dark:text-brand-400 shadow-xs'
                            : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        Palavras
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetUnit('pages')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          targetUnit === 'pages'
                            ? 'bg-surface text-brand-700 dark:text-brand-400 shadow-xs'
                            : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        Páginas
                      </button>
                    </div>
                  </div>
                </div>

                {targetUnit === 'pages' && (
                  <p className="text-xs text-fg-muted">
                    A meta em páginas usa a contagem de páginas textuais do último PDF compilado
                    {goalStatus.textualPages !== undefined
                      ? ` (atual: ${goalStatus.textualPages}).`
                      : ' (abra a prévia do PDF para atualizar a contagem).'}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar prazo e meta</span>
                  </button>
                </div>
              </form>

              {/* 2. Marcos por Capítulo (RDJ-06.1) */}
              <form
                onSubmit={handleAddMilestone}
                className="rounded-xl border border-line bg-surface p-4 space-y-3"
              >
                <h3 className="text-sm font-bold text-fg flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                  <span>Marcos por Capítulo</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="milestone-chapter" className="block text-xs font-semibold text-fg">
                      Capítulo
                    </label>
                    <select
                      id="milestone-chapter"
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {chapters.map((ch) => (
                        <option key={ch.blockId} value={ch.blockId}>
                          {ch.chapterIndex}. {ch.title}
                        </option>
                      ))}
                      <option value="__custom__">Outro marco personalizado…</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="milestone-due-date" className="block text-xs font-semibold text-fg">
                      Data do marco
                    </label>
                    <input
                      id="milestone-due-date"
                      type="date"
                      value={milestoneDueDate}
                      onChange={(e) => setMilestoneDueDate(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {selectedChapterId === '__custom__' && (
                  <div className="space-y-1">
                    <label htmlFor="milestone-custom-title" className="block text-xs font-semibold text-fg">
                      Nome do marco
                    </label>
                    <input
                      id="milestone-custom-title"
                      type="text"
                      placeholder="Ex.: Referencial Teórico"
                      value={customMilestoneTitle}
                      onChange={(e) => setCustomMilestoneTitle(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                {milestoneAfterDeadlineWarning && (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      Atenção: este marco está depois da data de entrega (
                      {effectiveDeadline ? formatDatePtBr(effectiveDeadline) : ''}), mas você ainda
                      pode salvá-lo.
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-sunken text-xs font-semibold text-fg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400" />
                    <span>Adicionar marco</span>
                  </button>
                </div>

                {goals.milestones.length > 0 && (
                  <ul className="divide-y divide-line border-t border-line pt-2">
                    {goals.milestones.map((m) => (
                      <li
                        key={m.id}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-fg">{m.title}</span>
                          <span className="text-fg-muted"> • até {formatDatePtBr(m.dueDate)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(m.id)}
                          className="p-1 rounded text-fg-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          aria-label={`Remover marco ${m.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </form>

              {/* 3. Lembrete diário com o app aberto (RDJ-06.5) */}
              <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-fg flex items-center gap-1.5">
                      {goals.reminder?.enabled ? (
                        <Bell className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                      ) : (
                        <BellOff className="w-4 h-4 text-fg-muted" />
                      )}
                      <span>Lembrete diário</span>
                    </h3>
                    <p className="text-xs text-fg-muted">
                      Envia no máximo 1 notificação por dia enquanto o Redija estiver aberto, caso
                      você ainda não tenha atingido a meta de hoje.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(goals.reminder?.enabled)}
                    onClick={() => void handleToggleReminder()}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      goals.reminder?.enabled
                        ? 'bg-brand-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    aria-label="Ativar ou desativar lembrete diário"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        goals.reminder?.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {goals.reminder?.enabled && notificationPermission === 'granted' && (
                  <div className="flex items-center gap-3 pt-1">
                    <label
                      htmlFor="goals-reminder-time"
                      className="text-xs font-semibold text-fg flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-fg-muted" />
                      <span>Horário do lembrete:</span>
                    </label>
                    <input
                      id="goals-reminder-time"
                      type="time"
                      value={goals.reminder.time || DEFAULT_REMINDER_TIME}
                      onChange={(e) => handleReminderTimeChange(e.target.value)}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                {notificationPermission === 'denied' && (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1"
                  >
                    <p className="font-semibold">Notificações bloqueadas no navegador</p>
                    <p>
                      Para reativar, clique no ícone de cadeado (ou ajustes) ao lado do endereço do
                      site na barra do navegador, altere <strong>Notificações</strong> para{' '}
                      <strong>Permitir</strong> e recarregue a página. Enquanto estiver bloqueado,
                      nenhuma notificação será enviada.
                    </p>
                  </div>
                )}

                {notificationPermission === 'unsupported' && (
                  <p className="text-xs text-fg-muted">
                    Este navegador não oferece suporte à API de notificações.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
