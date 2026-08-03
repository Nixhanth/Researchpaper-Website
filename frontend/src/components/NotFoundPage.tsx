import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-4xl">
                😕
            </div>
            <h1 className="text-4xl font-bold text-[#1f1b2a] mb-2">Page Not Found</h1>
            <p className="text-[#6e6189] max-w-md mb-8">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-xl hover:bg-[#f4b82a] transition-colors shadow-sm"
            >
                Go Home
            </Link>
        </div>
    );
};

export default NotFoundPage;
