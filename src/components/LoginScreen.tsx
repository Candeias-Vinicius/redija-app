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
  Sun,
  Moon,
  Lock,
  FileText,
} from 'lucide-react';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLogin: () => Promise<string | null>;
  onLoginDevMock: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface ShowcaseSlide {
  badge: string;
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
  darkMode,
  onToggleDarkMode,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fallback local se darkMode não for passado
  const [localDark, setLocalDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const isDark = darkMode !== undefined ? darkMode : localDark;

  const handleToggle = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = !localDark;
      setLocalDark(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('redija:darkMode', '1');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('redija:darkMode', '0');
      }
    }
  };

  // Conteúdo detalhado dos slides do carrossel
  const slides: ShowcaseSlide[] = [
    {
      badge: 'Normas ABNT Automáticas',
      title: 'Adeus às brigas com margens e sumários manuais',
      description:
        'O Redija cuida de 100% da diagramação normativa em tempo real: margens de 3-3-2-2 cm, citações longas com recuo de 4 cm e referências formatadas pela NBR 6023.',
      icon: <BookOpen className="w-6 h-6 text-emerald-500" />,
      highlights: [
        'Capa, folha de rosto e folha de aprovação automáticas',
        'Citações diretas curtas e longas com regras da NBR 10520',
        'Busca e preenchimento de referências com um clique por DOI',
      ],
    },
    {
      badge: 'Motor Tipográfico Typst WASM',
      title: 'Compilação instantânea do PDF direto no navegador',
      description:
        'Chega de esperar minutos ou decifrar erros crípticos do LaTeX. O Redija compila seu trabalho com o motor Typst em WebAssembly com visualização ao vivo lado a lado.',
      icon: <Zap className="w-6 h-6 text-teal-500" />,
      highlights: [
        'Renderização do PDF em milissegundos sem servidores externos',
        'Zoom de 50% a 200% e inspeção de código fonte em abas',
        'Qualidade de impressão de editora profissional',
      ],
    },
    {
      badge: 'Colaboração P2P em Tempo Real',
      title: 'Escreva simultaneamente com seu orientador ou grupo',
      description:
        'Conexão direta WebRTC entre navegadores: veja os avatares dos colegas online e acompanhe quem está editando cada parágrafo com cursores ao vivo.',
      icon: <Users className="w-6 h-6 text-blue-500" />,
      highlights: [
        'Comunicação direta ponto a ponto (P2P) sem intermediários',
        'Mesclagem inteligente com timestamps por bloco (Auto-Merge)',
        'Controle de leitura e edição integrado pelo Google Drive',
      ],
    },
    {
      badge: 'Total Liberdade de Formatos',
      title: 'Importe do Word ou Overleaf e exporte tudo em ZIP',
      description:
        'Traga documentos Word (.docx) com tabelas e imagens, importe projetos inteiros do Overleaf (.zip), ou exporte seu projeto Typst completo com referências BibTeX.',
      icon: <FolderSync className="w-6 h-6 text-amber-500" />,
      highlights: [
        'Conversão inteligente de .docx preservando seções e figuras',
        'Leitor automático de pacotes .zip do Redija ou LaTeX',
        'Exportação limpa do projeto com main.typ, abnt.typ e imagens',
      ],
    },
    {
      badge: 'Nuvem Pessoal & Privacidade',
      title: 'Seus dados protegidos no seu próprio Google Drive',
      description:
        'Arquitetura Local-First transparente: o documento fica salvo no cache local do seu computador para você escrever offline e sincroniza com a sua conta Google pessoal.',
      icon: <Cloud className="w-6 h-6 text-emerald-500" />,
      highlights: [
        'Zero custo com servidores de banco de dados proprietários',
        'Total conformidade com privacidade e posse total dos seus arquivos',
        'Modo Convidado para testar e produzir sem exigir login',
      ],
    },
  ];

  // Rotação automática dos slides a cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const activeSlide = slides[currentSlide];

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-[#080c14] text-slate-100 selection:bg-emerald-950 selection:text-emerald-200'
          : 'bg-slate-100 text-slate-800 selection:bg-emerald-200 selection:text-emerald-900'
      }`}
    >
      {/* Luzes de fundo sutis (Glow ambiente adaptativo) */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-emerald-500/10' : 'bg-emerald-200/50'
        }`}
      />
      <div
        className={`absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-cyan-500/10' : 'bg-teal-200/40'
        }`}
      />

      {/* Botão de alternar tema no canto superior direito */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleToggle}
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xs transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'border-slate-300 bg-white/90 text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
          title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Conteúdo Principal Split-Screen */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div
          className={`w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border shadow-2xl overflow-hidden min-h-[640px] transition-colors ${
            isDark
              ? 'bg-slate-900/90 border-slate-800/90 shadow-black/70'
              : 'bg-white border-slate-200/90 shadow-slate-300/60'
          }`}
        >
          {/* ============================================================ */}
          {/* LADO ESQUERDO: SHOWCASE DA PLATAFORMA & CARROSSEL DE RECURSOS */}
          {/* ============================================================ */}
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className={`lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden transition-colors border-b lg:border-b-0 lg:border-r ${
              isDark
                ? 'bg-gradient-to-br from-[#0c1322] via-[#09101d] to-[#041913] text-white border-slate-800/80'
                : 'bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/50 text-slate-900 border-slate-200/80'
            }`}
          >
            {/* Efeito decorativo sutil no fundo */}
            <div
              className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
                isDark ? 'bg-emerald-500/10' : 'bg-emerald-300/20'
              }`}
            />
            <div
              className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
                isDark ? 'bg-cyan-500/10' : 'bg-teal-300/20'
              }`}
            />

            {/* Cabeçalho de Marca Único: Logotipo Oficial RedijaApp */}
            <div className="relative z-10 flex items-center justify-between">
              <Logo size="lg" variant={isDark ? 'dark' : 'light'} />
            </div>

            {/* Conteúdo Dinâmico do Slide do Carrossel */}
            <div className="relative z-10 my-8 space-y-6">
              {/* Badge do Slide */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-md border ${
                  isDark
                    ? 'bg-white/10 border-white/15 text-emerald-300'
                    : 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isDark ? 'bg-emerald-400' : 'bg-emerald-600'
                  }`}
                />
                <span>{activeSlide.badge}</span>
              </div>

              {/* Título e Descrição */}
              <div className="space-y-3">
                <h2
                  className={`text-2xl md:text-3xl font-extrabold tracking-tight leading-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {activeSlide.title}
                </h2>
                <p
                  className={`text-sm md:text-base leading-relaxed max-w-xl ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {activeSlide.description}
                </p>
              </div>

              {/* Lista de Destaques Rápidos com Ícones */}
              <div className="space-y-2 pt-2">
                {activeSlide.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 text-xs md:text-sm ${
                      isDark ? 'text-slate-200' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isDark ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controles de Navegação do Carrossel */}
            <div
              className={`relative z-10 pt-4 border-t flex items-center justify-between ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              {/* Indicadores de bolinha (Dots) */}
              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === idx
                        ? isDark
                          ? 'w-8 bg-emerald-400'
                          : 'w-8 bg-emerald-600'
                        : isDark
                          ? 'w-2 bg-slate-700 hover:bg-slate-600'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
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
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                      : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                  }`}
                  title="Slide anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                      : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                  }`}
                  title="Próximo slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* LADO DIREITO: CARD DE AUTENTICAÇÃO LIMPO                     */}
          {/* ============================================================ */}
          <div
            className={`lg:col-span-5 p-8 md:p-10 flex flex-col justify-between transition-colors ${
              isDark ? 'bg-slate-900/95 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {/* Topo do Card de Login */}
            <div className="space-y-5">
              <div className="space-y-2">
                <h1
                  className={`text-2xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Entre no seu espaço
                </h1>
                <p
                  className={`text-xs md:text-sm leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Conecte sua conta para carregar seus trabalhos sincronizados com segurança no Google Drive.
                </p>
              </div>

              {/* Mensagem de Erro, se houver */}
              {error && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    isDark
                      ? 'bg-red-950/60 border-red-800 text-red-300'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <p
                    className={`font-semibold flex items-center gap-1.5 ${
                      isDark ? 'text-red-200' : 'text-red-800'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Erro de Autenticação</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">{error}</p>
                </div>
              )}

              {/* Alerta se Client ID não configurado no .env */}
              {!isConfigured && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    isDark
                      ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <p
                    className={`font-semibold flex items-center gap-1.5 ${
                      isDark ? 'text-amber-100' : 'text-amber-900'
                    }`}
                  >
                    <HelpCircle
                      className={`w-4 h-4 shrink-0 ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      }`}
                    />
                    <span>Modo de Desenvolvimento</span>
                  </p>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
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
                className={`w-full py-3.5 px-4 rounded-xl border font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-3 relative group ${
                  isDark
                    ? 'border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750 text-white'
                    : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      className={`w-4 h-4 animate-spin ${
                        isDark ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    />
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
              <div className="text-center pt-1">
                <button
                  onClick={onContinueAsGuest}
                  className={`text-xs transition-colors font-medium ${
                    isDark
                      ? 'text-slate-400 hover:text-emerald-400'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  Prefere testar sem conta agora?{' '}
                  <span className="underline font-semibold">Continuar como Convidado</span>
                </button>
              </div>

              {/* ============================================================ */}
              {/* AS 3 PÍLULAS INFORMATIVAS RESTAURADAS (EMBAIXO DO GOOGLE)   */}
              {/* ============================================================ */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-850/80 text-slate-300'
                      : 'border-slate-200/90 bg-slate-50 text-slate-700'
                  }`}
                >
                  <Lock
                    className={`w-3.5 h-3.5 mx-auto mb-1 ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  />
                  <p
                    className={`font-semibold text-xs ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Drive Próprio
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 leading-snug ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Seus arquivos sob seu controle
                  </p>
                </div>

                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-850/80 text-slate-300'
                      : 'border-slate-200/90 bg-slate-50 text-slate-700'
                  }`}
                >
                  <Users
                    className={`w-3.5 h-3.5 mx-auto mb-1 ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  />
                  <p
                    className={`font-semibold text-xs ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Colaboração
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 leading-snug ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Compartilhe com orientadores
                  </p>
                </div>

                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-850/80 text-slate-300'
                      : 'border-slate-200/90 bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText
                    className={`w-3.5 h-3.5 mx-auto mb-1 ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  />
                  <p
                    className={`font-semibold text-xs ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    100% ABNT
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 leading-snug ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    PDF oficial e automático
                  </p>
                </div>
              </div>
            </div>

            {/* Garantias de Segurança e Privacidade no Rodapé do Card */}
            <div
              className={`pt-5 border-t space-y-2 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <ShieldCheck
                  className={`w-4 h-4 shrink-0 ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                />
                <span className="font-medium">100% Gratuito: sem planos ou assinaturas</span>
              </div>
              <div
                className={`flex items-center gap-2 text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <Cloud
                  className={`w-4 h-4 shrink-0 ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                />
                <span className="font-medium">Arquivos salvos no seu próprio Google Drive</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé da Página */}
      <footer
        className={`relative z-10 py-4 px-6 text-center text-xs transition-colors ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        <p>RedijaApp: Editor Acadêmico Normatizado com Motor Typst WASM • Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};
