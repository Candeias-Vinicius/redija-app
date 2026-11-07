import React, { useState } from 'react';
import { DocumentMetadata, AcademicReference, DocumentProject } from '@/types/document';
import { countWords, runAbntLinter, formatShortCitation } from '@/core/transpiler/abntLinter';
import {
  BookOpen,
  Building,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  Copy,
  Check,
} from 'lucide-react';

interface SidebarProps {
  project: DocumentProject;
  metadata: DocumentMetadata;
  onChangeMetadata: (meta: DocumentMetadata) => void;
  references: AcademicReference[];
  onOpenReferenceModal: () => void;
  onRemoveReference: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  project,
  metadata,
  onChangeMetadata,
  references,
  onOpenReferenceModal,
  onRemoveReference,
}) => {
  const [openCapa, setOpenCapa] = useState(true);
  const [openPreTextual, setOpenPreTextual] = useState(false);
  const [openResumo, setOpenResumo] = useState(false);
  const [openRefs, setOpenRefs] = useState(true);
  const [openLinter, setOpenLinter] = useState(true);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  const updateField = <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => {
    onChangeMetadata({ ...metadata, [field]: value });
  };

  const abstractWordCount = countWords(metadata.abstract);
  const isAbstractCountIdeal = abstractWordCount >= 150 && abstractWordCount <= 500;
  const warnings = runAbntLinter(project);

  const handleCopyCitation = (ref: AcademicReference) => {
    const citation = formatShortCitation(ref);
    navigator.clipboard.writeText(citation);
    setCopiedRefId(ref.id);
    setTimeout(() => setCopiedRefId(null), 1800);
  };

  return (
    <aside className="w-80 border-r border-neutral-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="p-4 border-b border-neutral-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Estrutura ABNT (NBR 14724)
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure capa, elementos pré-textuais, resumo e referências.
        </p>
      </div>

      <div className="divide-y divide-neutral-100 flex-1">
        {/* Seção da Capa e Folha de Rosto */}
        <div className="p-3">
          <button
            onClick={() => setOpenCapa(!openCapa)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-neutral-400" />
              Capa & Folha de Rosto
            </span>
            {openCapa ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {openCapa && (
            <div className="space-y-2.5 mt-2.5 pl-2">
              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Título do Trabalho
                </label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Análise da Eficiência Energética..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Subtítulo (Opcional)
                </label>
                <input
                  type="text"
                  value={metadata.subtitle || ''}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Um estudo de caso regional"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Nome do Autor
                </label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Vinícius Candeias"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Orientador(a) (Opcional)
                </label>
                <input
                  type="text"
                  value={metadata.advisor || ''}
                  onChange={(e) => updateField('advisor', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Prof. Dr. Nome do Orientador"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Natureza do Trabalho (Folha de Rosto)
                </label>
                <textarea
                  rows={3}
                  value={metadata.nature || ''}
                  onChange={(e) => updateField('nature', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Trabalho de Conclusão de Curso apresentado ao..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Instituição
                </label>
                <input
                  type="text"
                  value={metadata.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Universidade Federal..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Curso / Departamento
                </label>
                <input
                  type="text"
                  value={metadata.course}
                  onChange={(e) => updateField('course', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Bacharelado em Engenharia de Software"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={metadata.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Ano
                  </label>
                  <input
                    type="text"
                    value={metadata.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    placeholder="2026"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção Elementos Pré-Textuais Opcionais */}
        <div className="p-3">
          <button
            onClick={() => setOpenPreTextual(!openPreTextual)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              Pré-Textuais & Listas
            </span>
            {openPreTextual ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {openPreTextual && (
            <div className="space-y-3 mt-2.5 pl-2 text-xs">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(metadata.includeFiguresList)}
                    onChange={(e) => updateField('includeFiguresList', e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Gerar Lista de Ilustrações automática</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(metadata.includeTablesList)}
                    onChange={(e) => updateField('includeTablesList', e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Gerar Lista de Tabelas automática</span>
                </label>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Dedicatória (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={metadata.dedicatory || ''}
                  onChange={(e) => updateField('dedicatory', e.target.value)}
                  placeholder="Ex: Dedico este trabalho aos meus pais..."
                  className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Agradecimentos (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={metadata.acknowledgments || ''}
                  onChange={(e) => updateField('acknowledgments', e.target.value)}
                  placeholder="Texto de agradecimentos..."
                  className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Epígrafe (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={metadata.epigraph || ''}
                  onChange={(e) => updateField('epigraph', e.target.value)}
                  placeholder="Citação filosófica ou epígrafe..."
                  className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600 mb-1"
                />
                <input
                  type="text"
                  value={metadata.epigraphAuthor || ''}
                  onChange={(e) => updateField('epigraphAuthor', e.target.value)}
                  placeholder="Autor da epígrafe (ex: Carl Sagan)"
                  className="w-full text-xs px-2 py-1 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Seção Resumo + Abstract */}
        <div className="p-3">
          <button
            onClick={() => setOpenResumo(!openResumo)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              Resumo & Abstract (NBR 6028)
            </span>
            {openResumo ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {openResumo && (
            <div className="space-y-2.5 mt-2 pl-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-500">
                    Resumo em Português
                  </label>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isAbstractCountIdeal
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                    title="A NBR 6028 recomenda entre 150 e 500 palavras para TCC/Monografias"
                  >
                    {abstractWordCount} / 150–500 palavras
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={metadata.abstract}
                  onChange={(e) => updateField('abstract', e.target.value)}
                  placeholder="Texto do resumo em parágrafo único (150 a 500 palavras conforme NBR 6028)..."
                  className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Palavras-chave (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={metadata.keywords.join(', ')}
                  onChange={(e) =>
                    updateField(
                      'keywords',
                      e.target.value.split(',').map((k) => k.trim()),
                    )
                  }
                  placeholder="Ex: ABNT, Typst, Editor Acadêmico"
                  className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Abstract (Língua Estrangeira — Opcional)
                </label>
                <textarea
                  rows={3}
                  value={metadata.foreignAbstract || ''}
                  onChange={(e) => updateField('foreignAbstract', e.target.value)}
                  placeholder="English abstract..."
                  className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600 mb-1.5"
                />
                <input
                  type="text"
                  value={(metadata.foreignKeywords ?? []).join(', ')}
                  onChange={(e) =>
                    updateField(
                      'foreignKeywords',
                      e.target.value.split(',').map((k) => k.trim()),
                    )
                  }
                  placeholder="Keywords separated by comma"
                  className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Seção Referências */}
        <div className="p-3">
          <div className="flex items-center justify-between py-1.5">
            <button
              onClick={() => setOpenRefs(!openRefs)}
              className="flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
            >
              <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
              <span>Referências ABNT ({references.length})</span>
            </button>
            <button
              onClick={onOpenReferenceModal}
              className="p-1 hover:bg-neutral-100 rounded text-emerald-600 hover:text-emerald-700"
              title="Adicionar Referência ABNT (Manual ou por DOI/ISBN)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {openRefs && (
            <div className="mt-2 space-y-1.5 pl-2">
              {references.length === 0 ? (
                <div className="text-[11px] text-neutral-400 py-3 text-center border border-dashed border-neutral-200 rounded-md">
                  Nenhuma referência adicionada.
                  <button
                    onClick={onOpenReferenceModal}
                    className="block mx-auto text-emerald-600 font-medium hover:underline mt-1"
                  >
                    + Adicionar por DOI/ISBN ou manual
                  </button>
                </div>
              ) : (
                references.map((ref) => (
                  <div
                    key={ref.id}
                    className="group flex items-start justify-between p-2 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs"
                  >
                    <div className="pr-2 min-w-0 flex-1">
                      <span className="font-semibold text-neutral-800 uppercase block truncate">
                        {ref.authors}
                      </span>
                      <span className="text-neutral-600 italic block truncate">
                        {ref.title}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {ref.year} • {formatShortCitation(ref)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleCopyCitation(ref)}
                        className="p-1 text-neutral-400 hover:text-emerald-600 rounded"
                        title={`Copiar citação ${formatShortCitation(ref)}`}
                      >
                        {copiedRefId === ref.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onRemoveReference(ref.id)}
                        className="p-1 text-neutral-400 hover:text-red-500 rounded"
                        title="Remover referência"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Seção Verificador ABNT (Linter) */}
        <div className="p-3">
          <button
            onClick={() => setOpenLinter(!openLinter)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  warnings.length === 0 ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
              <span>Verificador ABNT ({warnings.length})</span>
            </span>
            {openLinter ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {openLinter && (
            <div className="mt-2 space-y-1.5 pl-2">
              {warnings.length === 0 ? (
                <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tudo em conformidade com as regras verificadas da ABNT!</span>
                </div>
              ) : (
                warnings.map((w) => (
                  <div
                    key={w.id}
                    className={`p-2 rounded-md border text-[11px] space-y-0.5 ${
                      w.severity === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-blue-50/60 border-blue-200 text-blue-900'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {w.severity === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span>{w.title}</span>
                    </div>
                    <p className="text-[10px] opacity-85 leading-snug pl-5">
                      {w.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
