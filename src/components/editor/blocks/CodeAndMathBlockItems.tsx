import React from 'react';
import { Code2, Scissors, Sigma, Terminal } from 'lucide-react';
import { Block } from '@/types/document';

const EQUATION_SNIPPETS = [
  { label: 'Fração (a/b)', snippet: '(a) / (b) ' },
  { label: 'Potência (x²)', snippet: 'x^2 ' },
  { label: 'Índice (x₁)', snippet: 'x_1 ' },
  { label: 'Raiz √x', snippet: 'sqrt(x) ' },
  { label: 'Somatório ∑', snippet: 'sum_(i=1)^n ' },
  { label: 'Integral ∫', snippet: 'integral_a^b ' },
  { label: 'Limite', snippet: 'lim_(x -> oo) ' },
  { label: 'Matriz 2×2', snippet: 'mat(a, b; c, d) ' },
  { label: 'α', snippet: 'alpha ' },
  { label: 'β', snippet: 'beta ' },
  { label: 'Δ', snippet: 'Delta ' },
  { label: 'π', snippet: 'pi ' },
  { label: '≠', snippet: '!= ' },
  { label: '≤', snippet: '<= ' },
  { label: '≥', snippet: '>= ' },
  { label: '≈', snippet: 'approx ' },
];

interface CodeAndMathBlockItemsProps {
  block: Block;
  autoFocus: boolean;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateMeta: (id: string, meta: NonNullable<Block['meta']>) => void;
}

export const CodeAndMathBlockItems: React.FC<CodeAndMathBlockItemsProps> = ({
  block,
  autoFocus,
  onUpdateContent,
  onUpdateMeta,
}) => {
  if (block.type === 'equation') {
    return (
      <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
            <Sigma className="w-4 h-4 text-indigo-600" />
            Equação Matemática
          </span>
          <span className="text-[10px] text-neutral-500">
            Clique nos botões abaixo para inserir símbolos
          </span>
        </div>

        {/* Barra Visual de Símbolos e Estruturas Matemáticas */}
        <div className="flex flex-wrap gap-1 bg-white p-2 rounded-lg border border-neutral-200">
          {EQUATION_SNIPPETS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => onUpdateContent(block.id, `${block.content}${btn.snippet}`)}
              className="px-2 py-1 text-[11px] font-mono bg-neutral-50 hover:bg-indigo-100 text-neutral-800 rounded border border-neutral-200 transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={block.content}
          autoFocus={autoFocus}
          onChange={(e) => onUpdateContent(block.id, e.target.value)}
          placeholder="Ex: f(x) = sum_(i=1)^n (x_i - mu)^2 / sigma^2"
          className="w-full font-mono text-xs px-3 py-2 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-indigo-600"
        />
      </div>
    );
  }

  if (block.type === 'code') {
    return (
      <div className="border border-sky-200 rounded-xl p-4 bg-neutral-50/80 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-sky-600" />
            Bloco de Código-Fonte / Algoritmo
          </span>
          <select
            value={block.meta?.language || 'python'}
            onChange={(e) => onUpdateMeta(block.id, { language: e.target.value })}
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-sky-600"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript / TypeScript</option>
            <option value="sql">SQL</option>
            <option value="c">C / C++</option>
            <option value="java">Java</option>
            <option value="r">R</option>
            <option value="txt">Pseudocódigo / Texto</option>
          </select>
        </div>

        <input
          type="text"
          value={block.meta?.caption || ''}
          onChange={(e) => onUpdateMeta(block.id, { caption: e.target.value })}
          placeholder="Título do Algoritmo / Código (ex: Cálculo da regressão linear)"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-sky-600"
        />

        <textarea
          rows={5}
          value={block.content}
          autoFocus={autoFocus}
          onChange={(e) => onUpdateContent(block.id, e.target.value)}
          placeholder="Cole ou digite o código-fonte aqui..."
          className="w-full font-mono text-xs p-3 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none leading-relaxed"
        />

        <input
          type="text"
          value={block.meta?.source || ''}
          onChange={(e) => onUpdateMeta(block.id, { source: e.target.value })}
          placeholder="Fonte (ex: Elaborado pelo autor)"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-sky-600"
        />
      </div>
    );
  }

  if (block.type === 'raw_typst') {
    return (
      <div className="border border-amber-300 rounded-xl p-3.5 bg-amber-50/40 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-amber-900 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-amber-600" />
            Bloco Typst Avançado
          </span>
          <span className="text-[10px] text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded font-medium">
            Código Typst direto (sem escape automático)
          </span>
        </div>
        <textarea
          rows={4}
          value={block.content}
          autoFocus={autoFocus}
          onChange={(e) => onUpdateContent(block.id, e.target.value)}
          placeholder="#rect(fill: luma(245), inset: 10pt, radius: 4pt)[Conteúdo Typst livre]"
          className="w-full font-mono text-xs p-3 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none leading-relaxed"
        />
      </div>
    );
  }

  return (
    <div className="my-2 flex items-center gap-3 text-[11px] text-neutral-400 select-none">
      <div className="flex-1 border-t border-dashed border-neutral-300" />
      <span className="flex items-center gap-1 font-medium uppercase tracking-wider">
        <Scissors className="w-3 h-3" /> Quebra de Página A4
      </span>
      <div className="flex-1 border-t border-dashed border-neutral-300" />
    </div>
  );
};
