import React from "react";
import { Outlet, Link } from "react-router-dom";

const AuthLayout: React.FC = () => {
    return (
        <div className="bg-background-light font-display min-h-screen flex flex-col text-[#131118] antialiased overflow-x-hidden">
            {/* Header */}
            <header className="w-full border-b border-[#eee9f4] bg-white/90 backdrop-blur px-6 py-4 flex items-center justify-center relative z-10">
                <Link to="/" className="absolute left-6 top-1/2 -translate-y-1/2">
                    <button className="flex items-center gap-2 text-[#6e6189] hover:text-[#3c2e59] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg p-1">
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span className="text-sm font-medium hidden sm:block">Back to Home</span>
                    </button>
                </Link>

                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="References Logo" className="h-8" />
                    <h1 className="text-lg font-bold tracking-tight">References</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-10">
                <Outlet />
            </main>
        </div>
    );
};

export default AuthLayout;
