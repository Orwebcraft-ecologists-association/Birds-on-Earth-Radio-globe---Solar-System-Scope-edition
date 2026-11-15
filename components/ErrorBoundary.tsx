import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    declare props: Readonly<ErrorBoundaryProps>;
    state: ErrorBoundaryState = { hasError: false, errorMessage: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred.' };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full bg-slate-950 text-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
                        <h2 className="text-xl font-black italic text-red-400">Application Error</h2>
                        <p className="text-xs text-slate-300 break-words font-mono bg-black/40 p-3 rounded-xl border border-white/10">
                            {this.state.errorMessage}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
