
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch runtime errors in the UI tree.
 */
// Fix: Use the imported Component directly to resolve inheritance issues in some TypeScript configurations
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  // Update state so the next render will show the fallback UI.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  // Capture information about the error and update the component state.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔥 CRITICAL UI ERROR CAUGHT:", error, errorInfo);
    // Explicitly using this.setState inherited from Component
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  // Reset the error state to attempt recovery.
  private handleReset = () => {
    // Explicitly using this.setState inherited from Component
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans text-gray-300">
          <div className="max-w-2xl w-full bg-[#121212] border border-red-900/50 rounded-xl shadow-[0_0_50_px_rgba(220,38,38,0.1)] overflow-hidden animate-fade-in">
            
            {/* Header de Erro */}
            <div className="bg-red-900/20 border-b border-red-900/30 p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center border border-red-500/30">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-400 uppercase tracking-widest">Falha Crítica de Sistema</h2>
                <p className="text-red-300/70 text-xs font-mono">Runtime Exception Detected</p>
              </div>
            </div>

            {/* Corpo do Erro */}
            <div className="p-8 space-y-6">
              <p className="text-gray-400 leading-relaxed">
                O sistema encontrou um erro irrecuperável na interface. Isso geralmente ocorre devido a dados corrompidos, falha de rede intermitente ou incompatibilidade de versão.
              </p>

              <div className="bg-black/50 p-4 rounded border border-gray-800 overflow-x-auto">
                <p className="text-red-400 font-mono text-xs font-bold mb-2">STACK TRACE:</p>
                <code className="text-[10px] text-gray-500 font-mono block whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </code>
                {this.state.errorInfo && (
                   <code className="text-[10px] text-gray-600 font-mono block whitespace-pre-wrap mt-2">
                     {this.state.errorInfo.componentStack}
                   </code>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded transition shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                  Reiniciar Sistema
                </button>
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 border border-gray-700 hover:bg-gray-800 text-gray-400 font-bold uppercase tracking-wider text-xs rounded transition"
                >
                  Tentar Recuperar Componente
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-black p-4 text-center border-t border-gray-800">
               <p className="text-[10px] text-gray-600 font-mono">
                 SYSTEM_ID: {typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID().split('-')[0] : 'UNK'} • MarcenariaAI PRO
               </p>
            </div>
          </div>
        </div>
      );
    }

    // Accessing children from props inherited from Component
    return this.props.children;
  }
}
