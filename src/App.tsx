import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { ProjectsModal } from '@/components/ProjectsModal';
import {
  DocumentProject,
  DocumentMetadata,
  Block,
  AcademicReference,
  ProjectTemplateType,
} from '@/types/document';
import {
  generateStandaloneTypst,
  generateTypstFiles,
  extractBinaryAssets,
} from '@/core/transpiler/typstGenerator';
import { compileToPdf } from '@/core/typst/typstClient';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import {
  loadInitialActiveProject,
  saveProject,
  listProjects,
  duplicateProject,
  deleteProject,
  setActiveProjectId,
  serializeBackup,
  parseBackup,
} from '@/core/storage/db';

const fallbackInitialProject = createProjectFromTemplate('tcc');

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(fallbackInitialProject);
  const [projects, setProjects] = useState<DocumentProject[]>([fallbackInitialProject]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showCode, setShowCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const skipNextAutoSaveRef = useRef(true);

  // Carrega o projeto ativo do IndexedDB ao iniciar
  useEffect(() => {
    let mounted = true;
    loadInitialActiveProject()
      .then(({ activeProject, allProjects }) => {
        if (!mounted) return;
        skipNextAutoSaveRef.current = true;
        setProject(activeProject);
        setProjects(allProjects);
        setIsStorageReady(true);
      })
      .catch((err) => {
        console.error('Erro ao inicializar IndexedDB:', err);
        if (mounted) setIsStorageReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-save com debounce sempre que o projeto ativo sofrer alterações
  useEffect(() => {
    if (!isStorageReady) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const saved = await saveProject(project);
        const all = await listProjects();
        setProjects(all);
        setSaveStatus('saved');
        // Mantém updatedAt sincronizado sem disparar novo ciclo de auto-save
        if (saved.updatedAt !== project.updatedAt) {
          skipNextAutoSaveRef.current = true;
          setProject((prev) => ({ ...prev, updatedAt: saved.updatedAt }));
        }
      } catch (err) {
        console.error('Erro ao salvar no IndexedDB:', err);
        setSaveStatus('saved');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [project, isStorageReady]);

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

  const handleSelectProject = (selected: DocumentProject) => {
    skipNextAutoSaveRef.current = true;
    setProject(selected);
    setActiveProjectId(selected.id);
  };

  const handleCreateProject = async (
    templateType: ProjectTemplateType,
    customName?: string,
  ) => {
    const newProj = createProjectFromTemplate(templateType, customName);
    await saveProject(newProj, false);
    const all = await listProjects();
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setProject(newProj);
    setActiveProjectId(newProj.id);
  };

  const handleRenameProject = async (id: string, newName: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const updated = await saveProject({ ...target, name: newName });
    const all = await listProjects();
    setProjects(all);
    if (id === project.id) {
      skipNextAutoSaveRef.current = true;
      setProject(updated);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const cloned = await duplicateProject(id);
    if (!cloned) return;
    const all = await listProjects();
    setProjects(all);
    skipNextAutoSaveRef.current = true;
    setProject(cloned);
    setActiveProjectId(cloned.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length <= 1) return;
    await deleteProject(id);
    const all = await listProjects();
    setProjects(all);
    if (id === project.id && all.length > 0) {
      skipNextAutoSaveRef.current = true;
      setProject(all[0]);
      setActiveProjectId(all[0].id);
    }
  };

  const handleExportBackup = (targetProject: DocumentProject) => {
    const json = serializeBackup(targetProject);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${targetProject.name.toLowerCase().replace(/\s+/g, '_')}.redija`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const content = await file.text();
      const imported = parseBackup(content);
      await saveProject(imported, false);
      const all = await listProjects();
      setProjects(all);
      skipNextAutoSaveRef.current = true;
      setProject(imported);
      setActiveProjectId(imported.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar arquivo .redija.');
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const files = generateTypstFiles(project);
      const binaryFiles = extractBinaryAssets(project);
      const result = await compileToPdf(files, binaryFiles);
      if (result.error || !result.pdf) {
        const msg =
          result.error ||
          result.diagnostics.map((d) => `${d.location}: ${d.message}`).join('\n') ||
          'Não foi possível gerar o PDF.';
        alert(`Erro ao gerar PDF:\n${msg}`);
        return;
      }

      const pdfBytes = new Uint8Array(result.pdf);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportTypst = () => {
    const code = generateStandaloneTypst(project);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.typ`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 select-none">
      <Header
        projectName={project.name}
        projectsCount={projects.length}
        saveStatus={saveStatus}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
        onExportTypst={handleExportTypst}
        showCode={showCode}
        setShowCode={setShowCode}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Metadados ABNT e Referências */}
        <Sidebar
          project={project}
          metadata={project.metadata}
          onChangeMetadata={handleMetadataChange}
          references={project.references}
          onOpenReferenceModal={() => setIsModalOpen(true)}
          onRemoveReference={handleRemoveReference}
        />

        {/* Centro: Editor Visual Estilo Notion */}
        <Editor
          blocks={project.blocks}
          references={project.references}
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

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={project.id}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
};
