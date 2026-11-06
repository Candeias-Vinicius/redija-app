import React, { useState, useRef } from 'react';
import { DocumentProject, ProjectTemplateType } from '@/types/document';
import { PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import {
  X,
  FolderOpen,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Check,
  Pencil,
  FileText,
  Sparkles,
} from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: DocumentProject[];
  activeProjectId: string;
  onSelectProject: (project: DocumentProject) => void;
  onCreateProject: (templateType: ProjectTemplateType, customName?: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExportBackup: (project: DocumentProject) => void;
  onImportBackup: (file: File) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onExportBackup,
  onImportBackup,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateType>('tcc');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject(selectedTemplate, newProjectName.trim() || undefined);
    setNewProjectName('');
    onClose();
  };

  const startRename = (proj: DocumentProject) => {
    setEditingId(proj.id);
    setEditingName(proj.name);
  };

  const commitRename = (id: string) => {
    if (editingName.trim()) {
      onRenameProject(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">Meus Trabalhos Acadêmicos</h3>
              <p className="text-xs text-neutral-500">
                Salvos automaticamente no navegador (IndexedDB) • Exporte ou restaure backups `.redija`
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".redija,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Importar arquivo de backup .redija"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar .redija</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo dividido: Lista de projetos + Criar novo a partir de modelo */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
          {/* Coluna Esquerda: Lista de Trabalhos Salvos */}
          <div className="md:col-span-7 p-5 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Trabalhos Salvos ({projects.length})
              </h4>
            </div>

            <div className="space-y-2">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const isEditing = editingId === proj.id;
                const updatedDate = new Date(proj.updatedAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={proj.id}
                    className={`group rounded-lg border p-3 transition-all ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(proj.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="w-full text-xs font-semibold px-2 py-1 border border-emerald-600 rounded bg-white focus:outline-none"
                            />
                            <button
                              onClick={() => commitRename(proj.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              title="Confirmar nome"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectProject(proj);
                              onClose();
                            }}
                            className="text-left w-full"
                          >
                            <div className="flex items-center gap-2">
                              <FileText
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-emerald-600' : 'text-neutral-400'
                                }`}
                              />
                              <span className="font-semibold text-xs text-neutral-900 truncate">
                                {proj.name}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 truncate mt-1">
                              {proj.metadata.title || 'Sem título definido'}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-1">
                              Atualizado em {updatedDate} • {proj.blocks.length} blocos
                            </p>
                          </button>
                        )}
                      </div>

                      {/* Ações do projeto */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startRename(proj)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                          title="Renomear projeto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateProject(proj.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                          title="Duplicar projeto"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onExportBackup(proj)}
                          className="p-1.5 text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="Baixar backup .redija"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={() => onDeleteProject(proj.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Excluir projeto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Novo Trabalho a partir de Modelo */}
          <form onSubmit={handleCreate} className="md:col-span-5 p-5 bg-neutral-50/60 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Novo Trabalho ABNT
                </h4>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                  Nome do Projeto (Opcional)
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: TCC Engenharia de Software 2026"
                  className="w-full text-xs px-3 py-2 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-neutral-600 block">
                  Escolha um Modelo Inicial
                </label>
                {PROJECT_TEMPLATES.map((tpl) => {
                  const selected = selectedTemplate === tpl.type;
                  return (
                    <button
                      type="button"
                      key={tpl.type}
                      onClick={() => setSelectedTemplate(tpl.type)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-900">
                          {tpl.label}
                        </span>
                        <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Trabalho</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
