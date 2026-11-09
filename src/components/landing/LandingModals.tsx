import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Users,
  Mail,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import {
  COMPANY_SUPPORT_EMAIL,
  submitFeedbackWithMailtoFallback,
} from '@/core/feedback/feedbackService';
import type { FeedbackPayload } from '@/core/feedback/types';
import { ABNT_STANDARDS_DOCS } from './abntStandardsDocs';
import { GitHubIcon } from '../GitHubIcon';
import {
  GITHUB_ISSUES_URL,
  GITHUB_LICENSE_URL,
  GITHUB_REPO_URL,
  GITHUB_THIRD_PARTY_NOTICES_URL,
} from '@/core/links';

export type LandingModalType = 'docs' | 'about' | 'contact' | 'privacy' | 'terms' | null;

interface LandingModalsProps {
  modalType: LandingModalType;
  selectedStandard?: string;
  onClose: () => void;
  onOpenFullDocs?: (sectionId?: string) => void;
  isDark: boolean;
}

export const LandingModals: React.FC<LandingModalsProps> = ({
  modalType,
  selectedStandard,
  onClose,
  onOpenFullDocs,
  isDark,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeDocCode, setActiveDocCode] = useState<string>(
    selectedStandard || 'ABNT NBR 14724',
  );
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [userEmail, setUserEmail] = useState('');

  if (!modalType) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(COMPANY_SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSendingFeedback(true);
    const payload: FeedbackPayload = {
      tipo: 'contato',
      email: userEmail.trim(),
      assunto: 'Contato via Landing Page',
      mensagem: feedbackText.trim(),
      diagnostico: {
        origem: 'Landing Page (Modal de Contato)',
        navegador: navigator.userAgent,
        horario: new Date().toISOString(),
      },
    };

    try {
      await submitFeedbackWithMailtoFallback(payload, {
        subject: '[RedijaApp] Contato via Landing Page',
        body: `Remetente: ${userEmail || 'Não informado'}\n\nMensagem:\n${feedbackText}`,
      });
    } finally {
      setIsSendingFeedback(false);
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackText('');
        setUserEmail('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col transition-all ${
          isDark
            ? 'bg-[#0b1220] border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal com botão de fechar */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {modalType === 'docs' && <BookOpen className="w-5 h-5 text-emerald-500" />}
            {modalType === 'about' && <Users className="w-5 h-5 text-teal-500" />}
            {modalType === 'contact' && <MessageSquare className="w-5 h-5 text-blue-500" />}
            {modalType === 'privacy' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
            {modalType === 'terms' && <FileText className="w-5 h-5 text-amber-500" />}

            <h3 className="font-bold text-base sm:text-lg">
              {modalType === 'docs' && 'Documentação das Normas ABNT Atendidas'}
              {modalType === 'about' && 'Sobre o RedijaApp'}
              {modalType === 'contact' && 'Fale Conosco & Comunidade'}
              {modalType === 'privacy' && 'Política de Privacidade & Dados'}
              {modalType === 'terms' && 'Termos de Uso & Código Aberto'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* CONTEÚDO ESPECÍFICO DO MODAL SELECIONADO                  */}
        {/* ========================================================= */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm leading-relaxed">
          {/* ------------------------------------------------------- */}
          {/* MODAL 1: DOCUMENTAÇÃO ABNT                              */}
          {/* ------------------------------------------------------- */}
          {modalType === 'docs' && (
            <div className="space-y-6">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                O RedijaApp foi projetado a partir das normas oficiais vigentes da Associação Brasileira de Normas Técnicas (ABNT). Abaixo estão listadas as 9 normas implementadas no compilador Typst:
              </p>

              {/* Seletor Rápido de Normas */}
              <div className="flex flex-wrap gap-1.5 pb-2">
                {ABNT_STANDARDS_DOCS.map((doc) => (
                  <button
                    key={doc.code}
                    onClick={() => setActiveDocCode(doc.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeDocCode === doc.code
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : isDark
                          ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {doc.code.split(' ')[1] || doc.code}
                  </button>
                ))}
              </div>

              {/* Norma Ativa em Destaque */}
              {(() => {
                const currentDoc =
                  ABNT_STANDARDS_DOCS.find((d) => d.code === activeDocCode) ||
                  ABNT_STANDARDS_DOCS[0];
                return (
                  <div
                    className={`p-5 rounded-2xl border space-y-4 ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {currentDoc.code}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentDoc.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {currentDoc.summary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                        Regras Implementadas no RedijaApp:
                      </span>
                      <ul className="space-y-2 text-xs">
                        {currentDoc.rulesApplied.map((rule, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-slate-600 dark:text-slate-300"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MODAL 2: SOBRE NÓS (ABOUT US)                           */}
          {/* ------------------------------------------------------- */}
          {modalType === 'about' && (
            <div className="space-y-5 text-slate-600 dark:text-slate-300">
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  A nossa missão: devolver o tempo da ciência aos pesquisadores
                </h4>
                <p>
                  No Brasil, anualmente milhões de horas são desperdiçadas por graduandos, pós-graduandos e professores lutando contra as margens do Microsoft Word ou quebrando a cabeça com erros misteriosos de compilação do LaTeX.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200 space-y-2 text-xs sm:text-sm">
                <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Nossa Filosofia
                </span>
                <p>
                  Acreditamos que a formatação não deveria ser uma barreira para a produção do conhecimento científico. O rigor formal da ABNT deve ser garantido pelo software, de forma invisível, elegante e automática.
                </p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  Por que escolhemos o Typst?
                </h5>
                <p>
                  O Typst é o avanço mais significativo em diagramação acadêmica das últimas três décadas. Ele combina a legibilidade do Markdown com a precisão do LaTeX e a velocidade inacreditável do Rust. Ao embutirmos o Typst em WebAssembly diretamente no navegador, eliminamos qualquer custo com servidores externos e oferecemos um ambiente 100% gratuito e livre para a comunidade brasileira.
                </p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  Bring Your Own Storage (BYOS)
                </h5>
                <p>
                  Nós não queremos e não precisamos hospedar seus arquivos de pesquisa. O RedijaApp integra diretamente com o seu próprio Google Drive e utiliza IndexedDB no seu computador, garantindo soberania total, privacidade inegociável e independência para você.
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GitHubIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Projeto de código aberto sob licença AGPL-3.0 no GitHub.</span>
                </div>
                <div className="flex items-center gap-3 font-semibold">
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Repositório
                  </a>
                  <a
                    href={GITHUB_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Issues
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MODAL 3: CONTATO E SUPORTE                              */}
          {/* ------------------------------------------------------- */}
          {modalType === 'contact' && (
            <div className="space-y-6">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Tem dúvidas, sugestões de melhoria para alguma norma ABNT ou encontrou um bug? Estamos sempre à disposição para ouvir você.
              </p>

              {/* Cartão de E-mail Direto */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      E-mail Oficial
                    </span>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {COMPANY_SUPPORT_EMAIL}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopyEmail}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    copiedEmail
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedEmail ? 'Copiado!' : 'Copiar E-mail'}</span>
                </button>
              </div>

              {/* Formulário Rápido de Feedback */}
              <form onSubmit={handleSendFeedback} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seu e-mail para resposta (opcional):
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="voce@universidade.edu.br"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-hidden transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sua mensagem ou sugestão:
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Escreva sua sugestão de recurso, relato de problema ou dúvida..."
                    rows={4}
                    className={`w-full p-3 rounded-xl border text-xs outline-hidden transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!feedbackText.trim() || isSendingFeedback || feedbackSent}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      feedbackSent
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isSendingFeedback
                      ? 'Enviando...'
                      : feedbackSent
                        ? 'Mensagem Recebida!'
                        : 'Enviar Mensagem'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MODAL 4: PRIVACIDADE & DADOS                            */}
          {/* ------------------------------------------------------- */}
          {modalType === 'privacy' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  Privacidade por Design (Privacy by Design)
                </span>
                <p className="text-xs">
                  O RedijaApp não possui banco de dados proprietário na nuvem com o conteúdo dos seus trabalhos.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  1. Armazenamento Google Drive (BYOS)
                </h5>
                <p>
                  Quando você conecta sua conta Google, o RedijaApp solicita apenas a permissão restrita de acessar os arquivos criados pelo próprio aplicativo (<code className="font-mono">drive.file</code>). Nós não temos acesso aos seus outros arquivos do Google Drive. Seus trabalhos são salvos na sua própria conta, sob seu domínio e responsabilidade.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  2. Processamento Local em WebAssembly
                </h5>
                <p>
                  Toda a compilação do seu documento Typst para PDF ocorre no seu próprio computador via WebAssembly. Os textos da sua pesquisa nunca são enviados a servidores externos para renderização.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  3. Conformidade com a LGPD
                </h5>
                <p>
                  Em total harmonia com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode revogar o acesso do aplicativo à sua conta Google ou apagar todos os dados armazenados no cache local a qualquer momento nas Configurações de Conta.
                </p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MODAL 5: TERMOS DE USO                                  */}
          {/* ------------------------------------------------------- */}
          {modalType === 'terms' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  1. Natureza Gratuita e Aberta (GNU AGPL-3.0)
                </h5>
                <p>
                  O RedijaApp é software livre disponibilizado gratuitamente sob a licença{' '}
                  <a
                    href={GITHUB_LICENSE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    GNU Affero General Public License v3.0 (AGPL-3.0)
                  </a>
                  . Modificações distribuídas ou hospedadas em rede (SaaS) devem preservar os
                  créditos originais e manter o código-fonte acessível sob a mesma licença. A
                  licença do código não autoriza o uso do nome ou logotipo oficial RedijaApp em
                  serviços de terceiros.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  2. Propriedade Intelectual
                </h5>
                <p>
                  Todo o conteúdo textual, ilustrações, dados científicos e ideias geradas nos trabalhos pertencem 100% aos respectivos autores. O RedijaApp não reivindica qualquer direito autoral ou participação sobre os trabalhos produzidos na plataforma.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  3. Isenção de Responsabilidade Normativa
                </h5>
                <p>
                  Embora o RedijaApp aplique rigorosamente as normas ABNT vigentes, a aprovação final de formatação é prerrogativa soberana das bancas examinadoras e das diretrizes específicas de cada instituição de ensino superior.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  4. Créditos ao Motor Typst &amp; Licenças de Terceiros
                </h5>
                <p>
                  A compilação e renderização científica no navegador utiliza o motor{' '}
                  <strong>Typst</strong> e os bindings WebAssembly <strong>typst.ts</strong>{' '}
                  (ambos sob licença <strong>Apache-2.0</strong>), além das fontes locais Tinos e
                  Arimo (<strong>Apache-2.0</strong>). Consulte o inventário completo em{' '}
                  <a
                    href={GITHUB_THIRD_PARTY_NOTICES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    THIRD_PARTY_NOTICES.md
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <a
            href="/docs"
            onClick={(e) => {
              if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onClose();
                onOpenFullDocs(modalType === 'docs' ? 'normas-abnt' : undefined);
              }
            }}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Abrir Central de Documentação (/docs) &rarr;
          </a>

          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
