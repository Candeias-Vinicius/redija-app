import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Cpu,
  HardDrive,
  FileCheck2,
  Sparkles,
  BookOpenCheck,
  ShieldCheck,
  Globe,
  FileCode2,
  Presentation,
  Compass,
} from 'lucide-react';
import type { ContextualGuideMode } from '@/core/templates/templateCapabilities';
import {
  ABNT_STANDARDS_DOCS,
  GENERAL_GUIDELINES_DOCS,
  IEEE_GUIDELINES_DOCS,
  POSTER_GUIDELINES_DOCS,
  SBC_GUIDELINES_DOCS,
  type StandardDocSection,
} from '@/core/docs/documentationCatalog';

export type WelcomeModalTab = 'overview' | ContextualGuideMode;

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: WelcomeModalTab;
  onOpenFullDocs?: () => void;
}

const WelcomeModalContent: React.FC<{
  onClose: () => void;
  initialTab: WelcomeModalTab;
  onOpenFullDocs?: () => void;
}> = ({ onClose, initialTab, onOpenFullDocs }) => {
  const [activeTab, setActiveTab] = useState<WelcomeModalTab>(initialTab);

  const renderDocsList = (intro: string, items: StandardDocSection[]) => (
    <div className="space-y-3">
      <p className="text-xs text-neutral-600 leading-relaxed">{intro}</p>
      <div className="space-y-3">
        {items.map((std) => (
          <div
            key={std.code}
            className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {std.code}
              </span>
              <span className="font-semibold text-neutral-900 text-xs flex-1">
                {std.title}
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">{std.summary}</p>
            <ul className="space-y-1 pl-4 list-disc text-[11px] text-neutral-500">
              {std.rulesApplied.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo com destaque */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-extrabold text-xl shadow-md">
              R
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest bg-emerald-500/40 px-2 py-0.5 rounded">
                RedijaApp • Multi-Normas & Padrões Científicos
              </span>
              <h2 className="text-lg font-bold mt-0.5">
                Guia Rápido e Documentação de Modelos
              </h2>
            </div>
          </div>

          <p className="text-xs text-emerald-50 leading-relaxed">
            O RedijaApp combina um editor visual de blocos com o compilador científico{' '}
            <strong>Typst</strong> rodando no seu navegador, adaptando estrutura, citações e
            diagramação para ABNT, SBC, IEEE, APA 7ª, Pôsteres e pacotes do Typst Universe.
          </p>
        </div>

        {/* Abas de navegação contextuais */}
        <div className="px-6 pt-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Como Funciona
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abnt')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'abnt'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ABNT</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ieee')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'ieee'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>IEEE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sbc')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'sbc'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SBC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('poster')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'poster'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Presentation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pôster A0</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>APA & Boas Práticas</span>
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-neutral-600">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span>PDF Real no Navegador</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    A prévia à direita não é uma simulação: é o próprio PDF compilado em
                    milissegundos pelo motor Typst WASM.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                    <span>Multi-Templates Acadêmicos</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Suporte nativo a ABNT (TCC, Artigo, Relatório), SBC, IEEE Conference, APA 7ª,
                    Pôsteres A0/A1 e pacotes do Typst Universe.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Comandos `/` e Citações `@`</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Digite <kbd className="px-1 py-0.5 bg-white border rounded font-mono">/</kbd>{' '}
                    para inserir figuras, tabelas, quadros e citações, ou{' '}
                    <kbd className="px-1 py-0.5 bg-white border rounded font-mono">@</kbd> para
                    chamar uma referência no formato ativo.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>Salvo no Navegador e Backup</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Seus trabalhos ficam salvos localmente no navegador (com lixeira de 30 dias),
                    podem sincronizar com o Google Drive ou ser exportados em <code className="font-mono">.redija</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    Consulte a documentação completa das normas ABNT, SBC, IEEE e Pôsteres nas abas acima.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('abnt')}
                  className="px-2.5 py-1 rounded bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px] hover:bg-emerald-100 shrink-0"
                >
                  Ver Normas ABNT
                </button>
              </div>
            </div>
          )}

          {activeTab === 'abnt' &&
            renderDocsList(
              'Abaixo estão as normas técnicas brasileiras implementadas automaticamente quando o projeto utiliza um modelo da família ABNT:',
              ABNT_STANDARDS_DOCS,
            )}

          {activeTab === 'ieee' &&
            renderDocsList(
              'Diretrizes aplicadas para submissão de artigos no formato internacional IEEE Conference:',
              IEEE_GUIDELINES_DOCS,
            )}

          {activeTab === 'sbc' &&
            renderDocsList(
              'Especificações oficiais para artigos submetidos a eventos e periódicos da Sociedade Brasileira de Computação:',
              SBC_GUIDELINES_DOCS,
            )}

          {activeTab === 'poster' &&
            renderDocsList(
              'Boas práticas visuais para diagramação de Pôsteres e Banners Científicos em congressos:',
              POSTER_GUIDELINES_DOCS,
            )}

          {activeTab === 'general' &&
            renderDocsList(
              'Orientações gerais para formatos internacionais (APA 7ª Ed.), personalização avançada e pacotes comunitários:',
              GENERAL_GUIDELINES_DOCS,
            )}
        </div>

        {/* Rodapé */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <a
            href="/docs"
            onClick={(e) => {
              if (onOpenFullDocs) {
                e.preventDefault();
                onClose();
                onOpenFullDocs();
              }
            }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline text-center sm:text-left"
          >
            Abrir Documentação Completa (/docs) &rarr;
          </a>

          <button
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors w-full sm:w-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
  onOpenFullDocs,
}) => {
  if (!isOpen) return null;
  return (
    <WelcomeModalContent
      onClose={onClose}
      initialTab={initialTab}
      onOpenFullDocs={onOpenFullDocs}
    />
  );
};
