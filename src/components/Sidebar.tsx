import React, { useState } from 'react';
import { DocumentMetadata, AcademicReference } from '@/types/document';
import { BookOpen, Building, Plus, Trash2, ChevronDown, ChevronRight, Bookmark } from 'lucide-react';

interface SidebarProps {
  metadata: DocumentMetadata;
  onChangeMetadata: (meta: DocumentMetadata) => void;
  references: AcademicReference[];
  onOpenReferenceModal: () => void;
  onRemoveReference: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  metadata,
  onChangeMetadata,
  references,
  onOpenReferenceModal,
  onRemoveReference,
}) => {
  const [openCapa, setOpenCapa] = useState(true);
  const [openResumo, setOpenResumo] = useState(false);
  const [openRefs, setOpenRefs] = useState(true);

  const updateField = <K extends keyof DocumentMetadata>(field: K, value: DocumentMetadata[K]) => {
    onChangeMetadata({ ...metadata, [field]: value });
  };

  return (
    <aside className="w-80 border-r border-neutral-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="p-4 border-b border-neutral-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Estrutura ABNT
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Preencha os campos para gerar a capa e regras automáticas.
        </p>
      </div>

      <div className="divide-y divide-neutral-100 flex-1">
        {/* Seção da Capa */}
        <div className="p-3">
          <button
            onClick={() => setOpenCapa(!openCapa)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-neutral-400" />
              Capa & Folha de Rosto
            </span>
            {openCapa ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openCapa && (
            <div className="space-y-2.5 mt-2.5 pl-2">
              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Título do Trabalho</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Análise da Eficiência Energética..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Subtítulo (Opcional)</label>
                <input
                  type="text"
                  value={metadata.subtitle || ''}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Um estudo de caso regional"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Nome do Autor</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Vinícius Candeias"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Orientador(a) (Opcional)</label>
                <input
                  type="text"
                  value={metadata.advisor || ''}
                  onChange={(e) => updateField('advisor', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Prof. Dr. Nome do Orientador"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Natureza do Trabalho (Folha de Rosto)</label>
                <textarea
                  rows={3}
                  value={metadata.nature || ''}
                  onChange={(e) => updateField('nature', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Trabalho de Conclusão de Curso apresentado ao..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Instituição</label>
                <input
                  type="text"
                  value={metadata.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: Universidade Federal..."
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">Curso / Departamento</label>
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
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={metadata.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">Ano</label>
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

        {/* Seção Resumo */}
        <div className="p-3">
          <button
            onClick={() => setOpenResumo(!openResumo)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              Resumo & Palavras-chave
            </span>
            {openResumo ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openResumo && (
            <div className="space-y-2 mt-2 pl-2">
              <textarea
                rows={4}
                value={metadata.abstract}
                onChange={(e) => updateField('abstract', e.target.value)}
                placeholder="Texto do resumo (150 a 500 palavras conforme NBR 6028)..."
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                value={metadata.keywords.join(', ')}
                onChange={(e) => updateField('keywords', e.target.value.split(',').map((k) => k.trim()))}
                placeholder="Palavras-chave separadas por vírgula"
                className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
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
              title="Adicionar Referência ABNT"
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
                    + Adicionar referência
                  </button>
                </div>
              ) : (
                references.map((ref) => (
                  <div
                    key={ref.id}
                    className="group flex items-start justify-between p-2 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs"
                  >
                    <div className="pr-2 truncate">
                      <span className="font-semibold text-neutral-800 uppercase block truncate">
                        {ref.authors}
                      </span>
                      <span className="text-neutral-600 italic block truncate">
                        {ref.title}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {ref.year}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveReference(ref.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 rounded transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
