import React, { useState } from 'react';
import {
  Bug,
  X,
  Upload,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import {
  ALLOWED_IMAGE_MIMES,
  formatBytes,
  MAX_BUG_REPORT_IMAGES,
  MAX_BUG_REPORT_SINGLE_IMAGE_BYTES,
  MAX_BUG_REPORT_TOTAL_IMAGE_BYTES,
} from '@/core/storage/imageQuota';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

interface AttachedScreenshot {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

type ReportCategory = 'bug' | 'abnt_pdf' | 'suggestion' | 'other';

const MAX_SUBJECT_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 15;
const FORMSUBMIT_TOKEN = '97b345b83e1745e749547159d420f2a5';
const COMPANY_SUPPORT_EMAIL = 'contato.redija@gmail.com';

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  projectName,
}) => {
  const [category, setCategory] = useState<ReportCategory>('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [screenshots, setScreenshots] = useState<AttachedScreenshot[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalScreenshotsBytes = screenshots.reduce((acc, s) => acc + s.size, 0);

  const handleFilesSelected = (fileList: FileList | File[]) => {
    setErrorMsg(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (screenshots.length + files.length > MAX_BUG_REPORT_IMAGES) {
      setErrorMsg(
        `Você pode anexar no máximo ${MAX_BUG_REPORT_IMAGES} imagens por relato (atualmente: ${screenshots.length}/${MAX_BUG_REPORT_IMAGES}).`,
      );
      return;
    }

    let runningTotalBytes = totalScreenshotsBytes;

    for (const file of files) {
      if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
        setErrorMsg(`O arquivo "${file.name}" não é uma imagem válida (use PNG, JPG, WebP ou GIF).`);
        return;
      }

      if (file.size > MAX_BUG_REPORT_SINGLE_IMAGE_BYTES) {
        setErrorMsg(
          `A imagem "${file.name}" (${formatBytes(file.size)}) excede o limite de 5 MB por print.`,
        );
        return;
      }

      if (runningTotalBytes + file.size > MAX_BUG_REPORT_TOTAL_IMAGE_BYTES) {
        setErrorMsg(
          `O tamanho total dos prints excede o limite de 15 MB por envio de e-mail.`,
        );
        return;
      }

      runningTotalBytes += file.size;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setScreenshots((prev) => {
            if (prev.length >= MAX_BUG_REPORT_IMAGES) return prev;
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                name: file.name || `print-${prev.length + 1}.png`,
                size: file.size,
                dataUrl: reader.result as string,
              },
            ];
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
    setErrorMsg(null);
  };

  const handleResetAndClose = () => {
    setSubmittedProtocol(null);
    setErrorMsg(null);
    setIsSending(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!subject.trim()) {
      setErrorMsg('Informe um resumo/assunto curto para o problema.');
      return;
    }

    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      setErrorMsg(
        `Descreva o problema com pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres para que nossa equipe consiga reproduzir.`,
      );
      return;
    }

    setIsSending(true);

    const randomSuffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const protocol = `RDJ-${new Date().getFullYear()}-${randomSuffix}`;

    try {
      const payload: Record<string, unknown> = {
        _subject: `[RedijaApp] ${protocol}: ${subject.trim()}`,
        _template: 'table',
        _captcha: 'false',
        protocolo: protocol,
        categoria: category,
        remetente: userEmail.trim() || 'anonimo@usuario.redija.com.br',
        assunto: subject.trim(),
        descricao: description.trim(),
        projetoAtivo: projectName || 'Nenhum',
        quantidadePrints: screenshots.length,
      };

      if (includeDiagnostics) {
        payload.diagnostico = {
          projeto: projectName || 'Sem título',
          navegador: navigator.userAgent,
          temaEscuro: document.documentElement.classList.contains('dark'),
          resolucao: `${window.innerWidth}x${window.innerHeight}`,
          horario: new Date().toISOString(),
        };
      }

      const response = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Serviço de e-mail retornou status HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('Envio direto via FormSubmit indisponível, acionando fallback mailto:', err);
      const mailtoSubject = encodeURIComponent(`[RedijaApp] Relato ${protocol}: ${subject.trim()}`);
      const mailtoBody = encodeURIComponent(
        `Protocolo: ${protocol}\nCategoria: ${category}\nRemetente: ${userEmail}\nProjeto: ${projectName}\n\nDescrição:\n${description}\n\nNavegador: ${navigator.userAgent}`,
      );
      window.open(`mailto:${COMPANY_SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`, '_blank');
    } finally {
      setIsSending(false);
      setSubmittedProtocol(protocol);
      setSubject('');
      setDescription('');
      setScreenshots([]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onPaste={(e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const pastedImages: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) pastedImages.push(file);
          }
        }
        if (pastedImages.length > 0) {
          e.preventDefault();
          handleFilesSelected(pastedImages);
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">
                Relatar Problema ou Sugestão
              </h3>
              <p className="text-xs text-neutral-500">
                Envie uma descrição e até 5 capturas de tela para nossa equipe técnica
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedProtocol ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-neutral-900">
                Relato recebido com sucesso!
              </h4>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Seu relato foi enviado diretamente para{' '}
                <strong className="text-neutral-800">{COMPANY_SUPPORT_EMAIL}</strong>.
              </p>
            </div>

            <div className="inline-block px-3.5 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-xs">
              <span className="text-neutral-500">Protocolo de atendimento: </span>
              <strong className="font-mono text-emerald-700">{submittedProtocol}</strong>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubmittedProtocol(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Enviar outro relato
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Categoria e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Categoria do Relato
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="w-full px-2.5 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="bug">Bug / Erro na Aplicação</option>
                  <option value="abnt_pdf">Problema na Formatação ABNT / PDF</option>
                  <option value="suggestion">Sugestão de Melhoria</option>
                  <option value="other">Outro Assunto</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Seu E-mail para Retorno (Opcional)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="voce@universidade.edu.br"
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Assunto */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-700">
                  Resumo / Assunto *
                </label>
                <span className="text-[10px] text-neutral-400">
                  {subject.length} / {MAX_SUBJECT_LENGTH}
                </span>
              </div>
              <input
                type="text"
                maxLength={MAX_SUBJECT_LENGTH}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: A tabela ultrapassa a margem direita quando tem 8 colunas"
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Descrição */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-700">
                  Descrição detalhada (o que aconteceu e como reproduzir) *
                </label>
                <span
                  className={`text-[10px] ${
                    description.length > MAX_DESCRIPTION_LENGTH * 0.9
                      ? 'text-amber-600 font-semibold'
                      : 'text-neutral-400'
                  }`}
                >
                  {description.length} / {MAX_DESCRIPTION_LENGTH} caracteres
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os passos até o erro acontecer..."
                className="w-full p-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 leading-relaxed"
              />
            </div>

            {/* Upload de até 5 imagens */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-700">
                  Capturas de Tela / Imagens (Opcional, máx. {MAX_BUG_REPORT_IMAGES} imagens)
                </label>
                <span className="text-[10px] text-neutral-500">
                  {screenshots.length}/{MAX_BUG_REPORT_IMAGES} anexos •{' '}
                  {formatBytes(totalScreenshotsBytes)} / 15 MB
                </span>
              </div>

              {screenshots.length < MAX_BUG_REPORT_IMAGES && (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer?.files) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className={`w-full py-4 px-3 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center ${
                    isDraggingOver
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="font-medium text-neutral-700">
                    Clique para fazer upload, arraste imagens ou cole um print com Ctrl+V
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    Até {MAX_BUG_REPORT_IMAGES} imagens (máx. 5 MB por imagem • PNG, JPG, WebP)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}

              {screenshots.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2.5">
                  {screenshots.map((shot) => (
                    <div
                      key={shot.id}
                      className="relative group border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100 aspect-square flex flex-col"
                    >
                      <img
                        src={shot.dataUrl}
                        alt={shot.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveScreenshot(shot.id)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-red-600 transition-colors"
                        title="Remover esta captura de tela"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] px-1 py-0.5 truncate">
                        {formatBytes(shot.size)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkbox Diagnóstico */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] text-neutral-600">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                Incluir dados técnicos básicos do navegador (resolução, tema e versão) para ajudar no diagnóstico
              </span>
            </label>

            {/* Rodapé de Ações */}
            <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">
                Destino: {COMPANY_SUPPORT_EMAIL}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-3.5 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold shadow-xs transition-colors"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando relato...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Relato</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
