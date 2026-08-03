import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext";
import networkService from "../../src/services/network.service";
import profileService, { Profile } from "../../src/services/profile.service";
import followService, { UserSummary } from "../../src/services/follow.service";
import PageTitle from "../../src/components/PageTitle";
import FollowButton from "../../src/components/FollowButton";
import clsx from "clsx";

interface Researcher {
    id: string;
    name: string;
    title: string;
    avatar: string;
    institution: string;
    expertise: string[];
    isOnline?: boolean;
    isFollowing: boolean;
}

const NetworkPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"discover" | "following" | "followers">("discover");
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedInstitution, setSelectedInstitution] = useState("");
    const [selectedCountry, setSelectedCountry] = useState("");

    // Data states
    const [data, setData] = useState<UserSummary[]>([]);
    const [relationshipMap, setRelationshipMap] = useState<Record<string, string>>({});
    const [stats, setStats] = useState({ following: 0, followers: 0 });

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [targetFollower, setTargetFollower] = useState<UserSummary | null>(null);
    const [removingFollower, setRemovingFollower] = useState(false);

    const confirmRemoveFollower = (follower: UserSummary) => {
        setTargetFollower(follower);
        setShowRemoveModal(true);
    };

    const handleRemoveFollower = async () => {
        if (!targetFollower || !user) return;
        setRemovingFollower(true);
        try {
            await followService.removeFollower(targetFollower.id);
            // Refresh data
            setData(prev => prev.filter(u => u.id !== targetFollower.id));
            setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            setShowRemoveModal(false);
            setTargetFollower(null);
        } catch (error) {
            console.error("Failed to remove follower", error);
        } finally {
            setRemovingFollower(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchInitialData();
    }, [activeTab, debouncedSearchQuery, selectedDomains, selectedDepartment, selectedInstitution, selectedCountry]);

    const fetchInitialData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Stats
            const followStats = await followService.getStats(user.id);
            setStats({ followers: followStats.followersCount, following: followStats.followingCount });

            // 2. Fetch Relationships (Follows + Requests + Followers)
            const [following, sentRequests, followers] = await Promise.all([
                followService.getFollowing(user.id),
                followService.getSentRequests(user.id),
                followService.getFollowers(user.id)
            ]);

            const newMap: Record<string, string> = {};
            following.forEach(u => newMap[u.id] = "FOLLOWING");
            sentRequests.forEach(u => newMap[u.id] = "REQUESTED");
            // Highlight those who follow us but we haven't followed back
            followers.forEach(u => {
                if (!newMap[u.id]) {
                    newMap[u.id] = "FOLLOW_BACK";
                }
            });
            setRelationshipMap(newMap);

            // 3. Fetch Tab Data
            let result: UserSummary[] = [];
            if (activeTab === "discover") {
                const response = await networkService.searchResearchers({
                    query: debouncedSearchQuery,
                    department: selectedDepartment || undefined,
                    institution: selectedInstitution || undefined,
                    domain: selectedDomains.length > 0 ? selectedDomains[0] : undefined,
                    country: selectedCountry || undefined
                });
                result = response.content;
            } else if (activeTab === "following") {
                result = following;
                if (debouncedSearchQuery) {
                    result = result.filter(u =>
                        u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        u.displayName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                    );
                }
            } else if (activeTab === "followers") {
                result = await followService.getFollowers(user.id);
                if (debouncedSearchQuery) {
                    result = result.filter(u =>
                        u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        u.displayName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                    );
                }
            }
            if (user) {
                result = result.filter(u => u.id !== user.id);
            }
            setData(result);
        } catch (error) {
            console.error("Failed to fetch network data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (targetUserId: string, newStatus: string) => {
        setRelationshipMap(prev => ({ ...prev, [targetUserId]: newStatus }));
        // Could update stats optimistically here if needed, but not critical for MVP.
    };

    const domains = [
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Science",
        "Mathematics",
        "Engineering",
        "Medicine",
        "Social Sciences",
        "Humanities",
        "Arts",
        "Environmental Science",
        "Psychology",
        "Economics",
        "Other"
    ];

    const departments = [
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Science",
        "Mathematics",
        "Engineering",
        "Medicine",
        "Social Sciences",
        "Humanities",
        "Arts",
        "Environmental Science",
        "Psychology",
        "Economics",
        "Other"
    ];

    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="flex flex-col h-full bg-[#faf9f7] overflow-hidden">
            <PageTitle title="My Network | References" />

            <header className="bg-white border-b border-[#e8e4f0] px-8 pt-8 pb-0">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[#1f1b2a] tracking-tight">My Network</h1>
                            <p className="text-[#8a8396] text-sm mt-1">Connect with researchers and discover new collaborations.</p>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e8e4f0] text-[#1f1b2a] text-sm font-bold hover:shadow-md transition-all active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#f5c84b]">
                                {showFilters ? 'filter_list_off' : 'filter_list'}
                            </span>
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-8">
                        {[
                            { id: 'discover', label: 'Discover', icon: 'explore' },
                            { id: 'following', label: 'Following', count: stats.following, icon: 'person_add' },
                            { id: 'followers', label: 'Followers', count: stats.followers, icon: 'groups' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 flex items-center gap-2 text-sm font-bold transition-all relative ${activeTab === tab.id
                                    ? "text-[#1f1b2a]"
                                    : "text-[#8a8396] hover:text-[#1f1b2a]"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'font-filled' : ''}`}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-[#f5c84b] text-[#1f1b2a]' : 'bg-gray-100 text-[#8a8396]'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f5c84b] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Filters Sidebar - Same as before */}
                {showFilters && (
                    <aside className="w-80 bg-white border-r border-[#e8e4f0] overflow-y-auto hidden xl:block animate-in slide-in-from-left duration-300">
                        <div className="p-6 space-y-8">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-[#1f1b2a] text-xs uppercase tracking-[0.2em]">Filters</h3>
                                    <button
                                        onClick={() => {
                                            setSelectedDomains([]);
                                            setSelectedDepartment("");
                                            setSelectedInstitution("");
                                            setSelectedCountry("");
                                            setSearchQuery("");
                                        }}
                                        className="text-[11px] font-black text-[#f5c84b] hover:text-[#f4b82a] uppercase tracking-wider underline underline-offset-4 decoration-2"
                                    >
                                        Reset All
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Department Dropdown - Kept as the primary filter */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-[#8a8396] uppercase tracking-widest flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-base">business_center</span>
                                            Department
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedDepartment}
                                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                                className="w-full h-11 px-4 rounded-xl bg-[#faf9f7] border border-[#e8e4f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/30 focus:bg-white transition cursor-pointer appearance-none"
                                            >
                                                <option value="">All Departments</option>
                                                {departments.map(d => (
                                                    <option key={d} value={d}>
                                                        {d}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    {/* Inputs for remaining filters */}
                                    {[
                                        { label: 'Institution', icon: 'school', value: selectedInstitution, setter: setSelectedInstitution, placeholder: 'e.g. Stanford University' },
                                        { label: 'Country', icon: 'public', value: selectedCountry, setter: setSelectedCountry, placeholder: 'e.g. United States' }
                                    ].map(filter => (
                                        <div key={filter.label} className="space-y-2">
                                            <label className="text-[11px] font-bold text-[#8a8396] uppercase tracking-widest flex items-center gap-2 mb-1">
                                                <span className="material-symbols-outlined text-base">{filter.icon}</span>
                                                {filter.label}
                                            </label>
                                            <input
                                                type="text"
                                                value={filter.value}
                                                onChange={(e) => filter.setter(e.target.value)}
                                                placeholder={filter.placeholder}
                                                className="w-full h-11 px-4 rounded-xl bg-[#faf9f7] border border-[#e8e4f0] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/30 focus:bg-white transition"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-6xl mx-auto w-full">
                        {/* Search Bar */}
                        <div className="relative mb-8 group">
                            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#9a92a8] text-[22px] transition-colors group-focus-within:text-[#f5c84b]">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search researchers by name or username..."
                                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-[#e8e4f0] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f5c84b]/10 focus:border-[#f5c84b]/50 shadow-sm transition-all placeholder:text-[#9a92a8]/60"
                            />
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-2xl border border-[#e8e4f0] p-6 h-64 animate-pulse">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-100" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-gray-100 rounded" />
                                                <div className="h-3 w-24 bg-gray-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 w-full bg-gray-100 rounded" />
                                            <div className="h-3 w-full bg-gray-100 rounded" />
                                            <div className="h-3 w-2/3 bg-gray-100 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[#e8e4f0] border-dashed">
                                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-4xl text-gray-300">group</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#1f1b2a]">No other researchers yet</h3>
                                <p className="text-[#8a8396] text-sm mt-2 max-w-sm text-center">
                                    {debouncedSearchQuery || selectedDepartment || selectedInstitution
                                        ? "No researchers match your search criteria. Try broadening your terms."
                                        : "You are currently the first researcher in this network! Invite your colleagues to join and collaborate."}
                                </p>
                                {(debouncedSearchQuery || selectedDepartment || selectedInstitution) && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedDomains([]);
                                            setSelectedDepartment("");
                                            setSelectedInstitution("");
                                            setSelectedCountry("");
                                        }}
                                        className="mt-6 px-6 py-2 bg-[#faf9f7] border border-[#e8e4f0] text-[#1f1b2a] font-bold rounded-xl hover:bg-gray-100 transition shadow-sm"
                                    >
                                        Clear Search Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {data.map((researcher) => {
                                    const status = relationshipMap[researcher.id] || "NONE";
                                    const isSelf = researcher.id === user?.id;

                                    return (
                                        <div
                                            key={researcher.id}
                                            className="group bg-white rounded-2xl border border-[#e8e4f0] p-6 hover:shadow-[0_12px_24px_-8px_rgba(31,27,42,0.1)] transition-all duration-300 flex flex-col"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex gap-4">
                                                    <div className="relative">
                                                        {researcher.avatarUrl ? (
                                                            <img
                                                                src={researcher.avatarUrl}
                                                                alt={researcher.name}
                                                                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-16 h-16 rounded-full bg-[#f8f9fa] border-2 border-[#e8e4f0] flex items-center justify-center shadow-sm">
                                                                <span className="material-symbols-outlined text-[#8a8396] text-3xl">person</span>
                                                            </div>
                                                        )}
                                                        {status === "FOLLOWING" && (
                                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f5c84b] border-2 border-white flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-white text-[14px]">check</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-[#1f1b2a] group-hover:text-[#f5c84b] transition-colors">
                                                            <Link to={`/profile/${researcher.id}`}>{researcher.name}</Link>
                                                        </h3>
                                                        <p className="text-[11px] text-[#8a8396] font-medium uppercase tracking-tight">@{researcher.displayName.toLowerCase()}</p>
                                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#6e6189] font-semibold">
                                                            <span className="material-symbols-outlined text-[14px]">school</span>
                                                            <span className="truncate max-w-[150px]">{researcher.institution || 'Academic Institution'}</span>
                                                        </div>
                                                        {researcher.country && (
                                                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#8a8396] font-medium">
                                                                <span className="material-symbols-outlined text-[12px]">public</span>
                                                                {researcher.country}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6 flex-1">
                                                <p className="text-xs text-[#4a4555] leading-relaxed line-clamp-2 italic">
                                                    {researcher.bio || "No bio added yet. Explore this researcher's profile to learn more about their work."}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {researcher.department && (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-[#f0f2f5] text-[10px] font-bold text-[#6e6189] uppercase tracking-wide">
                                                            {researcher.department}
                                                        </span>
                                                    )}
                                                    {researcher.gender && (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-[#fffcf0] border border-[#f5c84b]/30 text-[10px] font-bold text-[#1f1b2a] uppercase tracking-wide">
                                                            {researcher.gender}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-[#f5f5f5]">
                                                {activeTab === 'followers' ? (
                                                    <button
                                                        onClick={() => confirmRemoveFollower(researcher)}
                                                        className="h-10 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition shadow-sm border border-rose-100 flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/profile/${researcher.id}`)}
                                                        className="h-10 rounded-xl bg-[#faf9f7] text-[#1f1b2a] text-xs font-bold hover:bg-gray-100 transition shadow-sm"
                                                    >
                                                        View Profile
                                                    </button>
                                                )}
                                                {!isSelf && (
                                                    <FollowButton
                                                        userId={researcher.id}
                                                        initialStatus={status}
                                                        onStatusChange={(newStatus) => handleStatusChange(researcher.id, newStatus)}
                                                        className="h-10 text-xs w-full"
                                                    />
                                                )}
                                                {isSelf && (
                                                    <div className="h-10 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center border border-blue-100 uppercase tracking-wider">
                                                        You
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Remove Follower Confirmation Modal */}
            {showRemoveModal && targetFollower && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#1f1b2a]/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !removingFollower && setShowRemoveModal(false)}
                    />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="pt-10 pb-8 px-8 text-center">
                            <div className="relative inline-block mb-6">
                                {targetFollower.avatarUrl ? (
                                    <img
                                        src={targetFollower.avatarUrl}
                                        alt={targetFollower.name}
                                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-[#f8f9fa] border-4 border-white flex items-center justify-center shadow-xl">
                                        <span className="material-symbols-outlined text-[#8a8396] text-5xl">person</span>
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-500 border-4 border-white flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-white text-[16px]">close</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-[#1f1b2a] mb-2 tracking-tight">Remove Follower?</h3>
                            <p className="text-sm text-[#8a8396] font-medium leading-relaxed px-4">
                                References won't tell <span className="font-bold text-[#1f1b2a]">@{targetFollower.displayName}</span> they were removed from your followers.
                            </p>
                        </div>
                        <div className="flex flex-col border-t border-gray-100">
                            <button
                                onClick={handleRemoveFollower}
                                disabled={removingFollower}
                                className="w-full py-4 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors uppercase tracking-widest disabled:opacity-50"
                            >
                                {removingFollower ? 'Removing...' : 'Remove'}
                            </button>
                            <button
                                onClick={() => setShowRemoveModal(false)}
                                disabled={removingFollower}
                                className="w-full py-4 text-sm font-bold text-[#1f1b2a] hover:bg-gray-50 transition-colors uppercase tracking-widest border-t border-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkPage;
