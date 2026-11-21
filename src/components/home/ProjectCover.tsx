import React from 'react';
import type { DocumentProject, ProjectTemplateType } from '@/types/document';

type CoverFamily = 'abnt' | 'artigo' | 'duas_colunas' | 'poster' | 'presentation' | 'branco';

function coverFamily(type?: ProjectTemplateType): CoverFamily {
  switch (type) {
    case 'artigo':
      return 'artigo';
    case 'sbc':
    case 'ieee':
    case 'universe_custom':
      return 'duas_colunas';
    case 'poster':
      return 'poster';
    case 'presentation':
      return 'presentation';
    case 'em_branco':
      return 'branco';
    default:
      return 'abnt';
  }
}

/** Cores explícitas (e não utilitários slate) para o papel continuar branco no tema escuro. */
/** Linha "de texto" abstrata: só dá forma ao papel, não precisa ser lida. */
const Line: React.FC<{ width?: string; strong?: boolean; className?: string }> = ({
  width = '100%',
  strong = false,
  className = '',
}) => (
  <span
    aria-hidden="true"
    className={`block h-[1.6cqw] rounded-full ${strong ? 'bg-[#94a3b8]' : 'bg-[#e2e8f0]'} ${className}`}
    style={{ width }}
  />
);

const Paragraph: React.FC<{ lines?: number }> = ({ lines = 4 }) => (
  <span className="flex flex-col gap-[1.6cqw]">
    {Array.from({ length: lines }, (_, i) => (
      <Line key={i} width={i === lines - 1 ? '62%' : '100%'} />
    ))}
  </span>
);

interface ProjectCoverProps {
  project: Pick<DocumentProject, 'name' | 'templateType' | 'metadata'>;
  className?: string;
}

/**
 * Miniatura ilustrativa da primeira página, desenhada em HTML/CSS a partir do
 * modelo e dos metadados do trabalho (sem compilar com o Typst). Serve só para
 * reconhecimento visual: instantânea, leve e sem estado de erro.
 */
export const ProjectCover: React.FC<ProjectCoverProps> = ({ project, className = '' }) => {
  const family = coverFamily(project.templateType);
  const meta = project.metadata;
  const title = meta?.title?.trim() || project.name;
  const author = meta?.author?.trim();
  const institution = meta?.institution?.trim();
  const footer = [meta?.location, meta?.year].filter(Boolean).join(' • ');

  return (
    <div
      aria-hidden="true"
      className={`@container relative w-full aspect-[1/1.414] overflow-hidden rounded-[2px] bg-[#ffffff] text-[#1e293b] shadow-sm ring-1 ring-black/5 font-serif select-none ${className}`}
    >
      {family === 'abnt' && (
        <div className="absolute inset-0 flex flex-col items-center text-center px-[10cqw] py-[11cqw]">
          <p className="text-[4.4cqw] font-bold uppercase leading-tight line-clamp-2">
            {institution || 'Instituição de Ensino'}
          </p>
          <p className="mt-[16cqw] text-[4cqw] uppercase line-clamp-1">{author || 'Nome do Autor'}</p>
          <p className="mt-auto text-[5.4cqw] font-bold uppercase leading-snug line-clamp-4">{title}</p>
          <span className="mt-auto mb-[2cqw] text-[3.6cqw] line-clamp-1">{footer || 'Cidade • Ano'}</span>
        </div>
      )}

      {family === 'artigo' && (
        <div className="absolute inset-0 flex flex-col px-[10cqw] py-[10cqw] gap-[3cqw]">
          <p className="text-center text-[5.2cqw] font-bold leading-snug line-clamp-3">{title}</p>
          <p className="text-center text-[3.4cqw] italic line-clamp-1">{author || 'Autoria'}</p>
          <span className="mt-[2cqw] rounded-sm bg-[#f1f5f9] p-[3cqw]">
            <Paragraph lines={3} />
          </span>
          <Line width="38%" strong className="mt-[2cqw]" />
          <Paragraph lines={6} />
          <Line width="44%" strong className="mt-[2cqw]" />
          <Paragraph lines={4} />
        </div>
      )}

      {family === 'duas_colunas' && (
        <div className="absolute inset-0 flex flex-col px-[8cqw] py-[9cqw] gap-[3cqw]">
          <p className="text-center text-[5cqw] font-bold leading-snug line-clamp-3">{title}</p>
          <p className="text-center text-[3.2cqw] italic line-clamp-1">{author || 'Autoria'}</p>
          <span className="grid grid-cols-2 gap-[5cqw] mt-[3cqw]">
            <span className="flex flex-col gap-[3cqw]">
              <Line width="45%" strong />
              <Paragraph lines={7} />
              <Line width="50%" strong />
              <Paragraph lines={5} />
            </span>
            <span className="flex flex-col gap-[3cqw]">
              <Paragraph lines={6} />
              <span className="h-[14cqw] rounded-sm bg-[#f1f5f9]" />
              <Paragraph lines={5} />
            </span>
          </span>
        </div>
      )}

      {family === 'poster' && (
        <div className="absolute inset-0 flex flex-col">
          <div className="bg-brand-800 text-white px-[7cqw] py-[6cqw]">
            <p className="text-[5.4cqw] font-bold leading-snug line-clamp-2 font-sans">{title}</p>
            <p className="mt-[1.5cqw] text-[3.2cqw] opacity-80 line-clamp-1 font-sans">
              {institution || author || 'Instituição'}
            </p>
          </div>
          <span className="flex-1 grid grid-cols-3 gap-[3cqw] p-[5cqw]">
            {[0, 1, 2].map((col) => (
              <span key={col} className="flex flex-col gap-[3cqw]">
                <span className="rounded-sm bg-[#f1f5f9] p-[2.5cqw]">
                  <Line width="70%" strong />
                  <span className="mt-[2cqw] block">
                    <Paragraph lines={4} />
                  </span>
                </span>
                <span className={`rounded-sm ${col === 1 ? 'h-[22cqw] bg-[var(--color-brand-100)]' : 'h-[14cqw] bg-[#f1f5f9]'}`} />
                <span className="rounded-sm bg-[#f1f5f9] p-[2.5cqw]">
                  <Paragraph lines={3} />
                </span>
              </span>
            ))}
          </span>
        </div>
      )}

      {family === 'presentation' && (
        <div className="absolute inset-0 flex flex-col justify-center gap-[5cqw] bg-[#f8fafc] p-[7cqw] font-sans">
          {/* Slide 16:9 de capa */}
          <div className="aspect-[16/9] w-full rounded-[3px] bg-brand-800 text-white p-[6cqw] flex flex-col justify-between shadow-xs">
            <p className="text-[3cqw] uppercase tracking-wider opacity-80 line-clamp-1">
              {institution || 'Defesa Acadêmica'}
            </p>
            <p className="text-[4.6cqw] font-bold leading-tight line-clamp-2">{title}</p>
            <p className="text-[2.8cqw] opacity-85 line-clamp-1">{author || 'Autoria'}</p>
          </div>
          {/* Mini-slide de conteúdo */}
          <div className="aspect-[16/9] w-full rounded-[3px] bg-white ring-1 ring-black/10 p-[5cqw] flex flex-col gap-[2.5cqw]">
            <Line width="55%" strong />
            <Paragraph lines={3} />
          </div>
        </div>
      )}

      {family === 'branco' && (
        <div className="absolute inset-0 flex flex-col px-[10cqw] py-[12cqw] gap-[3cqw]">
          <p className="text-[5cqw] font-bold leading-snug line-clamp-2">{title}</p>
          <Line width="70%" className="opacity-60" />
          <Line width="52%" className="opacity-60" />
        </div>
      )}
    </div>
  );
};
