import React, { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navigation from "../../shared/Navigation";
import { Toaster } from "sonner";
import ProfileCompletionModal from "../components/ProfileCompletionModal";
import networkService from "../services/network.service";

interface SearchResult {
    id: string;
    displayName: string;
    name: string;
    avatarUrl?: string;
    institution?: string;
    department?: string;
    country?: string;
}

const DashboardLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === "/home";

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    const performSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await networkService.searchResearchers({ query });
            setSearchResults((response.content || []).slice(0, 6));
            setShowDropdown(true);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchQuery.trim());
            }, 300);
        } else {
            setSearchResults([]);
            setShowDropdown(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, performSearch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleResultClick = (displayName: string) => {
        setShowDropdown(false);
        setSearchQuery("");
        navigate(`/u/${displayName}`);
    };

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && searchQuery.trim()) {
            setShowDropdown(false);
            navigate(`/network?query=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#faf9f7]">
            <ProfileCompletionModal />
            <aside className="sticky top-0 h-screen flex-shrink-0 z-30">
                <Navigation />
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                {isHome && (
                    <header className="bg-white border-b border-[#e8e4f0] px-8 py-4 flex items-center justify-center sticky top-0 z-20 h-[73px]">
                        {/* Centered Search Bar */}
                        <div ref={searchRef} className="w-full max-w-[600px] relative">
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9a92a8] text-[20px] group-focus-within:text-[#f5c84b] transition-colors">
                                    search
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchSubmit}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    placeholder="Search researchers, institutions..."
                                    className="w-full h-12 pl-12 pr-12 rounded-2xl bg-[#f7f5f2] border border-transparent focus:bg-white focus:border-[#f5c84b] focus:shadow-lg focus:shadow-[#f5c84b]/10 text-sm transition-all outline-none"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-[#e8e4f0] border-t-[#f5c84b] rounded-full animate-spin" />
                                    </div>
                                )}
                                {!isSearching && searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSearchResults([]);
                                            setShowDropdown(false);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9a92a8] hover:text-[#1f1b2a] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#e8e4f0] shadow-xl shadow-black/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="py-2">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleResultClick(result.displayName)}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#fffbeb] transition-colors text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-[#f3f0f7] flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-[#f5c84b] transition-colors">
                                                    {result.avatarUrl ? (
                                                        <img
                                                            src={result.avatarUrl}
                                                            alt={result.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[#8a8396]">person</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[#1f1b2a] truncate group-hover:text-[#f5c84b] transition-colors">
                                                        {result.name || result.displayName}
                                                    </p>
                                                    <p className="text-xs text-[#8a8396] truncate">
                                                        {[result.department, result.institution, result.country]
                                                            .filter(Boolean)
                                                            .join(" • ") || `@${result.displayName}`}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-[#d1d5db] text-[18px] group-hover:text-[#f5c84b] transition-colors">
                                                    arrow_forward
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-[#e8e4f0] px-4 py-3 bg-[#faf9f7]">
                                        <button
                                            onClick={() => {
                                                setShowDropdown(false);
                                                navigate(`/network?query=${encodeURIComponent(searchQuery.trim())}`);
                                            }}
                                            className="w-full text-center text-sm font-semibold text-[#f5c84b] hover:text-[#e8a820] transition-colors flex items-center justify-center gap-2"
                                        >
                                            View all results
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* No Results State */}
                            {showDropdown && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#e8e4f0] shadow-xl shadow-black/10 overflow-hidden z-50 p-6 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="w-12 h-12 rounded-full bg-[#f3f0f7] flex items-center justify-center mx-auto mb-3">
                                        <span className="material-symbols-outlined text-[#d1d5db] text-[24px]">search_off</span>
                                    </div>
                                    <p className="font-bold text-[#1f1b2a] mb-1">No researchers found</p>
                                    <p className="text-xs text-[#8a8396]">Try a different search term</p>
                                </div>
                            )}
                        </div>
                    </header>
                )}

                {/* Main Feed Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

        </div>
    );
};

export default DashboardLayout;
