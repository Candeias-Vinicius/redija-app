import React, { useMemo, useState } from 'react';
import { Flame, CalendarDays, TrendingUp } from 'lucide-react';
import {
  ACTIVE_DAY_MIN_WORDS,
  type DailyChartPoint,
} from '@/core/goals/writingGoals';

interface DailyHistoryChartProps {
  points: DailyChartPoint[];
}

export const DailyHistoryChart: React.FC<DailyHistoryChartProps> = ({ points }) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const stats = useMemo(() => {
    const activeDays = points.filter((p) => p.isActive).length;
    const totalPositiveNet = points.reduce((acc, p) => acc + Math.max(0, p.netWords), 0);
    const maxNet = Math.max(ACTIVE_DAY_MIN_WORDS, ...points.map((p) => Math.max(0, p.netWords)));
    const avgActive = activeDays > 0 ? Math.round(totalPositiveNet / activeDays) : 0;
    return { activeDays, totalPositiveNet, maxNet, avgActive };
  }, [points]);

  const activePoint =
    points.find((p) => p.date === hoveredDate) ??
    points[points.length - 1] ??
    null;

  return (
    <div className="space-y-4">
      {/* Cartões de resumo */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-line bg-surface-sunken/60 p-3">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Flame className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Dias ativos (30d)</span>
          </div>
          <p className="mt-1 text-lg font-bold text-fg">
            {stats.activeDays}
            <span className="text-xs font-normal text-fg-muted"> / 30</span>
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface-sunken/60 p-3">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <TrendingUp className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Palavras (30d)</span>
          </div>
          <p className="mt-1 text-lg font-bold text-fg">
            {stats.totalPositiveNet.toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface-sunken/60 p-3">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <CalendarDays className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Média / dia ativo</span>
          </div>
          <p className="mt-1 text-lg font-bold text-fg">
            {stats.avgActive.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Gráfico de barras dos últimos 30 dias */}
      <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-fg">Palavras líquidas nos últimos 30 dias</h4>
            <p className="text-xs text-fg-muted">
              Dia ativo = pelo menos {ACTIVE_DAY_MIN_WORDS} palavras líquidas (fuso local).
            </p>
          </div>
          {activePoint && (
            <div className="text-right text-xs">
              <span className="font-semibold text-fg">
                {activePoint.isToday ? 'Hoje' : activePoint.fullLabel}:
              </span>{' '}
              <span
                className={
                  activePoint.isActive
                    ? 'font-semibold text-brand-700 dark:text-brand-400'
                    : 'text-fg-muted'
                }
              >
                {activePoint.netWords >= 0 ? '+' : ''}
                {activePoint.netWords.toLocaleString('pt-BR')} palavras
              </span>
              {activePoint.isActive && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800 dark:text-brand-300">
                  Dia ativo
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className="relative h-36 flex items-end gap-1 pt-4 pb-1"
          role="img"
          aria-label={`Gráfico de barras dos últimos 30 dias: ${stats.activeDays} dias ativos e ${stats.totalPositiveNet.toLocaleString('pt-BR')} palavras líquidas.`}
        >
          {/* Linha de referência de 50 palavras (dia ativo) */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brand-400/50 dark:border-brand-500/40"
            style={{
              bottom: `${Math.max(8, Math.round((ACTIVE_DAY_MIN_WORDS / stats.maxNet) * 100))}%`,
            }}
            aria-hidden="true"
          />

          {points.map((point) => {
            const positiveWords = Math.max(0, point.netWords);
            const heightPct =
              positiveWords === 0
                ? 4
                : Math.max(10, Math.round((positiveWords / stats.maxNet) * 100));
            const isSelected = activePoint?.date === point.date;

            return (
              <button
                key={point.date}
                type="button"
                onMouseEnter={() => setHoveredDate(point.date)}
                onFocus={() => setHoveredDate(point.date)}
                onClick={() => setHoveredDate(point.date)}
                aria-label={`${point.fullLabel}: ${point.netWords} palavras líquidas${point.isActive ? ' (dia ativo)' : ''}`}
                title={`${point.fullLabel}: ${point.netWords >= 0 ? '+' : ''}${point.netWords} palavras${point.isActive ? ' • Dia ativo' : ''}`}
                className="group flex-1 h-full flex items-end justify-center focus:outline-none"
              >
                <span
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t transition-all ${
                    point.isActive
                      ? isSelected
                        ? 'bg-brand-700 dark:bg-brand-400 ring-2 ring-brand-300 dark:ring-brand-700'
                        : 'bg-brand-600 dark:bg-brand-500 group-hover:bg-brand-700'
                      : positiveWords > 0
                        ? isSelected
                          ? 'bg-slate-500 dark:bg-slate-400'
                          : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400'
                        : isSelected
                          ? 'bg-slate-300 dark:bg-slate-600'
                          : 'bg-slate-200/80 dark:bg-slate-800'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Rótulos do eixo X */}
        <div className="flex items-center justify-between text-[11px] text-fg-muted">
          <span>{points[0]?.shortLabel}</span>
          <span>{points[Math.floor(points.length / 2)]?.shortLabel}</span>
          <span>Hoje ({points[points.length - 1]?.shortLabel})</span>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-line text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-brand-600 dark:bg-brand-500" />
            Dia ativo (≥ {ACTIVE_DAY_MIN_WORDS} palavras)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600" />
            Abaixo de {ACTIVE_DAY_MIN_WORDS} palavras
          </span>
        </div>
      </div>
    </div>
  );
};
