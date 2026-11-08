import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Instabilidade temporária neste módulo';
      const message =
        this.props.fallbackMessage ||
        'Ocorreu uma falha inesperada ao renderizar este componente. Os dados do seu trabalho acadêmico continuam preservados e salvos com segurança.';

      return (
        <div className="flex flex-col items-center justify-center p-6 m-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-center text-slate-900 dark:text-white mb-1">
            {title}
          </h3>

          <p className="text-xs text-center text-slate-600 dark:text-slate-300 max-w-md leading-relaxed mb-3">
            {message}
          </p>

          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mb-4 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Seu documento permanece intacto na memória local</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>

            <button
              type="button"
              onClick={this.toggleDetails}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {this.state.showDetails ? (
                <>
                  <span>Ocultar Detalhes Técnicos</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Ver Detalhes Técnicos</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {this.state.showDetails && this.state.error && (
            <div className="mt-4 w-full max-w-lg p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto text-left font-mono">
              <p className="font-bold text-red-600 dark:text-red-400 mb-1">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="whitespace-pre-wrap text-[10px] text-slate-500 leading-tight">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
