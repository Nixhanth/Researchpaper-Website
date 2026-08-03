import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import profileService from "../services/profile.service";
import { toast } from "sonner";

type BrowsePageProps = {
    onBack: () => void;
    onLogin: () => void;
};

const BrowsePage: React.FC<BrowsePageProps> = ({ onBack, onLogin }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [researchers, setResearchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const categories = ["All", "Computer Science", "Biology", "Physics", "Medicine", "Economics", "History"];

    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 400); // 400ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchResearchers = async (isNewSearch = false, currentQuery = searchQuery) => {
        setLoading(true);
        try {
            const currentPage = isNewSearch ? 0 : page;
            const params: any = {
                query: currentQuery,
                page: currentPage,
                size: 12
            };

            if (activeCategory !== "All") {
                params.domain = activeCategory;
            }

            const response = await profileService.publicSearch(params);

            if (isNewSearch) {
                setResearchers(response.content);
                setPage(1);
            } else {
                setResearchers(prev => [...prev, ...response.content]);
                setPage(prev => prev + 1);
            }

            setHasMore(!response.last);
        } catch (error) {
            console.error("Failed to fetch researchers:", error);
            toast.error("Failed to load researchers. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Update URL and fetch when debounced query changes
        const params: any = {};
        if (debouncedQuery) params.q = debouncedQuery;
        setSearchParams(params, { replace: true });

        fetchResearchers(true, debouncedQuery);
    }, [debouncedQuery, activeCategory]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchResearchers(true, searchQuery);
    };

    const handleViewProfile = () => {
        toast.info("Please sign in or create an account to view full profiles and join the community!", {
            action: {
                label: "Sign In",
                onClick: onLogin
            },
            duration: 5000
        });
    };

    return (
        <div className="min-h-screen bg-[#f8f7f4] font-sans text-[#1a1a1a] pb-20">
            {/* Header */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={onBack}>
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1a1a1a] transition-colors">arrow_back</span>
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="References Logo" className="h-7" />
                            <span className="text-lg font-bold text-[#1a1a1a]">References</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onLogin}
                            className="text-sm font-bold text-[#f5c84b] hover:text-[#e5b73b] transition-colors"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 pt-10">

                {/* Hero / Search Section */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h1 className="text-4xl font-black mb-4 tracking-tight text-[#1a1a1a]">
                        Find World-Class <span className="text-[#f5c84b]">Researchers</span>
                    </h1>
                    <p className="text-gray-500 mb-8 text-lg">
                        Connect with scientists, faculties, and experts across every discipline.
                    </p>

                    {/* Premium Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative shadow-lg rounded-2xl">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, institution, or research interest..."
                            className="w-full pl-14 pr-32 py-5 bg-white rounded-2xl text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c84b] transition-all"
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#f5c84b] hover:bg-[#ebbd3f] text-[#1a1a1a] px-6 py-2.5 rounded-xl transition-colors font-bold h-[80%]"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Categories / Filters */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === cat
                                ? "bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-md"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Researchers Grid */}
                {loading && researchers.length === 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                                <div className="flex gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                                <div className="h-20 bg-gray-50 rounded-lg mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                ) : researchers.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {researchers.map((person) => (
                            <div
                                key={person.id}
                                onClick={handleViewProfile}
                                className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer duration-300 flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-3">
                                        {person.avatarUrl ? (
                                            <img src={person.avatarUrl} alt={person.name} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-[#f8f7f4] flex items-center justify-center border border-gray-100">
                                                <span className="material-symbols-outlined text-[#8a8396] text-2xl">person</span>
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-bold leading-tight group-hover:text-[#f5c84b] transition-colors">
                                                {person.name || person.displayName}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {person.title || person.role}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {person.interests?.slice(0, 3).map((interest: string) => (
                                        <span key={interest} className="bg-[#fffbeb] text-[#d97706] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            {interest}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2 italic">
                                    {person.bio || "No bio provided yet."}
                                </p>

                                <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <span className="material-symbols-outlined text-[18px]">school</span>
                                        <span className="text-xs font-bold">{person.institution || "Independent Researcher"}</span>
                                    </div>
                                    <button className="text-[#1a1a1a] hover:text-[#f5c84b] font-bold text-sm flex items-center gap-1 transition-colors">
                                        View Profile
                                        <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">search_off</span>
                        <h3 className="text-xl font-bold text-gray-400">No researchers found</h3>
                        <p className="text-gray-400 mt-2">Try adjusting your search or category filters.</p>
                    </div>
                )}

                {/* Load More */}
                {hasMore && researchers.length > 0 && (
                    <div className="mt-16 text-center">
                        <button
                            onClick={() => fetchResearchers()}
                            disabled={loading}
                            className="px-8 py-3 bg-white border border-gray-200 text-[#1a1a1a] font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                        >
                            {loading ? "Loading..." : "Load more experts"}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default BrowsePage;
