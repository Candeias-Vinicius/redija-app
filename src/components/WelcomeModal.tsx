import React from 'react';
import {
  X,
  CheckCircle2,
  Cpu,
  HardDrive,
  FileCheck2,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-xl w-full overflow-hidden">
        {/* Topo com destaque */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-extrabold text-xl shadow-md">
              R
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest bg-emerald-500/40 px-2 py-0.5 rounded">
                RedijaApp • ABNT Automática
              </span>
              <h2 className="text-lg font-bold mt-0.5">
                Escreva como no Notion. Exporte em ABNT real.
              </h2>
            </div>
          </div>

          <p className="text-xs text-emerald-50 leading-relaxed">
            O RedijaApp combina um editor visual de blocos com o compilador científico{' '}
            <strong>Typst</strong> rodando via WebAssembly direto no seu navegador — sem precisar
            configurar margens, sumário ou aprender LaTeX.
          </p>
        </div>

        {/* Destaques de funcionamento */}
        <div className="p-6 space-y-4 text-xs text-neutral-600">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>PDF Real no Navegador</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                A prévia à direita não é uma simulação: é o próprio PDF compilado em milissegundos
                via Web Worker.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                <span>Normas NBR 14724 / 10520 / 6023</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Capa, Folha de Rosto, Sumário automático, recuo de 1,25 cm, citações de 4 cm e
                referências em ordem alfabética.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Comandos `/` e Citações `@`</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Digite <kbd className="px-1 py-0.5 bg-white border rounded font-mono">/</kbd> para
                inserir figuras, tabelas e citações, ou{' '}
                <kbd className="px-1 py-0.5 bg-white border rounded font-mono">@</kbd> para citar
                uma obra cadastrada.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>100% Privado e Salvo Localmente</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Seus trabalhos ficam salvos automaticamente no IndexedDB do seu navegador e podem
                ser exportados em arquivos <code className="font-mono">.redija</code>.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Dica: cadastre referências colando apenas o código <strong>DOI</strong> ou{' '}
                <strong>ISBN</strong>!
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Começar a Escrever</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
