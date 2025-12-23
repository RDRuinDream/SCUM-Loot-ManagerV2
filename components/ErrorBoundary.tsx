
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useI18n } from '../i18n';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface InnerProps {
    children?: ReactNode;
    t: (key: string, params?: any[]) => string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundaryInner extends Component<InnerProps, State> {
    constructor(props: InnerProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in component:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-red-900/20 border border-red-500/20 rounded-xl m-2 animate-fade-in backdrop-blur-sm">
                    <div className="text-5xl mb-4 opacity-80 hover:scale-110 transition-transform cursor-default select-none">💥</div>
                    <h2 className="text-xl font-bold text-red-400 mb-2 tracking-wide">{this.props.t('error.title')}</h2>
                    <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">{this.props.t('error.desc')}</p>
                    
                    {this.state.error && (
                        <div className="text-[10px] font-mono bg-black/40 p-3 rounded-lg text-red-300/80 mb-6 max-w-md w-full overflow-auto whitespace-pre-wrap border border-red-500/10 shadow-inner max-h-32 custom-scrollbar text-left">
                            {this.state.error.message}
                        </div>
                    )}

                    <button 
                        onClick={this.handleRetry}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-400 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                    >
                        {this.props.t('error.retry')}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Wrapper to use hook in class component
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
    const { t } = useI18n();
    // Pass key to Inner to force remount if key changes -> handled by React when ErrorBoundary has a key
    return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
};
