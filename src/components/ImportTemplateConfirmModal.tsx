import React, { useState } from 'react';
import {
  FileText,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Table as TableIcon,
  Image as ImageIcon,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DocumentProject, ProjectTemplateType } from '@/types/document';

const TEMPLATE_FRIENDLY_NAMES: Record<ProjectTemplateType, string> = {
  tcc: 'TCC / Monografia (ABNT NBR 14724)',
  artigo: 'Artigo Científico (ABNT NBR 6022)',
  sbc: 'Artigo SBC (Sociedade Brasileira de Computação)',
  ieee: 'Artigo IEEE (Conference / Journal)',
  poster: 'Pôster Acadêmico A0/A1',
  relatorio: 'Relatório Técnico (ABNT NBR 10719)',
  projeto_pesquisa: 'Projeto de Pesquisa (ABNT NBR 15287)',
  universe_custom: 'Typst Universe (Pacote Externo)',
  em_branco: 'Modelo Personalizado (Livre)',
};

const TEMPLATE_DESCRIPTIONS: Record<ProjectTemplateType, string> = {
  tcc: 'Monografia com capa, folha de rosto, pré-textuais e sumário conforme ABNT NBR 14724.',
  artigo: 'Artigo acadêmico em coluna dupla ou simples, cabeçalho e referências ABNT NBR 6022.',
  sbc: 'Formato oficial da SBC com resumo bilíngue e normas de publicação computacional.',
  ieee: 'Layout em duas colunas estilo conferência/periódico internacional IEEE.',
  poster: 'Pôster científico visual para apresentação em congressos acadêmicos.',
  relatorio: 'Relatório técnico ou de estágio supervisionado com estrutura ABNT NBR 10719.',
  projeto_pesquisa: 'Estrutura formal para projetos de pesquisa e bolsas de iniciação científica.',
  universe_custom: 'Template comunitário carregado dinamicamente via Typst Universe.',
  em_branco: 'Estrutura livre e flexível, sem obrigatoriedade de capas ou pré-textuais rígidos.',
};

export interface ImportTemplateConfirmModalProps {
  isOpen: boolean;
  importedProject: DocumentProject | null;
  fileName: string;
  onConfirm: (chosenTemplate: ProjectTemplateType | 'custom') => void;
  onCancel: () => void;
}

export const ImportTemplateConfirmModal: React.FC<ImportTemplateConfirmModalProps> = ({
  isOpen,
  importedProject,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [selectedAlternative, setSelectedAlternative] = useState<ProjectTemplateType | ''>('');

  if (!isOpen || !importedProject) return null;

  const detectedTemplate = importedProject.templateType ?? 'artigo';
  const detectedName = TEMPLATE_FRIENDLY_NAMES[detectedTemplate] || detectedTemplate;

  // Estatísticas de conteúdo extraído
  const tableCount = importedProject.blocks.filter(
    (b) => b.type === 'table' || b.type === 'box',
  ).length;
  const imageCount = importedProject.blocks.filter((b) => b.type === 'image').length;
  const textBlockCount = importedProject.blocks.filter(
    (b) => b.type !== 'table' && b.type !== 'box' && b.type !== 'image',
  ).length;
  const refCount = importedProject.references.length;

  const handleApplyDetected = () => {
    if (selectedAlternative) {
      onConfirm(selectedAlternative);
    } else {
      onConfirm(detectedTemplate);
    }
  };

  const handleApplyCustom = () => {
    onConfirm('custom');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Modelo Detectado no Arquivo
              </h3>
              <p className="text-xs text-neutral-500 truncate max-w-xs sm:max-w-md">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
            title="Cancelar importação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Card de Detecção */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Classificação Sugerida
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {detectedName}
              </span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
              {TEMPLATE_DESCRIPTIONS[detectedTemplate] ||
                'Estrutura acadêmica identificada automaticamente pelas marcações do seu documento.'}
            </p>
          </div>

          {/* Resumo do Conteúdo Extraído */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-center">
              <div className="flex items-center justify-center text-neutral-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                {textBlockCount}
              </span>
              <span className="text-[10px] text-neutral-500">Seções / Textos</span>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-center">
              <div className="flex items-center justify-center text-purple-500 mb-1">
                <TableIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                {tableCount}
              </span>
              <span className="text-[10px] text-neutral-500">Tabelas</span>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-center">
              <div className="flex items-center justify-center text-sky-500 mb-1">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                {imageCount}
              </span>
              <span className="text-[10px] text-neutral-500">Figuras</span>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-center">
              <div className="flex items-center justify-center text-amber-500 mb-1">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                {refCount}
              </span>
              <span className="text-[10px] text-neutral-500">Referências</span>
            </div>
          </div>

          {/* Pergunta de Decisão */}
          <div className="pt-2 text-neutral-700 dark:text-neutral-300 font-medium text-xs leading-relaxed">
            Deseja aplicar as regras de formatação deste modelo ou prefere importar como{' '}
            <strong>Modelo Personalizado (Livre)</strong>?
          </div>

          {/* Opções de Ação */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleApplyDetected}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-all text-left group"
            >
              <div>
                <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>Seguir com {selectedAlternative ? TEMPLATE_FRIENDLY_NAMES[selectedAlternative] : detectedName}</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Aplica as diretrizes acadêmicas, margens e padronização do modelo detectado.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-left group"
            >
              <div>
                <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Usar Modelo Personalizado (Livre)</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Formatação aberta e flexível, sem impor regras rígidas de capa ou seções pré-textuais.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Seletor alternativo */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-500">Ou escolher outro modelo:</span>
            <select
              value={selectedAlternative}
              onChange={(e) => setSelectedAlternative(e.target.value as ProjectTemplateType)}
              className="text-xs px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Manter modelo detectado</option>
              <option value="sbc">Artigo SBC</option>
              <option value="ieee">Artigo IEEE</option>
              <option value="artigo">Artigo Científico ABNT (NBR 6022)</option>
              <option value="tcc">TCC / Monografia ABNT (NBR 14724)</option>
              <option value="relatorio">Relatório Técnico (NBR 10719)</option>
              <option value="projeto_pesquisa">Projeto de Pesquisa (NBR 15287)</option>
              <option value="poster">Pôster Acadêmico A0</option>
            </select>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
