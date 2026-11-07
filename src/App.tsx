import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { PdfPreview } from '@/components/PdfPreview';
import { ReferenceModal } from '@/components/ReferenceModal';
import { ProjectsModal } from '@/components/ProjectsModal';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TemplateCustomizerModal } from '@/components/TemplateCustomizerModal';
import { BugReportModal } from '@/components/BugReportModal';
import {
  DocumentProject,
  DocumentMetadata,
  Block,
  AcademicReference,
  ProjectTemplateType,
  TemplateConfig,
  DEFAULT_TEMPLATE_CONFIG,
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
  listTrashedProjects,
  duplicateProject,
  moveProjectToTrash,
  restoreProjectFromTrash,
  deleteProject,
  setActiveProjectId,
  serializeBackup,
  parseBackup,
} from '@/core/storage/db';

const fallbackInitialProject = createProjectFromTemplate('tcc');

interface HistorySnapshot {
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  templateConfig?: TemplateConfig;
}

export const App: React.FC = () => {
  const [project, setProject] = useState<DocumentProject>(fallbackInitialProject);
  const [projects, setProjects] = useState<DocumentProject[]>([fallbackInitialProject]);
  const [trashedProjects, setTrashedProjects] = useState<DocumentProject[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showCode, setShowCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<AcademicReference | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Histórico Undo / Redo (Ctrl+Z / Ctrl+Y)
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const lastHistoryPushTimeRef = useRef<number>(0);

  // Largura redimensionável das abas (Sidebar e PDF Preview)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('redija:sidebarWidth'));
      return saved >= 240 && saved <= 520 ? saved : 320;
    } catch {
      return 320;
    }
  });
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('redija:previewWidth'));
      return saved >= 320 && saved <= 820 ? saved : 500;
    } catch {
      return 500;
    }
  });
  const [resizingPane, setResizingPane] = useState<'sidebar' | 'preview' | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const toggleSidebar = () => {
    // Impede que as 3 abas fiquem ocultas ao mesmo tempo
    if (showSidebar && !showEditor && !showPreview) return;
    setShowSidebar((prev) => !prev);
  };

  const toggleEditor = () => {
    if (showEditor && !showSidebar && !showPreview) return;
    setShowEditor((prev) => !prev);
  };

  const togglePreview = () => {
    if (showPreview && !showSidebar && !showEditor) return;
    setShowPreview((prev) => !prev);
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('redija:darkMode') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('redija:darkMode', darkMode ? '1' : '0');
    } catch {
      // Ignorar se localStorage estiver bloqueado
    }
  }, [darkMode]);

  // Persistir larguras das abas e tratar arraste dos divisores
  useEffect(() => {
    if (!resizingPane) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingPane === 'sidebar') {
        const nextWidth = Math.max(240, Math.min(520, e.clientX));
        setSidebarWidth(nextWidth);
        try {
          localStorage.setItem('redija:sidebarWidth', String(nextWidth));
        } catch {
          // ignore
        }
      } else if (resizingPane === 'preview') {
        const nextWidth = Math.max(320, Math.min(820, window.innerWidth - e.clientX));
        setPreviewWidth(nextWidth);
        try {
          localStorage.setItem('redija:previewWidth', String(nextWidth));
        } catch {
          // ignore
        }
      }
    };

    const handleMouseUp = () => {
      setResizingPane(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingPane]);

  const recordHistorySnapshot = useCallback((currentProj: DocumentProject, forceNewEntry = false) => {
    const now = Date.now();
    const snapshot: HistorySnapshot = {
      metadata: currentProj.metadata,
      blocks: currentProj.blocks,
      references: currentProj.references,
      templateConfig: currentProj.templateConfig,
    };

    setPast((prev) => {
      // Agrupa digitações rápidas em intervalos de 900ms para que Ctrl+Z desfaça frases/ações inteiras
      if (!forceNewEntry && now - lastHistoryPushTimeRef.current < 900 && prev.length > 0) {
        return prev;
      }
      lastHistoryPushTimeRef.current = now;
      return [...prev.slice(-49), snapshot];
    });
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, -1);

      setProject((currentProj) => {
        setFuture((prevFuture) => [
          {
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
          },
          ...prevFuture.slice(0, 49),
        ]);
        return {
          ...currentProj,
          metadata: previous.metadata,
          blocks: previous.blocks,
          references: previous.references,
          templateConfig: previous.templateConfig,
        };
      });

      return nextPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);

      setProject((currentProj) => {
        setPast((prevPast) => [
          ...prevPast.slice(-49),
          {
            metadata: currentProj.metadata,
            blocks: currentProj.blocks,
            references: currentProj.references,
            templateConfig: currentProj.templateConfig,
          },
        ]);
        return {
          ...currentProj,
          metadata: next.metadata,
          blocks: next.blocks,
          references: next.references,
          templateConfig: next.templateConfig,
        };
      });

      return remainingFuture;
    });
  }, []);

  // Atalhos globais de teclado Ctrl+Z e Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        if (past.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (future.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [past.length, future.length, handleUndo, handleRedo]);

  const skipNextAutoSaveRef = useRef(true);

  // Carrega o projeto ativo do IndexedDB ao iniciar
  useEffect(() => {
    let mounted = true;
    loadInitialActiveProject()
      .then(({ activeProject, allProjects, trashedProjects: initialTrash }) => {
        if (!mounted) return;
        skipNextAutoSaveRef.current = true;
        setProject(activeProject);
        setProjects(allProjects);
        setTrashedProjects(initialTrash);
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
    setProject((prev) => {
      recordHistorySnapshot(prev);
      return { ...prev, metadata };
    });
  };

  const handleTemplateConfigChange = (templateConfig: TemplateConfig) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return { ...prev, templateConfig };
    });
  };

  const handleBlocksChange = (blocks: Block[]) => {
    setProject((prev) => {
      const isStructuralChange = blocks.length !== prev.blocks.length;
      recordHistorySnapshot(prev, isStructuralChange);
      return { ...prev, blocks };
    });
  };

  const handleAddReference = (ref: AcademicReference) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: [...prev.references, ref],
      };
    });
  };

  const handleUpdateReference = (updatedRef: AcademicReference) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: prev.references.map((r) => (r.id === updatedRef.id ? updatedRef : r)),
      };
    });
    setEditingReference(null);
  };

  const handleAddMultipleReferences = (refs: AcademicReference[]) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: [...prev.references, ...refs],
      };
    });
  };

  const handleRemoveReference = (id: string) => {
    setProject((prev) => {
      recordHistorySnapshot(prev, true);
      return {
        ...prev,
        references: prev.references.filter((r) => r.id !== id),
      };
    });
  };

  const handleSelectProject = (selected: DocumentProject) => {
    skipNextAutoSaveRef.current = true;
    setPast([]);
    setFuture([]);
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
    setPast([]);
    setFuture([]);
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

  const handleMoveToTrash = async (id: string) => {
    if (projects.length <= 1) return;
    await moveProjectToTrash(id);
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
    if (id === project.id && all.length > 0) {
      skipNextAutoSaveRef.current = true;
      setProject(all[0]);
      setActiveProjectId(all[0].id);
    }
  };

  const handleRestoreFromTrash = async (id: string) => {
    const restored = await restoreProjectFromTrash(id);
    if (!restored) return;
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
    skipNextAutoSaveRef.current = true;
    setProject(restored);
    setActiveProjectId(restored.id);
  };

  const handlePermanentDelete = async (id: string) => {
    await deleteProject(id);
    const all = await listProjects();
    const trashed = await listTrashedProjects();
    setProjects(all);
    setTrashedProjects(trashed);
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
    <div className="h-screen flex flex-col bg-neutral-100 select-none overflow-hidden">
      <Header
        projectName={project.name}
        projectsCount={projects.length}
        saveStatus={saveStatus}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showSidebar={showSidebar}
        showEditor={showEditor}
        showPreview={showPreview}
        onToggleSidebar={toggleSidebar}
        onToggleEditor={toggleEditor}
        onTogglePreview={togglePreview}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
        onOpenBugReportModal={() => setIsBugReportOpen(true)}
        onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
        onExportTypst={handleExportTypst}
        showCode={showCode}
        setShowCode={setShowCode}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Painel Esquerdo: Metadados ABNT e Referências */}
        {showSidebar && (
          <Sidebar
            project={project}
            metadata={project.metadata}
            onChangeMetadata={handleMetadataChange}
            references={project.references}
            onOpenReferenceModal={() => {
              setEditingReference(null);
              setIsModalOpen(true);
            }}
            onEditReference={(ref) => {
              setEditingReference(ref);
              setIsModalOpen(true);
            }}
            onRemoveReference={handleRemoveReference}
            onOpenTemplateCustomizer={() => setIsCustomizerOpen(true)}
            onMinimize={toggleSidebar}
            widthPx={!showEditor && !showPreview ? window.innerWidth : sidebarWidth}
          />
        )}

        {/* Divisor Redimensionável: Sidebar <-> Editor */}
        {showSidebar && (showEditor || showPreview) && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setResizingPane('sidebar');
            }}
            title="Arraste para redimensionar a barra lateral"
            className={`w-1.5 cursor-col-resize shrink-0 flex items-center justify-center transition-colors group ${
              resizingPane === 'sidebar'
                ? 'bg-emerald-500'
                : 'bg-neutral-200/60 hover:bg-emerald-500/60'
            }`}
          >
            <div className="w-0.5 h-8 rounded-full bg-neutral-400/60 group-hover:bg-white" />
          </div>
        )}

        {/* Centro: Editor Visual Estilo Notion */}
        {showEditor && (
          <Editor
            blocks={project.blocks}
            metadata={project.metadata}
            references={project.references}
            citationStyle={project.templateConfig?.citationStyle ?? DEFAULT_TEMPLATE_CONFIG.citationStyle}
            isFullWidth={!showSidebar && !showPreview}
            onOpenReferenceModal={() => {
              setEditingReference(null);
              setIsModalOpen(true);
            }}
            onChangeBlocks={handleBlocksChange}
            onMinimize={toggleEditor}
          />
        )}

        {/* Divisor Redimensionável: Editor <-> Preview PDF */}
        {showEditor && showPreview && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setResizingPane('preview');
            }}
            title="Arraste para redimensionar o painel do PDF e o editor"
            className={`w-1.5 cursor-col-resize shrink-0 flex items-center justify-center transition-colors group ${
              resizingPane === 'preview'
                ? 'bg-emerald-500'
                : 'bg-neutral-200/60 hover:bg-emerald-500/60'
            }`}
          >
            <div className="w-0.5 h-8 rounded-full bg-neutral-400/60 group-hover:bg-white" />
          </div>
        )}

        {/* Painel Direito: Preview A4 ABNT ou Código Typst */}
        {showPreview && (
          <PdfPreview
            project={project}
            showCode={showCode}
            widthPx={previewWidth}
            isFullWidth={!showEditor}
            onMinimize={togglePreview}
          />
        )}
      </div>

      <ReferenceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReference(null);
        }}
        editingReference={editingReference}
        onAddReference={handleAddReference}
        onUpdateReference={handleUpdateReference}
        onAddMultipleReferences={handleAddMultipleReferences}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        trashedProjects={trashedProjects}
        activeProjectId={project.id}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDuplicateProject={handleDuplicateProject}
        onMoveToTrash={handleMoveToTrash}
        onRestoreFromTrash={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

      <TemplateCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={project.templateConfig ?? DEFAULT_TEMPLATE_CONFIG}
        metadata={project.metadata}
        blocks={project.blocks}
        onChangeConfig={handleTemplateConfigChange}
        onChangeMetadata={handleMetadataChange}
      />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        projectName={project.name}
      />
    </div>
  );
};
