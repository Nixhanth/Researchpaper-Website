import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import postService, { Post } from '../services/post.service';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import { toast } from 'sonner';

interface FeedProps {
    userId?: string;
}

const INITIAL_LOAD_COUNT = 10;

const Feed: React.FC<FeedProps> = ({ userId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);

    const feedTopRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const isLoadingRef = useRef(false);

    // Fetch feed with infinite scroll support
    const fetchFeed = useCallback(async (cursorParam: number | null = null, isInitial = false) => {
        // Prevent duplicate calls
        if (isLoadingRef.current && !isInitial) return;
        isLoadingRef.current = true;

        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const data = userId
                ? await postService.getUserPosts(userId, 0, 10)
                : await postService.getFeedWithCursor(cursorParam, 10);

            if (isInitial) {
                setPosts(data.content);
            } else {
                // Prevent duplicates
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = data.content.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
            }

            setCursor(data.cursor || null);
            setHasMore(!data.last && data.content.length > 0);

        } catch (error) {
            console.error("Failed to fetch feed", error);
            if (isInitial) {
                toast.error("Failed to load feed");
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [userId]);

    // Initial load
    useEffect(() => {
        fetchFeed(null, true);
    }, [userId]);

    // Infinite scroll observer
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchFeed(cursor, false);
                }
            },
            {
                root: null,
                rootMargin: '200px',
                threshold: 0.1
            }
        );

        if (loadMoreTriggerRef.current) {
            observerRef.current.observe(loadMoreTriggerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [cursor, hasMore, loadingMore, loading, fetchFeed]);

    // Handle new post creation - optimistic update
    const handlePostCreated = (newPost?: Post) => {
        if (newPost) {
            // Optimistically add to top
            setPosts(prev => [newPost, ...prev]);
        } else {
            // If no post data returned, refresh feed
            fetchFeed(null, true);
        }
        feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle comment toggle - only one comment section open at a time
    const handleCommentToggle = (postId: number, isOpen: boolean) => {
        if (isOpen) {
            setActiveCommentPostId(postId);
        } else if (activeCommentPostId === postId) {
            setActiveCommentPostId(null);
        }
    };

    // Handle post deletion
    const handleDeletePost = (postId: number) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    const showCreatePost = !userId || (user && user.id === userId);

    // Initial loading state
    if (loading && posts.length === 0) {
        return (
            <div className="max-w-2xl mx-auto pb-10">
                {showCreatePost && <CreatePost onPostCreated={handlePostCreated} />}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-[#e8e4f0] p-5 animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
                                    <div className="space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-full" />
                                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <div ref={feedTopRef} />

            {showCreatePost && <CreatePost onPostCreated={handlePostCreated} />}

            <div className="space-y-4">
                {posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onDelete={handleDeletePost}
                        isCommentOpen={activeCommentPostId === post.id}
                        onCommentToggle={(isOpen) => handleCommentToggle(post.id, isOpen)}
                    />
                ))}
            </div>

            {/* Empty state - encouraging message */}
            {posts.length === 0 && !loading && (
                <div className="text-center py-12 px-6 bg-white rounded-[32px] border border-[#e8e4f0] shadow-sm animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f5c84b]/20 to-[#f5c84b]/5 flex items-center justify-center mx-auto mb-5 shadow-inner border border-[#f5c84b]/10">
                        <span className="material-symbols-outlined text-[32px] text-[#f5c84b] font-filled">auto_awesome</span>
                    </div>
                    <h3 className="text-xl font-black text-[#1f1b2a] mb-2 tracking-tight">Your feed is waiting...</h3>
                    <p className="text-sm text-[#8a8396] font-medium max-w-[280px] mx-auto leading-relaxed mb-8">
                        Connect with researchers to see their updates or share your latest findings!
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/network')}
                            className="h-11 px-6 rounded-xl bg-[#f5c84b] text-[#1f1b2a] text-sm font-bold flex items-center gap-2 hover:bg-[#f4b82a] transition-all active:scale-95 shadow-lg shadow-[#f5c84b]/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">group</span>
                            Explore Network
                        </button>
                    </div>
                </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreTriggerRef} className="h-4" />

            {/* Loading more indicator */}
            {loadingMore && (
                <div className="flex justify-center py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#f5c84b] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#f5c84b] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#f5c84b] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}

            {/* End of feed - subtle indicator */}
            {!hasMore && posts.length > 0 && !loadingMore && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 text-[#c4c0cc] text-xs">
                        <div className="w-8 h-px bg-[#e8e4f0]" />
                        <span>You've reached the end</span>
                        <div className="w-8 h-px bg-[#e8e4f0]" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Feed;
