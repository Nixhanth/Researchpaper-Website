import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] p-4 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">error</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[#1f1b2a] mb-2">Something went wrong</h1>
                        <p className="text-[#6e6189] mb-6">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-xl hover:bg-[#f4b82a] transition-colors shadow-sm w-full"
                        >
                            Reload Page
                        </button>
                        {this.state.error && (
                            <details className="mt-6 text-left p-3 bg-gray-50 rounded text-xs text-gray-500 overflow-auto max-h-32">
                                <summary className="cursor-pointer font-medium mb-1">Error Details</summary>
                                {this.state.error.toString()}
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
