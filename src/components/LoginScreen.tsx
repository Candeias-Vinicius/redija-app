import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Zap,
  Users,
  FolderSync,
  Cloud,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Loader2,
  FileCheck2,
} from 'lucide-react';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLogin: () => Promise<string | null>;
  onLoginDevMock: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
}

interface ShowcaseSlide {
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights: string[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onLoginDevMock,
  onContinueAsGuest,
  isLoading,
  error,
  isConfigured,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Conteúdo detalhado dos slides do carrossel (baseado no README do RedijaApp)
  const slides: ShowcaseSlide[] = [
    {
      badge: 'Normas ABNT Automáticas',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      title: 'Adeus às brigas com margens e sumários manuais',
      description:
        'O Redija cuida de 100% da diagramação normativa em tempo real: margens de 3-3-2-2 cm, citações longas com recuo de 4 cm e referências formatadas pela NBR 6023.',
      icon: <BookOpen className="w-8 h-8 text-emerald-600" />,
      highlights: [
        'Capa, folha de rosto e folha de aprovação automáticas',
        'Citações diretas curtas e longas com regras da NBR 10520',
        'Busca e preenchimento de referências com um clique por DOI',
      ],
    },
    {
      badge: 'Motor Tipográfico Typst WASM',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      title: 'Compilação instantânea do PDF direto no navegador',
      description:
        'Chega de esperar minutos ou decifrar erros crípticos do LaTeX. O Redija compila seu trabalho com o motor Typst em WebAssembly com visualização ao vivo lado a lado.',
      icon: <Zap className="w-8 h-8 text-teal-600" />,
      highlights: [
        'Renderização do PDF em milissegundos sem servidores externos',
        'Zoom de 50% a 200% e inspeção de código fonte em abas',
        'Qualidade de impressão de editora profissional',
      ],
    },
    {
      badge: 'Colaboração P2P em Tempo Real',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      title: 'Escreva simultaneamente com seu orientador ou grupo',
      description:
        'Conexão direta WebRTC entre navegadores: veja os avatares dos colegas online e acompanhe quem está editando cada parágrafo com cursores ao vivo.',
      icon: <Users className="w-8 h-8 text-blue-600" />,
      highlights: [
        'Comunicação direta ponto a ponto (P2P) sem intermediários',
        'Mesclagem inteligente com timestamps por bloco (Auto-Merge)',
        'Controle de leitura e edição integrado pelo Google Drive',
      ],
    },
    {
      badge: 'Total Liberdade de Formatos',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      title: 'Importe do Word ou Overleaf e exporte tudo em ZIP',
      description:
        'Traga documentos Word (.docx) com tabelas e imagens, importe projetos inteiros do Overleaf (.zip), ou exporte seu projeto Typst completo com referências BibTeX.',
      icon: <FolderSync className="w-8 h-8 text-amber-600" />,
      highlights: [
        'Conversão inteligente de .docx preservando seções e figuras',
        'Leitor automático de pacotes .zip do Redija ou LaTeX',
        'Exportação limpa do projeto com main.typ, abnt.typ e imagens',
      ],
    },
    {
      badge: 'Nuvem Pessoal & Privacidade',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      title: 'Seus dados protegidos no seu próprio Google Drive',
      description:
        'Arquitetura Local-First transparente: o documento fica salvo no cache local do seu computador para você escrever offline e sincroniza com a sua conta Google pessoal.',
      icon: <Cloud className="w-8 h-8 text-emerald-600" />,
      highlights: [
        'Zero custo com servidores de banco de dados proprietários',
        'Total conformidade com privacidade e posse total dos seus arquivos',
        'Modo Convidado para testar e produzir sem exigir login',
      ],
    },
  ];

  // Rotação automática suave dos slides a cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const activeSlide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900 relative overflow-hidden">
      {/* Luzes de fundo sutis (Glow ambiente claro) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Conteúdo Principal Split-Screen */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-200/60 overflow-hidden min-h-[640px]">
          {/* ============================================================ */}
          {/* LADO ESQUERDO: SHOWCASE DA PLATAFORMA & CARROSSEL DE RECURSOS */}
          {/* ============================================================ */}
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Efeito decorativo sutil no fundo escuro */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho de Marca Único (Aqui vive o Logo principal) */}
            <div className="relative z-10 flex items-center justify-between">
              <Logo size="md" variant="white" />
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Normas ABNT 14724 & 6023</span>
              </span>
            </div>

            {/* Conteúdo Dinâmico do Slide do Carrossel */}
            <div className="relative z-10 my-8 space-y-6">
              {/* Badge do Slide */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeSlide.badge}</span>
              </div>

              {/* Título e Descrição */}
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {activeSlide.title}
                </h2>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
                  {activeSlide.description}
                </p>
              </div>

              {/* Lista de Destaques Rápidos com Ícones */}
              <div className="space-y-2 pt-2">
                {activeSlide.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controles de Navegação do Carrossel */}
            <div className="relative z-10 pt-4 border-t border-slate-700/60 flex items-center justify-between">
              {/* Indicadores de bolinha (Dots) */}
              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === idx
                        ? 'w-8 bg-emerald-400'
                        : 'w-2 bg-slate-600 hover:bg-slate-500'
                    }`}
                    title={`Ir para slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Botões de Avançar e Voltar */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
                  }
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  title="Slide anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  title="Próximo slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* LADO DIREITO: CARD DE AUTENTICAÇÃO LIMPO (SEM REPETIR O LOGO) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 bg-white p-8 md:p-12 flex flex-col justify-between">
            {/* Topo do Card de Login */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acesso Acadêmico</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Entre no seu espaço
                </h1>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                  Conecte sua conta para carregar seus trabalhos sincronizados com segurança no Google Drive.
                </p>
              </div>

              {/* Mensagem de Erro, se houver */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Erro de Autenticação</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">{error}</p>
                </div>
              )}

              {/* Alerta se Client ID não configurado no .env */}
              {!isConfigured && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                    <HelpCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Modo de Desenvolvimento</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Para testes rápidos locais sem credencial Google Cloud:
                  </p>
                  <button
                    onClick={onLoginDevMock}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Entrar como Usuário Demonstração</span>
                  </button>
                </div>
              )}

              {/* Botão Oficial "Continuar com o Google" */}
              <button
                onClick={() => onLogin()}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-3 relative group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Conectando com o Google...</span>
                  </>
                ) : (
                  <>
                    {/* Ícone oficial colorido do Google */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    <span>Continuar com o Google</span>
                  </>
                )}
              </button>

              {/* Botão de Modo Convidado */}
              <div className="pt-2 text-center">
                <button
                  onClick={onContinueAsGuest}
                  className="text-xs text-slate-500 hover:text-emerald-700 transition-colors font-medium"
                >
                  Prefere testar sem conta agora?{' '}
                  <span className="underline font-semibold">Continuar como Convidado</span>
                </button>
              </div>
            </div>

            {/* Garantias de Segurança e Privacidade no Rodapé do Card */}
            <div className="pt-6 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">100% Gratuito: sem planos ou assinaturas</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Arquivos salvos no seu próprio Google Drive</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé da Página */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs text-slate-400">
        <p>RedijaApp: Editor Acadêmico Normatizado com Motor Typst WASM • Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};
