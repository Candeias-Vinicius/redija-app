import React, { useState } from 'react';
import { AcademicReference } from '@/types/document';
import { X, BookmarkPlus } from 'lucide-react';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReference: (ref: AcademicReference) => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  onClose,
  onAddReference,
}) => {
  const [authors, setAuthors] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [edition, setEdition] = useState('');
  const [city, setCity] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('2024');
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authors || !title) return;

    onAddReference({
      id: crypto.randomUUID(),
      authors,
      title,
      subtitle: subtitle || undefined,
      edition: edition || undefined,
      city: city || 'São Paulo',
      publisher: publisher || 'Editora',
      year: year || '2024',
      url: url || undefined,
      accessDate: url ? new Date().toLocaleDateString('pt-BR') : undefined,
    });

    // Reset fields
    setAuthors('');
    setTitle('');
    setSubtitle('');
    setEdition('');
    setCity('');
    setPublisher('');
    setUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-neutral-900">
              Adicionar Referência (ABNT NBR 6023)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
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
            <label className="block text-neutral-600 font-medium mb-1">
              Título da Obra *
            </label>
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
              <label className="block text-neutral-600 font-medium mb-1">Editora</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Campus"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Ano</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">Link / URL (Se for online)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/artigo.pdf"
              className="w-full px-3 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
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
      </div>
    </div>
  );
};
