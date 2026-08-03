import React, { useState } from "react";

type LandingPageProps = {
    onLogin: () => void;
    onSignup: () => void;
    onBrowse: (query?: string) => void;
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup, onBrowse }) => {
    const [searchQuery, setSearchQuery] = useState("");

    const trendingTopics = ["Machine Learning", "Climate Policy", "Bio-Informatics"];

    return (
        <div className="min-h-screen bg-[#f5f5f5] font-sans antialiased text-[#1a1a1a]">
            {/* Header / Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="References Logo" className="h-8" />
                        <span className="text-xl font-bold text-[#1a1a1a]">References</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onBrowse()}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Browse
                        </button>
                        <button
                            onClick={onSignup}
                            className="px-6 py-2 bg-[#f5c84b] text-[#1a1a1a] text-sm font-semibold rounded-lg hover:bg-[#f4b82a] transition-colors"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
                        Find the world's <br />
                        <span className="text-[#f5c84b]">researchers.</span>
                    </h1>
                    <p className="text-lg text-gray-600 mb-10">
                        Connect with scientists, faculties, and experts in one minimal interface.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={(e) => { e.preventDefault(); onBrowse(searchQuery); }} className="relative max-w-2xl mx-auto mb-8">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, institution, or interest..."
                            className="w-full pl-12 pr-16 py-4 bg-white border border-gray-200 rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/50 focus:border-[#f5c84b] transition-all"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#f5c84b] rounded-md flex items-center justify-center hover:bg-[#f4b82a] transition-colors">
                            <span className="material-symbols-outlined text-[#1a1a1a]">arrow_forward</span>
                        </button>
                    </form>

                    {/* Trending Topics */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Trending:
                        </span>
                        {trendingTopics.map((topic, i) => (
                            <button
                                key={i}
                                onClick={() => onBrowse(topic)}
                                className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold text-[#f5c84b] uppercase tracking-wider mb-3">
                            CORE FEATURES
                        </p>
                        <h2 className="text-3xl font-bold text-[#1a1a1a]">
                            Designed for the modern researcher
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Academic Users */}
                        <div className="p-8 bg-[#f5f5f5] rounded-2xl hover:bg-gray-100 transition-colors group">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-2xl text-[#1a1a1a]">school</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">Academic Users</h3>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                Track your h-index, manage institutional affiliations, and automate citation formatting for any journal.
                            </p>
                            <button className="text-[#f5c84b] text-sm font-semibold hover:underline flex items-center gap-1">
                                Learn about affiliations
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        </div>

                        {/* General Discovery */}
                        <div className="p-8 bg-[#f5f5f5] rounded-2xl hover:bg-gray-100 transition-colors group relative">
                            <div className="absolute top-4 right-4">
                                <span className="px-2 py-1 bg-[#f5c84b] text-[#1a1a1a] text-xs font-bold rounded">
                                    New
                                </span>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-2xl text-[#1a1a1a]">description</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">General Discovery</h3>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                Access millions of open-source PDFs. Create personal reading lists and discover similar works effortlessly.
                            </p>
                            <button className="text-[#f5c84b] text-sm font-semibold hover:underline flex items-center gap-1">
                                Start discovery
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        </div>

                        {/* Topic Alerts */}
                        <div className="p-8 bg-[#f5f5f5] rounded-2xl hover:bg-gray-100 transition-colors group">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-2xl text-[#1a1a1a]">notifications</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">Topic Alerts</h3>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                Follow specific fields or authors. Get notified the second a new paper is published in your area of interest.
                            </p>
                            <button className="text-[#f5c84b] text-sm font-semibold hover:underline flex items-center gap-1">
                                Set up alerts
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center gap-8 mb-4">
                        <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            ABOUT
                        </a>
                        <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            API DOCS
                        </a>
                        <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            TERMS
                        </a>
                        <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            PRIVACY
                        </a>
                    </div>
                    <p className="text-center text-xs text-gray-500">
                        © 2024 References Scholarly Search. All knowledge is connected.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
