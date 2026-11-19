import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AcademicReference, ReferenceType } from '@/types/document';
import { lookupByDoiOrIsbn } from '@/core/transpiler/abntLinter';
import {
  REFERENCE_SEARCH_DEBOUNCE_MS,
  searchReferencesByTitleOrAuthor,
  searchResultToReferenceFields,
  type ReferenceSearchResult,
} from '@/core/transpiler/referenceSearch';
import {
  parseReferenceFileOrText,
  planReferenceImport,
  type ReferenceImportDestination,
} from '@/core/transpiler/referenceImporter';
import {
  dedupeTagsCaseInsensitive,
  filterLibraryReferences,
  findDuplicateInList,
  toProjectReference,
} from '@/core/storage/referenceLibraryMerge';
import { projectRefToLibraryInput, type LibraryReference } from '@/core/storage/referenceLibrary';
import { useReferenceLibrary } from '@/hooks/useReferenceLibrary';
import {
  X,
  BookmarkPlus,
  Search,
  Loader2,
  Sparkles,
  Upload,
  FileCode2,
  Library,
  FolderPlus,
  Folder,
  Tag,
  Plus,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  CloudOff,
} from 'lucide-react';

export type ReferenceModalTab = 'form' | 'library' | 'bibtex';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ReferenceModalTab;
  editingReference?: AcademicReference | null;
  projectReferences?: AcademicReference[];
  activeOwner?: string;
  isAuthenticated?: boolean;
  onAddReference: (ref: AcademicReference) => void;
  onUpdateReference?: (ref: AcademicReference) => void;
  onAddMultipleReferences?: (refs: AcademicReference[]) => void;
}

const REFERENCE_TYPES: Array<{ value: ReferenceType; label: string }> = [
  { value: 'book', label: 'Livro / Obra Completa' },
  { value: 'article', label: 'Artigo de Periódico (Revista)' },
  { value: 'thesis', label: 'TCC / Dissertação / Tese' },
  { value: 'website', label: 'Site / Documento Online' },
  { value: 'legislation', label: 'Norma Técnica / Legislação' },
];

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'form',
  editingReference = null,
  projectReferences = [],
  activeOwner = 'local',
  isAuthenticated = false,
  onAddReference,
  onUpdateReference,
  onAddMultipleReferences,
}) => {
  const library = useReferenceLibrary(activeOwner);

  const [activeTab, setActiveTab] = useState<ReferenceModalTab>(initialTab);
  const [editingLibraryRef, setEditingLibraryRef] = useState<LibraryReference | null>(null);

  // Aba de Importação (.bib, .ris, CSL-JSON)
  const [bibText, setBibText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);
  const [bibError, setBibError] = useState<string | null>(null);
  const [importDestination, setImportDestination] = useState<ReferenceImportDestination>('project');
  const [importSummary, setImportSummary] = useState<{
    text: string;
    importedCount: number;
    duplicates: AcademicReference[];
  } | null>(null);
  const [showImportDuplicates, setShowImportDuplicates] = useState(false);
  const bibFileRef = useRef<HTMLInputElement>(null);

  // Busca por Título ou Autor (RDJ-07.2)
  const [titleSearchQuery, setTitleSearchQuery] = useState('');
  const [isSearchingTitle, setIsSearchingTitle] = useState(false);
  const [titleSearchResults, setTitleSearchResults] = useState<ReferenceSearchResult[] | null>(
    null,
  );
  const [titleSearchError, setTitleSearchError] = useState<string | null>(null);
  const titleSearchInputRef = useRef<HTMLInputElement>(null);
  const manualAuthorsInputRef = useRef<HTMLInputElement>(null);

  // Busca por DOI ou ISBN
  const [type, setType] = useState<ReferenceType>('book');
  const [doiQuery, setDoiQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Campos do formulário
  const [authors, setAuthors] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [edition, setEdition] = useState('');
  const [city, setCity] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [journal, setJournal] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [url, setUrl] = useState('');
  const [doi, setDoi] = useState('');
  const [isbn, setIsbn] = useState('');

  // Opções de salvar na biblioteca junto com o projeto (RDJ-07.1 / RDJ-07.5)
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [formFolderId, setFormFolderId] = useState<string | null>(null);
  const [formTagsInput, setFormTagsInput] = useState('');
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Estado da aba "Minha Biblioteca" (RDJ-07.1 / RDJ-07.5)
  const [libSearchQuery, setLibSearchQuery] = useState('');
  const [libFolderFilter, setLibFolderFilter] = useState<'all' | 'unfiled' | string>('all');
  const [libTagFilter, setLibTagFilter] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [tagInputByRefId, setTagInputByRefId] = useState<Record<string, string>>({});
  const [libraryFeedback, setLibraryFeedback] = useState<{
    type: 'warning' | 'success';
    message: string;
    refId?: string;
  } | null>(null);

  const [lastSyncedModalKey, setLastSyncedModalKey] = useState<string | null>(null);

  const populateFormFromRef = (
    ref: Partial<AcademicReference> & { folderId?: string | null; tags?: string[] },
  ) => {
    setType(ref.type || 'book');
    setAuthors(ref.authors || '');
    setTitle(ref.title || '');
    setSubtitle(ref.subtitle || '');
    setEdition(ref.edition || '');
    setCity(ref.city || '');
    setPublisher(ref.publisher || '');
    setYear(ref.year || String(new Date().getFullYear()));
    setJournal(ref.journal || '');
    setVolume(ref.volume || '');
    setIssue(ref.issue || '');
    setPages(ref.pages || '');
    setInstitution(ref.institution || '');
    setDegree(ref.degree || '');
    setUrl(ref.url || '');
    setDoi(ref.doi || '');
    setIsbn(ref.isbn || '');
    if (ref.folderId !== undefined) setFormFolderId(ref.folderId);
    if (ref.tags !== undefined) setFormTagsInput(ref.tags.join(', '));
  };

  const resetFormFields = () => {
    setType('book');
    setDoiQuery('');
    setTitleSearchQuery('');
    setTitleSearchResults(null);
    setTitleSearchError(null);
    setLookupError(null);
    setAuthors('');
    setTitle('');
    setSubtitle('');
    setEdition('');
    setCity('');
    setPublisher('');
    setYear(String(new Date().getFullYear()));
    setJournal('');
    setVolume('');
    setIssue('');
    setPages('');
    setInstitution('');
    setDegree('');
    setUrl('');
    setDoi('');
    setIsbn('');
    setSaveToLibrary(false);
    setFormFolderId(null);
    setFormTagsInput('');
    setFormNotice(null);
    setEditingLibraryRef(null);
  };

  const currentModalKey = isOpen ? `${editingReference?.id ?? '__new__'}:${initialTab}` : null;
  if (currentModalKey !== lastSyncedModalKey) {
    setLastSyncedModalKey(currentModalKey);
    if (editingReference) {
      setActiveTab('form');
      setEditingLibraryRef(null);
      setFormNotice(null);
      populateFormFromRef(editingReference);
    } else if (isOpen) {
      setActiveTab(initialTab);
      resetFormFields();
      setBibText('');
      setUploadedFileName(undefined);
      setBibError(null);
      setImportSummary(null);
      setShowImportDuplicates(false);
      setLibraryFeedback(null);
    }
  }

  // Debounce de 400 ms para busca automática por título ou autor (RDJ-07.2)
  useEffect(() => {
    if (!isOpen || activeTab !== 'form') return;
    const trimmed = titleSearchQuery.trim();
    if (trimmed.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingTitle(true);
      setTitleSearchError(null);
      try {
        const results = await searchReferencesByTitleOrAuthor(trimmed, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setTitleSearchResults(results);
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return;
        }
        setTitleSearchResults(null);
        setTitleSearchError(
          err instanceof Error
            ? err.message
            : 'Não foi possível buscar obras nas bases acadêmicas.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingTitle(false);
        }
      }
    }, REFERENCE_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [titleSearchQuery, isOpen, activeTab]);

  const filteredLibraryReferences = useMemo(
    () =>
      filterLibraryReferences(library.references, {
        query: libSearchQuery,
        folderFilter: libFolderFilter,
        tagFilter: libTagFilter,
      }),
    [library.references, libSearchQuery, libFolderFilter, libTagFilter],
  );

  if (!isOpen) return null;

  const handleManualTitleSearch = async () => {
    const trimmed = titleSearchQuery.trim();
    if (!trimmed) return;
    setIsSearchingTitle(true);
    setTitleSearchError(null);
    try {
      const results = await searchReferencesByTitleOrAuthor(trimmed);
      setTitleSearchResults(results);
    } catch (err) {
      setTitleSearchResults(null);
      setTitleSearchError(
        err instanceof Error ? err.message : 'Não foi possível buscar obras nas bases acadêmicas.',
      );
    } finally {
      setIsSearchingTitle(false);
    }
  };

  const handleSelectSearchResult = (result: ReferenceSearchResult) => {
    const fields = searchResultToReferenceFields(result);
    populateFormFromRef(fields);
    setTitleSearchResults(null);
    setFormNotice('Campos preenchidos automaticamente. Revise os dados antes de salvar.');
  };

  const handleFocusManualEntry = () => {
    setTitleSearchResults(null);
    setTitleSearchError(null);
    manualAuthorsInputRef.current?.focus();
  };

  const handleLookup = async () => {
    if (!doiQuery.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const data = await lookupByDoiOrIsbn(doiQuery);
      if (data.type) setType(data.type);
      if (data.authors) setAuthors(data.authors);
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.city) setCity(data.city);
      if (data.publisher) setPublisher(data.publisher);
      if (data.year) setYear(data.year);
      if (data.journal) setJournal(data.journal);
      if (data.volume) setVolume(data.volume);
      if (data.issue) setIssue(data.issue);
      if (data.pages) setPages(data.pages);
      if (data.doi) setDoi(data.doi);
      if (data.isbn) setIsbn(data.isbn);
      if (data.url) setUrl(data.url);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao buscar DOI/ISBN.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authors.trim() || !title.trim()) return;
    setFormNotice(null);

    const parsedTags = dedupeTagsCaseInsensitive(
      formTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    );

    // Modo 1: Editando uma referência diretamente na Minha Biblioteca (RDJ-07.1 Cenário 3 / RDJ-07.6)
    if (editingLibraryRef) {
      library.updateReference(editingLibraryRef.id, {
        type,
        authors: authors.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        edition: edition.trim() || undefined,
        city: city.trim() || 'São Paulo',
        publisher: publisher.trim() || 'Editora',
        year: year.trim() || String(new Date().getFullYear()),
        journal: journal.trim() || undefined,
        volume: volume.trim() || undefined,
        issue: issue.trim() || undefined,
        pages: pages.trim() || undefined,
        institution: institution.trim() || undefined,
        degree: degree.trim() || undefined,
        doi: doi.trim() || undefined,
        isbn: isbn.trim() || undefined,
        url: url.trim() || undefined,
        folderId: formFolderId,
        tags: parsedTags,
      });
      setEditingLibraryRef(null);
      setActiveTab('library');
      setLibraryFeedback({
        type: 'success',
        message: 'Referência atualizada na Minha Biblioteca.',
      });
      return;
    }

    const payload: AcademicReference = {
      id: editingReference ? editingReference.id : crypto.randomUUID(),
      type,
      authors: authors.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      edition: edition.trim() || undefined,
      city: city.trim() || 'São Paulo',
      publisher: publisher.trim() || 'Editora',
      year: year.trim() || String(new Date().getFullYear()),
      journal: journal.trim() || undefined,
      volume: volume.trim() || undefined,
      issue: issue.trim() || undefined,
      pages: pages.trim() || undefined,
      institution: institution.trim() || undefined,
      degree: degree.trim() || undefined,
      doi: doi.trim() || undefined,
      isbn: isbn.trim() || undefined,
      url: url.trim() || undefined,
      accessDate: url.trim()
        ? editingReference?.accessDate || new Date().toLocaleDateString('pt-BR')
        : undefined,
      libraryRefId: editingReference?.libraryRefId,
      librarySyncedAt: editingReference?.librarySyncedAt,
    };

    // Modo 2: Editando referência existente no projeto (RDJ-07.1 Cenário 3: não altera a biblioteca)
    if (editingReference && onUpdateReference) {
      onUpdateReference(payload);
      onClose();
      return;
    }

    // Modo 3: Adicionando nova referência ao projeto
    const duplicateInProject = findDuplicateInList(payload, projectReferences);
    if (duplicateInProject) {
      setFormNotice('Esta referência já está neste projeto.');
      return;
    }

    if (saveToLibrary) {
      const { reference: savedLibRef } = library.addReference(
        projectRefToLibraryInput(payload, {
          folderId: formFolderId,
          tags: parsedTags,
        }),
      );
      payload.libraryRefId = savedLibRef.id;
      payload.librarySyncedAt = savedLibRef.updatedAt;
    }

    onAddReference(payload);
    onClose();
  };

  const handleInsertFromLibrary = (libRef: LibraryReference) => {
    const duplicate = findDuplicateInList(libRef, projectReferences);
    if (duplicate) {
      setLibraryFeedback({
        type: 'warning',
        message: 'Esta referência já está neste projeto',
        refId: libRef.id,
      });
      return;
    }

    const projectCopy = toProjectReference(libRef);
    onAddReference(projectCopy);
    setLibraryFeedback({
      type: 'success',
      message: `"${libRef.title}" foi inserida no projeto.`,
      refId: libRef.id,
    });
  };

  const handleStartEditLibraryRef = (libRef: LibraryReference) => {
    setEditingLibraryRef(libRef);
    populateFormFromRef(libRef);
    setFormNotice(null);
    setActiveTab('form');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    setFolderError(null);
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      const { folder, alreadyExists } = library.createFolder(trimmed);
      if (alreadyExists) {
        setFolderError(`A pasta "${folder.name}" já existe.`);
        return;
      }
      setNewFolderName('');
      setLibFolderFilter(folder.id);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Erro ao criar pasta.');
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    library.removeFolder(folderId);
    if (libFolderFilter === folderId) {
      setLibFolderFilter('all');
    }
  };

  const handleAddTagsToLibraryRef = (libRef: LibraryReference, rawTagText: string) => {
    const incoming = rawTagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const mergedTags = dedupeTagsCaseInsensitive([...libRef.tags, ...incoming]);
    library.updateReference(libRef.id, { tags: mergedTags });
    setTagInputByRefId((prev) => ({ ...prev, [libRef.id]: '' }));
  };

  const handleRemoveTagFromLibraryRef = (libRef: LibraryReference, tagToRemove: string) => {
    const nextTags = libRef.tags.filter(
      (t) => t.toLocaleLowerCase('pt-BR') !== tagToRemove.toLocaleLowerCase('pt-BR'),
    );
    library.updateReference(libRef.id, { tags: nextTags });
  };

  const handleImportReferences = () => {
    setBibError(null);
    setImportSummary(null);
    setShowImportDuplicates(false);

    try {
      const { references: parsed } = parseReferenceFileOrText(bibText, uploadedFileName);

      // Calcula deduplicação de acordo com o destino escolhido (RDJ-07.3 Cenários 3 e 4)
      if (importDestination === 'project') {
        const plan = planReferenceImport(parsed, projectReferences);
        if (plan.toImport.length > 0) {
          if (onAddMultipleReferences) {
            onAddMultipleReferences(plan.toImport);
          } else {
            plan.toImport.forEach((r) => onAddReference(r));
          }
        }
        setImportSummary({
          text: plan.summaryText,
          importedCount: plan.toImport.length,
          duplicates: plan.duplicates,
        });
      } else if (importDestination === 'library') {
        const plan = planReferenceImport(parsed, library.references);
        for (const item of plan.toImport) {
          library.addReference(projectRefToLibraryInput(item));
        }
        setImportSummary({
          text: plan.summaryText,
          importedCount: plan.toImport.length,
          duplicates: plan.duplicates,
        });
      } else {
        // Destino: 'both' (Projeto atual e Minha Biblioteca)
        const libPlan = planReferenceImport(parsed, library.references);
        const projPlan = planReferenceImport(parsed, projectReferences);

        const libIdByInputId = new Map<string, LibraryReference>();
        for (const item of parsed) {
          const { reference: libRef } = library.addReference(projectRefToLibraryInput(item));
          libIdByInputId.set(item.id, libRef);
        }

        const linkedForProject = projPlan.toImport.map((item) => {
          const libRef = libIdByInputId.get(item.id);
          return libRef
            ? {
                ...item,
                libraryRefId: libRef.id,
                librarySyncedAt: libRef.updatedAt,
              }
            : item;
        });

        if (linkedForProject.length > 0) {
          if (onAddMultipleReferences) {
            onAddMultipleReferences(linkedForProject);
          } else {
            linkedForProject.forEach((r) => onAddReference(r));
          }
        }

        // O resumo reflete o lote processado (priorizando o projeto ou o maior conjunto importado)
        const primaryPlan =
          projPlan.duplicates.length >= libPlan.duplicates.length ? projPlan : libPlan;
        setImportSummary({
          text: primaryPlan.summaryText,
          importedCount: primaryPlan.toImport.length,
          duplicates: primaryPlan.duplicates,
        });
      }

      setBibText('');
      setUploadedFileName(undefined);
    } catch (err) {
      setBibError(err instanceof Error ? err.message : 'Erro ao importar arquivo de referências.');
    }
  };

  const handleReferenceFileUpload = async (file: File) => {
    try {
      const content = await file.text();
      setBibText(content);
      setUploadedFileName(file.name);
      setBibError(null);
      setImportSummary(null);
    } catch {
      setBibError('Não foi possível ler o arquivo selecionado.');
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="reference-modal-title">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-brand-700" />
            <h2 id="reference-modal-title" className="font-semibold text-sm text-slate-900">
              {editingLibraryRef
                ? 'Editar Referência na Minha Biblioteca'
                : editingReference
                  ? 'Editar Referência Bibliográfica (ABNT NBR 6023)'
                  : 'Referências Bibliográficas e Minha Biblioteca (ABNT NBR 6023)'}
            </h2>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de Abas: Manual / Busca vs Minha Biblioteca vs Importar (.bib, .ris, CSL-JSON) */}
        <div
          role="tablist"
          aria-label="Modo de gerenciamento de referências"
          className="px-5 pt-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'form'}
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'form'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            DOI / ISBN, Título ou Manual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'library'}
            onClick={() => {
              setEditingLibraryRef(null);
              setActiveTab('library');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Minha Biblioteca ({library.references.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bibtex'}
            onClick={() => {
              setEditingLibraryRef(null);
              setActiveTab('bibtex');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'bibtex'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Importar (.bib, .ris, CSL-JSON)</span>
          </button>
        </div>

        {/* ABA 3: IMPORTAR (.bib, .ris, CSL-JSON) */}
        {activeTab === 'bibtex' ? (
          <div className="p-5 space-y-4 text-xs flex-1 overflow-y-auto">
            <div className="p-3 rounded-lg bg-brand-50/70 border border-brand-200 text-slate-700 space-y-2">
              <p className="font-medium text-brand-900">
                Importe referências do Zotero, Mendeley, Google Acadêmico, SciELO ou Lattes
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Envie um arquivo <code className="font-mono">.ris</code>,{' '}
                <code className="font-mono">CSL-JSON (.json)</code> ou{' '}
                <code className="font-mono">.bib</code> (BibTeX) ou cole o conteúdo abaixo.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={bibFileRef}
                  type="file"
                  accept=".bib,.ris,.json,.txt"
                  aria-label="Selecionar arquivo de referências"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleReferenceFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => bibFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-brand-500 text-slate-800 font-medium text-xs shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-brand-700" />
                  <span>Selecionar arquivo (.ris, .json, .bib) do computador</span>
                </button>
                {uploadedFileName && (
                  <span className="text-xs font-medium text-brand-800">
                    Arquivo: {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Seletor de destino (RDJ-07.3 Cenário 3) */}
            <fieldset className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <legend className="text-xs font-semibold text-slate-700 px-1">
                Destino da importação
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    importDestination === 'project'
                      ? 'bg-white border-brand-600 text-brand-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="import-destination"
                    value="project"
                    checked={importDestination === 'project'}
                    onChange={() => setImportDestination('project')}
                  />
                  <span>Projeto atual</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    importDestination === 'library'
                      ? 'bg-white border-brand-600 text-brand-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="import-destination"
                    value="library"
                    checked={importDestination === 'library'}
                    onChange={() => setImportDestination('library')}
                  />
                  <span>Minha biblioteca</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    importDestination === 'both'
                      ? 'bg-white border-brand-600 text-brand-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="import-destination"
                    value="both"
                    checked={importDestination === 'both'}
                    onChange={() => setImportDestination('both')}
                  />
                  <span>Projeto e biblioteca</span>
                </label>
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="ref-ou-cole-o-conteudo-bibtex-aqui"
                className="block text-slate-600 font-medium mb-1"
              >
                Ou cole o conteúdo (.bib, .ris ou CSL-JSON) aqui:
              </label>
              <textarea
                id="ref-ou-cole-o-conteudo-bibtex-aqui"
                rows={7}
                value={bibText}
                onChange={(e) => {
                  setBibText(e.target.value);
                  setUploadedFileName(undefined);
                }}
                placeholder={
                  '@article{silva2023,\n  author = {Silva, Roberto and Souza, Maria},\n  title = {Tipografia Digital},\n  journal = {Revista Brasileira},\n  year = {2023}\n}'
                }
                className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600"
              />
              {bibError && (
                <div
                  role="alert"
                  className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bibError}</span>
                </div>
              )}
            </div>

            {importSummary && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>{importSummary.text}</span>
                  </div>
                  {importSummary.duplicates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowImportDuplicates((v) => !v)}
                      className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                    >
                      {showImportDuplicates ? 'Ocultar duplicadas' : 'Ver duplicadas'}
                    </button>
                  )}
                </div>
                {showImportDuplicates && importSummary.duplicates.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-emerald-200 pt-2 text-xs text-emerald-800 max-h-36 overflow-y-auto">
                    {importSummary.duplicates.map((dup, idx) => (
                      <li key={`${dup.id}-${idx}`} className="truncate">
                        • <strong>{dup.title}</strong> ({dup.authors}, {dup.year})
                        {dup.doi ? ` — DOI: ${dup.doi}` : dup.isbn ? ` — ISBN: ${dup.isbn}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleImportReferences}
                disabled={!bibText.trim()}
                className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md font-semibold shadow-sm transition-colors"
              >
                Importar Referências (.bib / .ris / CSL-JSON)
              </button>
            </div>
          </div>
        ) : activeTab === 'library' ? (
          /* ABA 2: MINHA BIBLIOTECA (RDJ-07.1, RDJ-07.4, RDJ-07.5) */
          <div className="p-5 space-y-3.5 text-xs flex-1 overflow-y-auto">
            {/* Aviso de modo sem login (RDJ-07.4 Cenário 5) */}
            {!isAuthenticated && (
              <div
                role="note"
                className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2"
              >
                <CloudOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Você não está logado com o Google. Sua biblioteca funciona neste navegador, mas
                  não está sincronizada na nuvem.
                </span>
              </div>
            )}

            {/* Barra de Pastas (RDJ-07.5 Cenários 1, 3, 4) */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Folder className="w-3.5 h-3.5 text-brand-700" />
                  <span>Pastas</span>
                </div>
                <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => {
                      setNewFolderName(e.target.value);
                      setFolderError(null);
                    }}
                    placeholder="Nova pasta (ex: TCC)"
                    aria-label="Nome da nova pasta"
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-brand-600"
                  />
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Criar pasta</span>
                  </button>
                </form>
              </div>
              {folderError && <p className="text-xs text-red-600">{folderError}</p>}

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => setLibFolderFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    libFolderFilter === 'all'
                      ? 'bg-brand-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Todas ({library.references.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLibFolderFilter('unfiled')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    libFolderFilter === 'unfiled'
                      ? 'bg-brand-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Sem pasta ({library.references.filter((r) => !r.folderId).length})
                </button>
                {library.folders.map((folder) => {
                  const count = library.references.filter((r) => r.folderId === folder.id).length;
                  const isSelected = libFolderFilter === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className={`inline-flex items-center rounded-md border overflow-hidden ${
                        isSelected
                          ? 'bg-brand-700 text-white border-brand-700'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setLibFolderFilter(folder.id)}
                        className="px-2.5 py-1 font-medium"
                      >
                        {folder.name} ({count})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder.id)}
                        aria-label={`Excluir pasta ${folder.name}`}
                        title={`Excluir pasta "${folder.name}" (as referências irão para Sem pasta)`}
                        className={`px-1.5 py-1 border-l ${
                          isSelected
                            ? 'border-brand-600 text-brand-100 hover:bg-brand-800 hover:text-white'
                            : 'border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filtro de Tags (RDJ-07.5 Cenário 3) */}
            {library.allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                  <Tag className="w-3 h-3" />
                  <span>Tags:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLibTagFilter(null)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    libTagFilter === null
                      ? 'bg-brand-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                {library.allTags.map((tag) => {
                  const active =
                    libTagFilter?.toLocaleLowerCase('pt-BR') === tag.toLocaleLowerCase('pt-BR');
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setLibTagFilter(active ? null : tag)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        active
                          ? 'bg-brand-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Busca na biblioteca (RDJ-07.1 Cenário 2) */}
            {library.references.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={libSearchQuery}
                  onChange={(e) => setLibSearchQuery(e.target.value)}
                  placeholder="Buscar na biblioteca por título, autor ou ano..."
                  aria-label="Buscar na biblioteca"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600"
                />
              </div>
            )}

            {libraryFeedback && (
              <div
                role="alert"
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                  libraryFeedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span>{libraryFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setLibraryFeedback(null)}
                  className="text-xs underline"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Estado vazio da biblioteca (RDJ-07.1 Cenário 6) */}
            {library.references.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-3 bg-slate-50/60">
                <Library className="w-7 h-7 text-brand-700 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    Sua biblioteca pessoal ainda está vazia
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Guarde suas referências uma única vez para reutilizá-las em qualquer trabalho,
                    organizadas com pastas e tags.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setSaveToLibrary(true);
                      setTimeout(() => titleSearchInputRef.current?.focus(), 50);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white font-semibold transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar por título</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportDestination('library');
                      setActiveTab('bibtex');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-brand-500 text-slate-800 font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-brand-700" />
                    <span>Importar arquivo (.ris, CSL-JSON, .bib)</span>
                  </button>
                </div>
              </div>
            ) : filteredLibraryReferences.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-500">
                Nenhuma referência corresponde aos filtros selecionados.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredLibraryReferences.map((libRef) => {
                  const tagInputValue = tagInputByRefId[libRef.id] ?? '';
                  return (
                    <div
                      key={libRef.id}
                      data-testid={`library-ref-card-${libRef.id}`}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 space-y-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 text-xs leading-snug">
                            {libRef.title}
                            {libRef.subtitle ? `: ${libRef.subtitle}` : ''}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {libRef.authors} ({libRef.year})
                          </div>
                          <div className="text-xs text-slate-500">
                            {libRef.journal || libRef.publisher} • {libRef.city}
                            {libRef.doi ? ` • DOI: ${libRef.doi}` : ''}
                            {libRef.isbn ? ` • ISBN: ${libRef.isbn}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleInsertFromLibrary(libRef)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-700 hover:bg-brand-800 text-white font-semibold text-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Inserir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditLibraryRef(libRef)}
                            aria-label={`Editar ${libRef.title} na biblioteca`}
                            title="Editar na biblioteca"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => library.removeReference(libRef.id)}
                            aria-label={`Excluir ${libRef.title} da biblioteca`}
                            title="Excluir da biblioteca"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Pasta e Tags do item (RDJ-07.5 Cenários 1 e 2) */}
                      <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            aria-label={`Pasta de ${libRef.title}`}
                            value={libRef.folderId ?? ''}
                            onChange={(e) =>
                              library.moveToFolder(
                                [libRef.id],
                                e.target.value ? e.target.value : null,
                              )
                            }
                            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                          >
                            <option value="">Sem pasta</option>
                            {library.folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap flex-1 justify-end">
                          {libRef.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-xs font-medium"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                aria-label={`Remover tag ${tag}`}
                                onClick={() => handleRemoveTagFromLibraryRef(libRef, tag)}
                                className="text-brand-600 hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAddTagsToLibraryRef(libRef, tagInputValue);
                            }}
                            className="inline-flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={tagInputValue}
                              onChange={(e) =>
                                setTagInputByRefId((prev) => ({
                                  ...prev,
                                  [libRef.id]: e.target.value,
                                }))
                              }
                              placeholder="Adicionar tag..."
                              aria-label={`Adicionar tag em ${libRef.title}`}
                              className="w-28 px-2 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-brand-600"
                            />
                            <button
                              type="submit"
                              disabled={!tagInputValue.trim()}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded text-xs font-medium"
                            >
                              + Tag
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ABA 1: BUSCA POR TÍTULO / DOI / ISBN E FORMULÁRIO MANUAL */
          <>
            {!editingLibraryRef && (
              <div className="px-5 py-3 bg-brand-50/60 border-b border-brand-100 space-y-2.5">
                {/* Busca por Título ou Autor (RDJ-07.2) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                    <Search className="w-3.5 h-3.5 text-brand-700" />
                    <span>Buscar por Título ou Autor (OpenAlex &amp; Crossref)</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={titleSearchInputRef}
                      type="text"
                      value={titleSearchQuery}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setTitleSearchQuery(nextVal);
                        if (nextVal.trim().length < 3) {
                          setTitleSearchResults(null);
                          setTitleSearchError(null);
                          setIsSearchingTitle(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleManualTitleSearch();
                        }
                      }}
                      placeholder="Digite o título da obra ou nome do autor..."
                      aria-label="Buscar obra pelo título ou pelo autor"
                      className="flex-1 text-xs px-3 py-1.5 bg-white border border-brand-200 rounded-md focus:outline-none focus:border-brand-600"
                    />
                    <button
                      type="button"
                      onClick={() => void handleManualTitleSearch()}
                      disabled={isSearchingTitle || !titleSearchQuery.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      {isSearchingTitle ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Buscar título</span>
                    </button>
                  </div>

                  {titleSearchError && (
                    <div
                      role="alert"
                      className="p-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2"
                    >
                      <span>{titleSearchError}</span>
                      <button
                        type="button"
                        onClick={handleFocusManualEntry}
                        className="shrink-0 font-semibold underline hover:text-red-900"
                      >
                        Cadastro manual
                      </button>
                    </div>
                  )}

                  {titleSearchResults && titleSearchResults.length === 0 && (
                    <div
                      role="status"
                      className="p-2.5 rounded-md bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2"
                    >
                      <span>Nenhuma obra encontrada para &ldquo;{titleSearchQuery}&rdquo;.</span>
                      <button
                        type="button"
                        onClick={handleFocusManualEntry}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Cadastro manual
                      </button>
                    </div>
                  )}

                  {titleSearchResults && titleSearchResults.length > 0 && (
                    <div
                      role="region"
                      aria-label="Resultados da busca por título ou autor"
                      className="max-h-44 overflow-y-auto rounded-lg border border-brand-200 bg-white divide-y divide-slate-100 shadow-sm"
                    >
                      {titleSearchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left p-2.5 hover:bg-brand-50/70 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-semibold text-xs text-slate-900 leading-snug">
                              {item.title}
                              {item.subtitle ? `: ${item.subtitle}` : ''}
                            </div>
                            <div className="text-xs text-slate-600 truncate">
                              {item.authors} • {item.year}
                              {item.venue ? ` • ${item.venue}` : ''}
                            </div>
                            {item.doi && (
                              <div className="text-xs text-brand-700 font-mono">
                                DOI: {item.doi}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 px-2 py-1 rounded bg-brand-100 text-brand-800 font-semibold text-xs">
                            Escolher
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Busca Automática por DOI ou ISBN */}
                <div className="space-y-1.5 pt-2 border-t border-brand-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                    <Sparkles className="w-3.5 h-3.5 text-brand-700" />
                    <span>Preenchimento Automático por DOI ou ISBN</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={doiQuery}
                      onChange={(e) => setDoiQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleLookup();
                        }
                      }}
                      placeholder="Cole o DOI (ex: 10.1145/...) ou ISBN (ex: 9788535236996)"
                      className="flex-1 text-xs px-3 py-1.5 bg-white border border-brand-200 rounded-md focus:outline-none focus:border-brand-600"
                    />
                    <button
                      type="button"
                      onClick={() => void handleLookup()}
                      disabled={isLookingUp}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      {isLookingUp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Buscar</span>
                    </button>
                  </div>
                  {lookupError && <p className="text-xs text-red-600">{lookupError}</p>}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              {formNotice && (
                <div
                  role="alert"
                  className={`p-2.5 rounded-lg border text-xs ${
                    formNotice.includes('já está neste projeto')
                      ? 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
                      : 'bg-brand-50 border-brand-200 text-brand-900'
                  }`}
                >
                  {formNotice}
                </div>
              )}

              {/* Tipo de obra */}
              <div>
                <label
                  htmlFor="ref-tipo-de-documento"
                  className="block text-slate-600 font-medium mb-1"
                >
                  Tipo de Documento
                </label>
                <select
                  id="ref-tipo-de-documento"
                  value={type}
                  onChange={(e) => setType(e.target.value as ReferenceType)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                >
                  {REFERENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ref-autores-ex-silva-joao-da-santos-maria"
                  className="block text-slate-600 font-medium mb-1"
                >
                  Autores (ex: SILVA, João da; SANTOS, Maria) *
                </label>
                <input
                  ref={manualAuthorsInputRef}
                  id="ref-autores-ex-silva-joao-da-santos-maria"
                  type="text"
                  required
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="SOBRENOME, Nome"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label
                  htmlFor="ref-titulo-da-obra"
                  className="block text-slate-600 font-medium mb-1"
                >
                  Título da Obra *
                </label>
                <input
                  id="ref-titulo-da-obra"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título principal da publicação"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ref-subtitulo" className="block text-slate-600 font-medium mb-1">
                    Subtítulo
                  </label>
                  <input
                    id="ref-subtitulo"
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Subtítulo opcional"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label htmlFor="ref-ano" className="block text-slate-600 font-medium mb-1">
                    Ano *
                  </label>
                  <input
                    id="ref-ano"
                    type="text"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              {/* Campos específicos para Artigo de Periódico */}
              {type === 'article' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                  <div>
                    <label
                      htmlFor="ref-nome-da-revista-periodico"
                      className="block text-slate-600 font-medium mb-1"
                    >
                      Nome da Revista / Periódico *
                    </label>
                    <input
                      id="ref-nome-da-revista-periodico"
                      type="text"
                      required
                      value={journal}
                      onChange={(e) => setJournal(e.target.value)}
                      placeholder="Ex: Revista Brasileira de Computação"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label
                        htmlFor="ref-volume-v"
                        className="block text-slate-600 font-medium mb-1"
                      >
                        Volume (v.)
                      </label>
                      <input
                        id="ref-volume-v"
                        type="text"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        placeholder="12"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ref-numero-n"
                        className="block text-slate-600 font-medium mb-1"
                      >
                        Número (n.)
                      </label>
                      <input
                        id="ref-numero-n"
                        type="text"
                        value={issue}
                        onChange={(e) => setIssue(e.target.value)}
                        placeholder="3"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ref-paginas-p"
                        className="block text-slate-600 font-medium mb-1"
                      >
                        Páginas (p.)
                      </label>
                      <input
                        id="ref-paginas-p"
                        type="text"
                        value={pages}
                        onChange={(e) => setPages(e.target.value)}
                        placeholder="45-62"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campos específicos para Tese / Dissertação / TCC */}
              {type === 'thesis' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="ref-tipo-grau"
                      className="block text-slate-600 font-medium mb-1"
                    >
                      Tipo / Grau
                    </label>
                    <input
                      id="ref-tipo-grau"
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="Dissertação (Mestrado)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ref-instituicao"
                      className="block text-slate-600 font-medium mb-1"
                    >
                      Instituição
                    </label>
                    <input
                      id="ref-instituicao"
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="USP / UNICAMP"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ref-cidade" className="block text-slate-600 font-medium mb-1">
                    Cidade
                  </label>
                  <input
                    id="ref-cidade"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ref-editora-orgao"
                    className="block text-slate-600 font-medium mb-1"
                  >
                    Editora / Órgão
                  </label>
                  <input
                    id="ref-editora-orgao"
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Editora"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label htmlFor="ref-edicao" className="block text-slate-600 font-medium mb-1">
                    Edição
                  </label>
                  <input
                    id="ref-edicao"
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="Ex: 2"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ref-doi" className="block text-slate-600 font-medium mb-1">
                    DOI (opcional)
                  </label>
                  <input
                    id="ref-doi"
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="10.1000/xyz123"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label htmlFor="ref-isbn" className="block text-slate-600 font-medium mb-1">
                    ISBN (opcional)
                  </label>
                  <input
                    id="ref-isbn"
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="9788535236996"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ref-link-url-se-disponivel-online"
                  className="block text-slate-600 font-medium mb-1"
                >
                  Link / URL (Se disponível online)
                </label>
                <input
                  id="ref-link-url-se-disponivel-online"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/artigo.pdf"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                />
              </div>

              {/* Opção de salvar também na Minha Biblioteca (RDJ-07.1 Cenário 1) */}
              {!editingReference && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  {!editingLibraryRef && (
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        id="ref-save-to-library"
                        type="checkbox"
                        checked={saveToLibrary}
                        onChange={(e) => setSaveToLibrary(e.target.checked)}
                        className="rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                      />
                      <span>Salvar também na minha biblioteca</span>
                    </label>
                  )}

                  {(saveToLibrary || editingLibraryRef) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label
                          htmlFor="ref-library-folder"
                          className="block text-slate-600 font-medium mb-1"
                        >
                          Pasta na biblioteca
                        </label>
                        <select
                          id="ref-library-folder"
                          value={formFolderId ?? ''}
                          onChange={(e) => setFormFolderId(e.target.value ? e.target.value : null)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                        >
                          <option value="">Sem pasta</option>
                          {library.folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="ref-library-tags"
                          className="block text-slate-600 font-medium mb-1"
                        >
                          Tags (separadas por vírgula)
                        </label>
                        <input
                          id="ref-library-tags"
                          type="text"
                          value={formTagsInput}
                          onChange={(e) => setFormTagsInput(e.target.value)}
                          placeholder="Ex: metodologia, qualitativa"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (editingLibraryRef) {
                      setEditingLibraryRef(null);
                      setActiveTab('library');
                    } else {
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-md font-medium shadow-sm transition-colors"
                >
                  {editingLibraryRef ? 'Salvar na Biblioteca' : 'Salvar Referência'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};
