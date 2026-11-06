import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { DocumentProject, DocumentMetadata, Block, AcademicReference } from '@/types/document';
import { generateTypstCode } from '@/core/transpiler/typstGenerator';

const initialProject: DocumentProject = {
  id: 'proj_1',
  name: 'Meu Trabalho Acadêmico ABNT',
  updatedAt: new Date().toISOString(),
  metadata: {
    title: 'Desenvolvimento de uma Plataforma Automatizada para Redação Científica em Conformidade com as Normas da ABNT',
    subtitle: 'Um estudo de caso em tecnologias baseadas em WebAssembly e Typst',
    author: 'Vinícius Candeias',
    advisor: 'Prof. Dr. Orientador',
    institution: 'Universidade Federal de Tecnologia',
    course: 'Bacharelado em Ciência da Computação',
    location: 'São Paulo',
    year: '2026',
    abstract: 'Este projeto apresenta a concepção e implementação do RedijaApp, uma plataforma web focada em simplificar a escrita acadêmica para estudantes universitários. Utilizando o compilador Typst executado via WebAssembly no navegador e uma interface intuitiva orientada a blocos, o sistema automatiza a formatação rigorosa exigida pela ABNT, eliminando a barreira técnica associada a ferramentas como LaTeX.',
    keywords: ['ABNT', 'Typst', 'WebAssembly', 'Editor Acadêmico', 'Produtividade'],
  },
  blocks: [
    {
      id: 'b1',
      type: 'h1',
      content: '1 INTRODUÇÃO',
    },
    {
      id: 'b2',
      type: 'paragraph',
      content: 'A elaboração de trabalhos acadêmicos no Brasil impõe aos estudantes um duplo desafio: a pesquisa científica e o cumprimento rigoroso das diretrizes de diagramação estabelecidas pela Associação Brasileira de Normas Técnicas (ABNT). Ferramentas como o Microsoft Word demandam ajustes manuais suscetíveis a erros, enquanto o ecossistema LaTeX apresenta uma curva de aprendizado íngreme para pesquisadores sem formação em computação.',
    },
    {
      id: 'b3',
      type: 'h2',
      content: '1.1 Justificativa e Objetivos',
    },
    {
      id: 'b4',
      type: 'paragraph',
      content: 'O objetivo principal deste projeto é democratizar o acesso à tipografia de alta qualidade, garantindo que o autor concentre seus esforços no conteúdo intelectual e na argumentação, delegando toda a complexidade de regras de paginação, citações e referências ao motor automatizado.',
    },
    {
      id: 'b5',
      type: 'quote_long',
      content: 'A simplificação das interfaces de escrita científica não deve comprometer a fidelidade tipográfica ou o rigor metodológico, mas sim atuar como um catalisador para a disseminação do conhecimento acessível.',
      meta: {
        author: 'SILVA',
        year: '2023',
        page: '42',
      },
    },
    {
      id: 'b6',
      type: 'h1',
      content: '2 METODOLOGIA E ARQUITETURA',
    },
    {
      id: 'b7',
      type: 'paragraph',
      content: 'A arquitetura do RedijaApp divide-se em três camadas principais: uma interface de usuário visual e interativa com atalhos de barra, um módulo transpilador que gera representações formais do documento e o compilador de alto desempenho Typst.',
    },
    {
      id: 'b8',
      type: 'image',
      content: '',
      meta: {
        caption: 'Fluxo de dados da arquitetura do RedijaApp',
        source: 'Dados da pesquisa, 2026',
      },
    },
  ],
  references: [
    {
      id: 'ref1',
      authors: 'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS',
      title: 'NBR 14724: Informação e documentação: Trabalhos acadêmicos: Apresentação',
      city: 'Rio de Janeiro',
      publisher: 'ABNT',
      year: '2011',
    },
    {
      id: 'ref2',
      authors: 'SILVA, Roberto Carlos; SOUZA, Maria Fernanda',
      title: 'Tipografia digital e a evolução dos sistemas de editoração científica',
      edition: '3',
      city: 'São Paulo',
      publisher: 'Editora Acadêmica',
      year: '2023',
    },
  ],
};

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(initialProject);
  const [showCode, setShowCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMetadataChange = (metadata: DocumentMetadata) => {
    setProject((prev) => ({ ...prev, metadata }));
  };

  const handleBlocksChange = (blocks: Block[]) => {
    setProject((prev) => ({ ...prev, blocks }));
  };

  const handleAddReference = (ref: AcademicReference) => {
    setProject((prev) => ({
      ...prev,
      references: [...prev.references, ref],
    }));
  };

  const handleRemoveReference = (id: string) => {
    setProject((prev) => ({
      ...prev,
      references: prev.references.filter((r) => r.id !== id),
    }));
  };

  const handleExportTypst = () => {
    const code = generateTypstCode(project);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.typ`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTypst = () => {
    const code = generateTypstCode(project);
    navigator.clipboard.writeText(code);
    alert('Código Typst copiado para a área de transferência!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 select-none">
      <Header
        projectName={project.name}
        onExportTypst={handleExportTypst}
        onCopyTypst={handleCopyTypst}
        showCode={showCode}
        setShowCode={setShowCode}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Metadados ABNT e Referências */}
        <Sidebar
          metadata={project.metadata}
          onChangeMetadata={handleMetadataChange}
          references={project.references}
          onOpenReferenceModal={() => setIsModalOpen(true)}
          onRemoveReference={handleRemoveReference}
        />

        {/* Centro: Editor Visual Estilo Notion */}
        <Editor
          blocks={project.blocks}
          onChangeBlocks={handleBlocksChange}
        />

        {/* Painel Direito: Preview A4 ABNT ou Código Typst */}
        <PdfPreview
          project={project}
          showCode={showCode}
        />
      </div>

      <ReferenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddReference={handleAddReference}
      />
    </div>
  );
};
