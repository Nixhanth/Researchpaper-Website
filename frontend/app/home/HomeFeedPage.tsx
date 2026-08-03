import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext";
import PageTitle from "../../src/components/PageTitle";
import Feed from "../../src/components/Feed";
import feedService from "../../src/services/feed.service";
import profileService from "../../src/services/profile.service";

import networkService from "../../src/services/network.service";
import followService, { UserSummary } from "../../src/services/follow.service";

const HomeFeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<any>(null);
  const [suggestions, setSuggestions] = React.useState<UserSummary[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(true);
  const [followingIds, setFollowingIds] = React.useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = React.useState<Set<string>>(new Set());
  const [showWelcome, setShowWelcome] = React.useState(false);

  React.useEffect(() => {
    const isFirstTime = sessionStorage.getItem('first_time_welcome');
    if (isFirstTime === 'true') {
      setShowWelcome(true);
      // Auto-close after 2 minutes
      const timer = setTimeout(() => {
        setShowWelcome(false);
        sessionStorage.removeItem('first_time_welcome');
      }, 120000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    sessionStorage.removeItem('first_time_welcome');
  };
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [profileData, suggestData, followingData, sentRequestsData] = await Promise.all([
          profileService.getMyProfile(),
          networkService.getSuggestions(5),
          user ? followService.getFollowing(user.id) : [],
          user ? followService.getSentRequests(user.id) : []
        ]);
        setProfile(profileData);
        if (user) {
          setSuggestions(suggestData.filter((u: UserSummary) => u.id !== user.id));
        } else {
          setSuggestions(suggestData);
        }
        setFollowingIds(new Set(followingData.map((f: any) => f.id)));
        setRequestedIds(new Set(sentRequestsData.map((f: any) => f.id)));
      } catch (e) {
        console.error("Failed to fetch home feed data", e);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const handleFollowToggle = async (targetUserId: string) => {
    const isCurrentlyFollowing = followingIds.has(targetUserId);
    const isRequested = requestedIds.has(targetUserId);

    try {
      if (isCurrentlyFollowing) {
        await followService.unfollowUser(targetUserId);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else if (isRequested) {
        await followService.cancelRequest(targetUserId);
        setRequestedIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else {
        const result = await followService.followUser(targetUserId);
        if (result && result.status === "FOLLOWING") {
          setFollowingIds(prev => new Set(prev).add(targetUserId));
        } else {
          setRequestedIds(prev => new Set(prev).add(targetUserId));
        }
      }

      // Refresh own profile stats to update sidebar counters
      try {
        const updatedProfile = await profileService.getMyProfile();
        setProfile(updatedProfile);
      } catch (e) {
        console.error("Failed to refresh profile stats", e);
      }
    } catch (error) {
      console.error("Follow action failed", error);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <PageTitle title="Home Feed" />

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-white/20">
            {/* Decorations */}
            <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#f5c84b]/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-[#6e6189]/10 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

            {/* Close Icon */}
            <button
              onClick={closeWelcome}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-[#faf8f5] text-[#8a8396] hover:bg-[#f5c84b] hover:text-[#1f1b2a] transition-all transform hover:rotate-90 active:scale-95 z-20"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-[#fff9e6] rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce transition-all shadow-inner border border-[#f5c84b]/20">
                <span className="material-symbols-outlined text-[#f5c84b] text-[48px] font-filled">celebration</span>
              </div>

              <h2 className="text-4xl font-black text-[#1f1b2a] mb-4 tracking-tight leading-tight">
                Welcome to References, <br />
                <span className="text-[#f5c84b]">{profile?.name || user?.fullName || 'Researcher'}!</span>
              </h2>

              <p className="text-[#6e6189] text-lg leading-relaxed mb-8 max-w-md mx-auto">
                Thanks for joining the <span className="font-bold text-[#1f1b2a]">References Research Platform</span>.
                Your professional profile is now live and ready for global collaboration.
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={closeWelcome}
                  className="w-full h-14 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-2xl hover:bg-[#f4b82a] transition-all shadow-xl shadow-[#f5c84b]/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  LET'S START EXPLORING
                  <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                </button>
                <p className="text-[10px] text-[#8a8396] uppercase font-black tracking-widest">this message will auto-close in 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Center Feed */}
        <section className="flex-1 min-w-0">
          <Feed />
        </section>

        {/* Right Sidebar - 340px width */}
        <aside className="w-full lg:w-[340px] flex-shrink-0 space-y-6">
          {/* Profile Card - Premium Enhanced */}
          <div className="bg-white rounded-[32px] border border-[#e8e4f0] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#f5c84b]/5 transition-all duration-500 group">
            <div className="h-16 bg-gradient-to-r from-[#fef3c7] to-[#fffbeb]" />
            <div className="px-6 pb-8 -mt-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 mb-5 border-4 border-white shadow-xl overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-[#f8f9fa] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#8a8396] text-5xl">person</span>
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <h3 className="font-black text-xl text-[#1f1b2a] tracking-tight mb-1">{profile?.name || user?.fullName || 'Researcher'}</h3>
                <p className="text-[10px] text-[#f5c84b] font-black uppercase tracking-[0.2em]">
                  {profile?.title || 'Academic Researcher'}
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-0 mb-8 px-2">
                <div className="text-center group/stat cursor-pointer border-r border-[#f3f0f7]" onClick={() => navigate('/network')}>
                  <p className="text-2xl font-black text-[#1f1b2a] group-hover/stat:text-[#f5c84b] transition-colors tabular-nums">{profile?.stats?.followers || 0}</p>
                  <p className="text-[9px] text-[#8a8396] uppercase font-black tracking-widest">Followers</p>
                </div>
                <div className="text-center group/stat cursor-pointer" onClick={() => navigate('/network')}>
                  <p className="text-2xl font-black text-[#1f1b2a] group-hover/stat:text-[#f5c84b] transition-colors tabular-nums">{profile?.stats?.following || 0}</p>
                  <p className="text-[9px] text-[#8a8396] uppercase font-black tracking-widest">Following</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full h-12 rounded-2xl bg-[#f5c84b] text-[#1f1b2a] text-[13px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#f4b82a] shadow-lg shadow-[#f5c84b]/20 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                My Profile
              </button>
            </div>
          </div>

          {/* Suggestions Section - Refined */}
          <div className="bg-white rounded-[32px] border border-[#e8e4f0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f5c84b] text-[20px] font-filled">explore</span>
                <h3 className="font-black text-[10px] text-[#1f1b2a] uppercase tracking-widest">Researchers to Follow</h3>
              </div>
              <button
                onClick={() => navigate('/network')}
                className="text-[10px] text-[#f5c84b] font-black uppercase tracking-widest hover:text-[#1f1b2a] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {suggestionsLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-[#faf9f7]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-[#faf9f7] rounded-full" />
                      <div className="h-2 w-1/2 bg-[#faf9f7] rounded-full" />
                    </div>
                  </div>
                ))
              ) : suggestions.length > 0 ? (
                suggestions.map((researcher) => (
                  <div key={researcher.id} className="flex items-center justify-between group/user">
                    <div className="flex items-center gap-4">
                      <Link to={`/u/${researcher.displayName}`} className="relative">
                        <div className="w-12 h-12 rounded-2xl border-2 border-transparent group-hover/user:border-[#f5c84b]/30 p-0.5 transition-all overflow-hidden bg-[#faf9f7]">
                          {researcher.avatarUrl ? (
                            <img
                              src={researcher.avatarUrl}
                              alt={researcher.name}
                              className="w-full h-full rounded-[14px] object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[#8a8396] text-xl">person</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0">
                        <Link to={`/u/${researcher.displayName}`} className="block text-sm font-black text-[#1f1b2a] hover:text-[#f5c84b] transition-colors truncate leading-tight">
                          {researcher.name}
                        </Link>
                        <p className="text-[10px] text-[#8a8396] font-bold truncate uppercase tracking-tight mt-0.5">
                          {researcher.department || researcher.institution || 'Researcher'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollowToggle(researcher.id)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${followingIds.has(researcher.id)
                        ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
                        : requestedIds.has(researcher.id)
                          ? "text-[#6e6189] bg-[#f0eff5] border border-[#e8e4f0]"
                          : "text-[#1f1b2a] bg-[#faf9f7] border border-[#e8e4f0] hover:bg-[#fffbeb] hover:border-[#f5c84b]/30 group-hover/user:bg-[#fff9e6]"
                        }`}
                      title={followingIds.has(researcher.id) ? "Following" : requestedIds.has(researcher.id) ? "Requested" : "Follow"}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${followingIds.has(researcher.id) ? 'font-filled' : ''}`}>
                        {followingIds.has(researcher.id) ? 'person_check' : requestedIds.has(researcher.id) ? 'hourglass_empty' : 'person_add'}
                      </span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-[#faf9f7] rounded-2xl border border-dashed border-[#e8e4f0]">
                  <span className="material-symbols-outlined text-[#d1d5db] text-[24px] mb-2">person_search</span>
                  <p className="text-[10px] text-[#8a8396] font-bold uppercase tracking-widest">No suggestions currently</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomeFeedPage;
