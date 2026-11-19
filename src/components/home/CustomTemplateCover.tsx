import React from 'react';
import type { DocumentProject } from '@/types/document';
import type { CustomTemplate } from '@/core/storage/customTemplates';
import { useUniverseThumbnail } from '@/hooks/useUniverseThumbnail';
import { ProjectCover } from './ProjectCover';

/**
 * Capa de um modelo personalizado: a imagem oficial do pacote no Typst Universe
 * (`[template] thumbnail`) quando existir; senão, a ilustração genérica de duas colunas.
 */
export const CustomTemplateCover: React.FC<{ template: CustomTemplate }> = ({ template }) => {
  const src = useUniverseThumbnail(template.packageId);

  if (!src) {
    const cover: Pick<DocumentProject, 'name' | 'templateType' | 'metadata'> = {
      name: template.name,
      templateType: 'universe_custom',
      metadata: { title: template.name } as DocumentProject['metadata'],
    };
    return <ProjectCover project={cover} />;
  }

  return (
    <span
      aria-hidden="true"
      className="relative block w-full aspect-[1/1.414] overflow-hidden rounded-[2px] bg-[#ffffff] shadow-sm ring-1 ring-black/5"
    >
      <img
        src={src}
        alt=""
        data-testid="custom-template-thumbnail"
        decoding="async"
        className="h-full w-full object-cover object-top animate-in fade-in duration-200"
      />
    </span>
  );
};
