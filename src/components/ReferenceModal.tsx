import React, { useState, useRef } from 'react';
import { AcademicReference, ReferenceType } from '@/types/document';
import { lookupByDoiOrIsbn, parseBibtex } from '@/core/transpiler/abntLinter';
import { X, BookmarkPlus, Search, Loader2, Sparkles, Upload, FileCode2 } from 'lucide-react';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReference?: AcademicReference | null;
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
  editingReference = null,
  onAddReference,
  onUpdateReference,
  onAddMultipleReferences,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'bibtex'>('form');
  const [bibText, setBibText] = useState('');
  const [bibError, setBibError] = useState<string | null>(null);
  const bibFileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ReferenceType>('book');
  const [doiQuery, setDoiQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

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
  const [lastSyncedRefId, setLastSyncedRefId] = useState<string | null>(null);

  const currentRefId = isOpen ? (editingReference?.id ?? '__new__') : null;
  if (currentRefId !== lastSyncedRefId) {
    setLastSyncedRefId(currentRefId);
    if (editingReference) {
      setActiveTab('form');
      setType(editingReference.type || 'book');
      setAuthors(editingReference.authors || '');
      setTitle(editingReference.title || '');
      setSubtitle(editingReference.subtitle || '');
      setEdition(editingReference.edition || '');
      setCity(editingReference.city || '');
      setPublisher(editingReference.publisher || '');
      setYear(editingReference.year || String(new Date().getFullYear()));
      setJournal(editingReference.journal || '');
      setVolume(editingReference.volume || '');
      setIssue(editingReference.issue || '');
      setPages(editingReference.pages || '');
      setInstitution(editingReference.institution || '');
      setDegree(editingReference.degree || '');
      setUrl(editingReference.url || '');
      setDoi(editingReference.doi || '');
    } else if (isOpen) {
      setType('book');
      setDoiQuery('');
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
    }
  }

  if (!isOpen) return null;

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
      if (data.url) setUrl(data.url);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao buscar DOI/ISBN.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authors || !title) return;

    const payload: AcademicReference = {
      id: editingReference ? editingReference.id : crypto.randomUUID(),
      type,
      authors,
      title,
      subtitle: subtitle || undefined,
      edition: edition || undefined,
      city: city || 'São Paulo',
      publisher: publisher || 'Editora',
      year: year || String(new Date().getFullYear()),
      journal: journal || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      institution: institution || undefined,
      degree: degree || undefined,
      doi: doi || undefined,
      url: url || undefined,
      accessDate: url
        ? editingReference?.accessDate || new Date().toLocaleDateString('pt-BR')
        : undefined,
    };

    if (editingReference && onUpdateReference) {
      onUpdateReference(payload);
    } else {
      onAddReference(payload);
    }

    onClose();
  };

  const handleBibImport = () => {
    setBibError(null);
    const parsed = parseBibtex(bibText);
    if (parsed.length === 0) {
      setBibError('Nenhuma entrada BibTeX (@article, @book, etc.) válida encontrada no texto.');
      return;
    }
    if (onAddMultipleReferences) {
      onAddMultipleReferences(parsed);
    } else {
      parsed.forEach((r) => onAddReference(r));
    }
    setBibText('');
    onClose();
  };

  const handleBibFileUpload = async (file: File) => {
    try {
      const content = await file.text();
      setBibText(content);
      setBibError(null);
    } catch {
      setBibError('Não foi possível ler o arquivo .bib selecionado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-neutral-900">
              {editingReference
                ? 'Editar Referência Bibliográfica (ABNT NBR 6023)'
                : 'Nova Referência Bibliográfica (ABNT NBR 6023)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de Abas: Manual / DOI / ISBN vs Importar BibTeX (.bib) */}
        <div className="px-5 pt-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            DOI / ISBN ou Manual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bibtex')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'bibtex'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Importar .bib (BibTeX)</span>
          </button>
        </div>

        {activeTab === 'bibtex' ? (
          <div className="p-5 space-y-4 text-xs flex-1 overflow-y-auto">
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-neutral-700 space-y-2">
              <p className="font-medium text-emerald-900">
                Importe referências do Google Acadêmico, SciELO, Zotero, Mendeley ou Lattes
              </p>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Envie um arquivo <code className="font-mono">.bib</code> com dezenas de obras de uma só vez ou cole o código BibTeX abaixo.
              </p>
              <div>
                <input
                  ref={bibFileRef}
                  type="file"
                  accept=".bib,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBibFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => bibFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-neutral-300 hover:border-emerald-500 text-neutral-800 font-medium text-xs shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Selecionar arquivo .bib do computador</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-neutral-600 font-medium mb-1">
                Ou cole o conteúdo BibTeX aqui:
              </label>
              <textarea
                rows={8}
                value={bibText}
                onChange={(e) => setBibText(e.target.value)}
                placeholder={'@article{silva2023,\n  author = {Silva, Roberto and Souza, Maria},\n  title = {Tipografia Digital},\n  journal = {Revista Brasileira},\n  year = {2023}\n}'}
                className="w-full font-mono text-xs p-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              {bibError && <p className="text-[11px] text-red-600 mt-1">{bibError}</p>}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBibImport}
                disabled={!bibText.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-semibold shadow-sm transition-colors"
              >
                Importar Referências (.bib)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Busca Automática por DOI ou ISBN */}
        <div className="px-5 py-3 bg-emerald-50/60 border-b border-emerald-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
                  handleLookup();
                }
              }}
              placeholder="Cole o DOI (ex: 10.1145/...) ou ISBN (ex: 9788535236996)"
              className="flex-1 text-xs px-3 py-1.5 bg-white border border-emerald-200 rounded-md focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={isLookingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors"
            >
              {isLookingUp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Buscar</span>
            </button>
          </div>
          {lookupError && <p className="text-[11px] text-red-600">{lookupError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
          {/* Tipo de obra */}
          <div>
            <label className="block text-neutral-600 font-medium mb-1">Tipo de Documento</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReferenceType)}
              className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
            >
              {REFERENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              Autores (ex: SILVA, João da; SANTOS, Maria) *
            </label>
            <input
              type="text"
              required
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="SOBRENOME, Nome"
              className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">Título da Obra *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título principal da publicação"
              className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Subtítulo</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtítulo opcional"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Ano *</label>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Campos específicos para Artigo de Periódico */}
          {type === 'article' && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2.5">
              <div>
                <label className="block text-neutral-600 font-medium mb-1">
                  Nome da Revista / Periódico *
                </label>
                <input
                  type="text"
                  required
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="Ex: Revista Brasileira de Computação"
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Volume (v.)</label>
                  <input
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="12"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Número (n.)</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="3"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Páginas (p.)</label>
                  <input
                    type="text"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="45-62"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos para Tese / Dissertação / TCC */}
          {type === 'thesis' && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-neutral-600 font-medium mb-1">Tipo / Grau</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="Dissertação (Mestrado)"
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-neutral-600 font-medium mb-1">Instituição</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="USP / UNICAMP"
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Editora / Órgão</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Editora"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Edição</label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Ex: 2"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              Link / URL (Se disponível online)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/artigo.pdf"
              className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-sm transition-colors"
            >
              Salvar Referência
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
