import React, { useState } from 'react';
import { DocumentProject } from '@/types/document';
import { generateStandaloneTypst } from '@/core/transpiler/typstGenerator';
import { Eye, FileCode, Check, Copy } from 'lucide-react';

interface PdfPreviewProps {
  project: DocumentProject;
  showCode: boolean;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ project, showCode }) => {
  const [copied, setCopied] = useState(false);
  const typstCode = generateStandaloneTypst(project);

  const handleCopy = () => {
    navigator.clipboard.writeText(typstCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-[460px] xl:w-[540px] border-l border-neutral-200 bg-neutral-100 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Bar do Preview */}
      <div className="h-10 border-b border-neutral-200 bg-neutral-50 px-4 flex items-center justify-between text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          {showCode ? (
            <>
              <FileCode className="w-3.5 h-3.5 text-neutral-500" />
              <span className="font-medium">Código Typst Gerado (WASM)</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">Prévia da Diagramação ABNT</span>
            </>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-600">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar Typst</span>
            </>
          )}
        </button>
      </div>

      {/* Conteúdo: Código ou Visualização de Papel A4 */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        {showCode ? (
          <div className="w-full bg-neutral-900 text-neutral-100 p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
            <pre>{typstCode}</pre>
          </div>
        ) : (
          /* Folha de Papel A4 emulada */
          <div className="w-full max-w-[420px] bg-white rounded shadow-md border border-neutral-200 p-8 text-neutral-900 text-[11px] leading-relaxed flex flex-col min-h-[580px]">
            {/* Header / Capa Preview */}
            <div className="text-center mb-6">
              <p className="font-bold uppercase tracking-wider text-[10px]">
                {project.metadata.institution || 'NOME DA INSTITUIÇÃO'}
              </p>
              <p className="text-[9px] text-neutral-500 uppercase mt-0.5">
                {project.metadata.course || 'CURSO DE GRADUAÇÃO'}
              </p>
              <div className="my-6">
                <p className="font-bold text-[10px] uppercase">
                  {project.metadata.author || 'NOME DO AUTOR'}
                </p>
              </div>
              <h1 className="font-bold text-xs uppercase text-neutral-900">
                {project.metadata.title || 'TÍTULO DO TRABALHO ACADÊMICO'}
              </h1>
              {project.metadata.subtitle && (
                <p className="text-[10px] text-neutral-600 mt-0.5">
                  {project.metadata.subtitle}
                </p>
              )}
            </div>

            <div className="border-t border-neutral-100 my-4" />

            {/* Conteúdo dos Blocos */}
            <div className="space-y-3 flex-1 font-serif">
              {project.blocks.map((b) => (
                <div key={b.id}>
                  {b.type === 'h1' && (
                    <h2 className="font-bold font-sans uppercase text-[11px] text-neutral-900 mt-4 mb-1">
                      {b.content || '1 SEÇÃO'}
                    </h2>
                  )}
                  {b.type === 'h2' && (
                    <h3 className="font-bold font-sans text-[10px] text-neutral-800 mt-2 mb-1">
                      {b.content || '1.1 Subseção'}
                    </h3>
                  )}
                  {b.type === 'paragraph' && (
                    <p className="text-[10px] text-justify indent-4 leading-relaxed text-neutral-800">
                      {b.content || 'Parágrafo do texto...'}
                    </p>
                  )}
                  {b.type === 'quote_long' && (
                    <div className="pl-6 text-[9px] leading-normal italic text-neutral-600 border-l-2 border-neutral-300 my-2">
                      <p>{b.content || 'Texto da citação direta longa...'}</p>
                      <p className="text-right not-italic uppercase font-sans text-[8px] mt-1 text-neutral-500">
                        ({b.meta?.author || 'SOBRENOME'}, {b.meta?.year || 'ANO'}, p. {b.meta?.page || '0'})
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Referências no Preview */}
              {project.references.length > 0 && (
                <div className="pt-6 mt-6 border-t border-neutral-200">
                  <h3 className="text-center font-bold font-sans uppercase text-[10px] mb-2">
                    REFERÊNCIAS
                  </h3>
                  <div className="space-y-2 text-[9px] text-neutral-700">
                    {project.references.map((ref) => (
                      <p key={ref.id} className="leading-tight">
                        <strong className="uppercase">{ref.authors}.</strong>{' '}
                        <strong>{ref.title}</strong>{ref.subtitle ? `: ${ref.subtitle}` : ''}. {ref.city}: {ref.publisher}, {ref.year}.
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé A4 */}
            <div className="mt-8 pt-4 border-t border-neutral-100 flex justify-between text-[9px] text-neutral-400 font-sans">
              <span>{project.metadata.location}, {project.metadata.year}</span>
              <span>Pág. 1</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
