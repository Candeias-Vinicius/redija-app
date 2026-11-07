import React, { useState, useRef } from 'react';
import { DocumentProject, ProjectTemplateType } from '@/types/document';
import { PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import { getRemainingTrashDays, TRASH_RETENTION_DAYS } from '@/core/storage/db';
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
  RotateCcw,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: DocumentProject[];
  trashedProjects: DocumentProject[];
  activeProjectId: string;
  onSelectProject: (project: DocumentProject) => void;
  onCreateProject: (templateType: ProjectTemplateType, customName?: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDuplicateProject: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onRestoreFromTrash: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onExportBackup: (project: DocumentProject) => void;
  onImportBackup: (file: File) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  trashedProjects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateType>('tcc');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Estado de confirmação de exclusão digitando o nome
  const [confirmTarget, setConfirmTarget] = useState<{
    project: DocumentProject;
    mode: 'trash' | 'permanent';
  } | null>(null);
  const [confirmTypedName, setConfirmTypedName] = useState('');

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

  const openDeleteConfirm = (proj: DocumentProject, mode: 'trash' | 'permanent') => {
    setConfirmTarget({ project: proj, mode });
    setConfirmTypedName('');
  };

  const isConfirmMatch =
    confirmTarget !== null &&
    confirmTypedName.trim().toLowerCase() === confirmTarget.project.name.trim().toLowerCase();

  const executeConfirmedDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTarget || !isConfirmMatch) return;
    if (confirmTarget.mode === 'trash') {
      onMoveToTrash(confirmTarget.project.id);
    } else {
      onPermanentDelete(confirmTarget.project.id);
    }
    setConfirmTarget(null);
    setConfirmTypedName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] relative">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">Meus Trabalhos Acadêmicos</h3>
              <p className="text-xs text-neutral-500">
                Salvos automaticamente no navegador • Lixeira de segurança por {TRASH_RETENTION_DAYS} dias
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

        {/* Corpo dividido: Lista de projetos / Lixeira + Criar novo */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
          {/* Coluna Esquerda: Abas Ativos vs Lixeira */}
          <div className="md:col-span-7 p-5 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Trabalhos Salvos ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trash')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'trash'
                      ? 'bg-red-600 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Lixeira ({trashedProjects.length})</span>
                </button>
              </div>
            </div>

            {activeTab === 'active' ? (
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
                              onClick={() => openDeleteConfirm(proj, 'trash')}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Mover para a Lixeira"
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
            ) : (
              /* Aba da Lixeira */
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Os trabalhos na lixeira ficam guardados por até <strong>{TRASH_RETENTION_DAYS} dias</strong> antes de serem apagados automaticamente. Você pode restaurá-los ou excluir de vez a qualquer momento.
                  </span>
                </div>

                {trashedProjects.length === 0 ? (
                  <div className="text-center py-10 text-neutral-400 text-xs">
                    A lixeira está vazia.
                  </div>
                ) : (
                  trashedProjects.map((proj) => {
                    const daysLeft = getRemainingTrashDays(proj.deletedAt);
                    return (
                      <div
                        key={proj.id}
                        className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-neutral-800 truncate">
                              {proj.name}
                            </span>
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
                              Expira em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {proj.metadata.title || 'Sem título'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRestoreFromTrash(proj.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                            title="Restaurar trabalho para a lista principal"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(proj, 'permanent')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-medium transition-colors"
                            title="Excluir permanentemente agora"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir de vez</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Coluna Direita: Novo Trabalho a partir de Modelo */}
          <form
            onSubmit={handleCreate}
            className="md:col-span-5 p-5 bg-neutral-50/60 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Novo Trabalho Acadêmico
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

              <div className="space-y-1.5">
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
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
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

        {/* Sub-Modal de Confirmação digitando o nome do projeto */}
        {confirmTarget && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <form
              onSubmit={executeConfirmedDelete}
              className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-red-200 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">
                    {confirmTarget.mode === 'trash'
                      ? 'Mover trabalho para a Lixeira?'
                      : 'Excluir trabalho permanentemente?'}
                  </h4>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {confirmTarget.mode === 'trash' ? (
                      <>
                        O projeto ficará guardado na <strong>Lixeira por {TRASH_RETENTION_DAYS} dias</strong> antes de ser apagado definitivamente.
                      </>
                    ) : (
                      <>
                        Esta ação <strong>não pode ser desfeita</strong>. Todos os blocos, figuras e referências deste trabalho serão apagados definitivamente.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-2">
                <label className="block text-xs text-neutral-700">
                  Para confirmar, digite exatamente o nome do projeto:{' '}
                  <strong className="font-mono text-red-700 select-all">
                    {confirmTarget.project.name}
                  </strong>
                </label>
                <input
                  type="text"
                  value={confirmTypedName}
                  onChange={(e) => setConfirmTypedName(e.target.value)}
                  autoFocus
                  placeholder={confirmTarget.project.name}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmTarget(null);
                    setConfirmTypedName('');
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmMatch}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {confirmTarget.mode === 'trash'
                    ? 'Confirmar e Mover para Lixeira'
                    : 'Excluir Permanentemente'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
