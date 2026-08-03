import React, { useState, useEffect, useRef } from 'react';
import postService, { Post, Comment as CommentType } from '../services/post.service';
import networkService from '../services/network.service';
import { formatContent } from '../utils/textUtils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';

interface MentionUser {
    id: string;
    displayName: string;
    avatar?: string;
}

interface PostCardProps {
    post: Post;
    onDelete?: (postId: number) => void;
    isCommentOpen?: boolean;
    onCommentToggle?: (isOpen: boolean) => void;
}

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};

const PostCard: React.FC<PostCardProps> = ({
    post,
    onDelete,
    isCommentOpen = false,
    onCommentToggle
}) => {
    const { user } = useAuth();
    // Local state for optimistic updates
    const [isLiked, setIsLiked] = useState(post.isLiked ?? (post as any).liked ?? false);
    const [likeCount, setLikeCount] = useState(post.likeCount);
    const [comments, setComments] = useState<CommentType[]>([]);
    const [commentCount, setCommentCount] = useState(post.commentCount);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLikeAnimating, setIsLikeAnimating] = useState(false);

    // UI state - controlled by parent for single-comment behavior
    const [showComments, setShowComments] = useState(isCommentOpen);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Comment editing state
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [updatingComment, setUpdatingComment] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

    // Mention state for comments
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
    const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
    const [mentionLoading, setMentionLoading] = useState(false);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // Sync state if prop changes
    useEffect(() => {
        setIsLiked(post.isLiked ?? (post as any).liked ?? false);
        setLikeCount(post.likeCount);
        setCommentCount(post.commentCount);
    }, [post]);

    // Sync with parent's isCommentOpen
    useEffect(() => {
        if (!isCommentOpen && showComments) {
            // Parent closed this comment section
            setShowComments(false);
            setNewComment(""); // Reset comment input
        }
    }, [isCommentOpen]);

    const handleLike = async () => {
        // Trigger animation
        setIsLikeAnimating(true);
        setTimeout(() => setIsLikeAnimating(false), 300);

        // Optimistic UI update
        const previousLiked = isLiked;
        const previousCount = likeCount;

        setIsLiked(!previousLiked);
        setLikeCount(prev => previousLiked ? prev - 1 : prev + 1);

        try {
            if (previousLiked) {
                await postService.unlikePost(post.id);
            } else {
                await postService.likePost(post.id);
            }
        } catch (error) {
            // Revert on error
            setIsLiked(previousLiked);
            setLikeCount(previousCount);
            console.error("Failed to toggle like", error);
            toast.error("Failed to like post");
        }
    };

    const loadComments = async () => {
        if (showComments) {
            // Close comments
            setShowComments(false);
            onCommentToggle?.(false);
            return;
        }

        // Open comments (parent will close others)
        onCommentToggle?.(true);
        setShowComments(true);

        try {
            setLoadingComments(true);
            const data = await postService.getComments(post.id);
            setComments(data);
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setLoadingComments(false);
        }
    };

    // Close mention dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showMentionSuggestions && !(e.target as HTMLElement).closest('.mention-dropdown-comment')) {
                setShowMentionSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMentionSuggestions]);

    // Mention suggestions effect
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setMentionLoading(true);
                if (mentionQuery.trim().length === 0) {
                    const results = await networkService.getSuggestions(5);
                    const mapped = results.map(u => ({
                        id: u.id,
                        displayName: u.displayName,
                        avatar: u.avatarUrl
                    }));
                    setMentionSuggestions(mapped);
                    return;
                }
                const result = await networkService.getMentions(mentionQuery, 5);
                const mapped = result.map((u: any) => ({
                    id: u.id,
                    displayName: u.displayName,
                    avatar: u.avatarUrl
                }));
                setMentionSuggestions(mapped);
            } catch (e) {
                console.error(e);
            } finally {
                setMentionLoading(false);
            }
        };

        if (showMentionSuggestions) {
            const timeoutId = setTimeout(fetchSuggestions, 150);
            return () => clearTimeout(timeoutId);
        }
    }, [mentionQuery, showMentionSuggestions]);

    const handleCommentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewComment(val);

        const cursorPosition = e.target.selectionStart || 0;
        const textBeforeCursor = val.substring(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))) {
            const query = textBeforeCursor.substring(lastAt + 1);
            if (!/\s/.test(query)) {
                setMentionCursorIndex(lastAt);
                setMentionQuery(query);
                setShowMentionSuggestions(true);
                return;
            }
        }
        setShowMentionSuggestions(false);
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentionSuggestions && mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev + 1) % mentionSuggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionSuggestions[selectedMentionIndex].displayName);
                return;
            }
            if (e.key === 'Escape') {
                setShowMentionSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleComment(e as any);
        }
    };

    const insertMention = (username: string) => {
        const handle = username.toLowerCase().replace(/\s+/g, '_');
        const before = newComment.substring(0, mentionCursorIndex);
        const after = newComment.substring(mentionCursorIndex + mentionQuery.length + 1);
        const updatedComment = `${before}@${handle} ${after}`;

        setNewComment(updatedComment);
        setShowMentionSuggestions(false);
        setMentionSuggestions([]);
        setSelectedMentionIndex(0);

        if (commentInputRef.current) {
            commentInputRef.current.focus();
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setSendingComment(true);
            const comment = await postService.addComment(post.id, newComment);
            setComments([...comments, comment]);
            setCommentCount(prev => prev + 1);
            setNewComment("");
        } catch (error) {
            console.error("Failed to add comment", error);
            toast.error("Failed to add comment");
        } finally {
            setSendingComment(false);
        }
    };

    const handleShare = () => {
        setShowShareModal(true);
    };

    const confirmDelete = async () => {
        try {
            setIsDeleting(true);
            await postService.deletePost(post.id);
            toast.success("Post deleted");
            if (onDelete) onDelete(post.id);
        } catch (error) {
            console.error("Failed to delete post", error);
            toast.error("Failed to delete post");
            setIsDeleting(false);
        }
    };

    const confirmDeleteComment = async () => {
        if (commentToDelete === null) return;
        try {
            await postService.deleteComment(commentToDelete);
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            setCommentCount(prev => prev - 1);
            toast.success("Comment deleted");
        } catch (error) {
            console.error("Failed to delete comment", error);
            toast.error("Failed to delete comment");
        } finally {
            setCommentToDelete(null);
        }
    };

    const handleUpdateComment = async (commentId: number) => {
        if (!editCommentContent.trim()) return;
        try {
            setUpdatingComment(true);
            const updated = await postService.updateComment(commentId, editCommentContent);
            setComments(prev => prev.map(c => c.id === commentId ? updated : c));
            setEditingCommentId(null);
            setEditCommentContent("");
            toast.success("Comment updated");
        } catch (error) {
            console.error("Failed to update comment", error);
            toast.error("Failed to update comment");
        } finally {
            setUpdatingComment(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-[#e8e4f0] p-5 shadow-sm mb-4 hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-4">
                <Link to={`/profile/${post.author.id}`} className="flex-shrink-0 cursor-pointer group">
                    {post.author.avatarUrl ? (
                        <img
                            src={post.author.avatarUrl}
                            alt={post.author.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-[#e8e4f0] group-hover:border-[#f5c84b] transition-colors"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#e8e4f0] flex items-center justify-center group-hover:border-[#f5c84b] transition-colors">
                            <span className="material-symbols-outlined text-[#8a8396] text-xl">person</span>
                        </div>
                    )}
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <Link to={`/profile/${post.author.id}`} className="text-sm font-bold text-[#1f1b2a] hover:text-[#f5c84b] transition-colors cursor-pointer">
                                    {post.author.name}
                                </Link>
                                <span className="text-xs text-[#8a8396]">@{post.author.displayName}</span>
                            </div>
                            <p className="text-xs text-[#8a8396] truncate max-w-[300px]">
                                {post.author.institution}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#8a8396] whitespace-nowrap">
                                {timeAgo(post.createdAt)}
                            </span>

                            {user?.id === post.author.id && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={isDeleting}
                                    className="text-[#8a8396] hover:text-red-500 transition-colors disabled:opacity-50 hover:bg-red-50 p-1 rounded-full"
                                    title="Delete Post"
                                >
                                    <span className="material-symbols-outlined text-[16px]">{isDeleting ? 'sync' : 'delete'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 text-sm text-[#1f1b2a] leading-relaxed whitespace-pre-wrap">
                        {formatContent(post.content, post.mentionedUsernames)}
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#f5f5f5]">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 transition-all text-xs font-medium group ${isLiked ? "text-[#f5c84b]" : "text-[#8a8396] hover:text-[#f5c84b]"}`}
                        >
                            <span
                                className={`material-symbols-outlined text-[18px] transition-transform ${isLiked ? "fill-current" : ""} ${isLikeAnimating ? "scale-125" : ""} group-hover:scale-110`}
                                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                favorite
                            </span>
                            {likeCount > 0 ? likeCount : "Like"}
                        </button>
                        <button
                            onClick={loadComments}
                            className={`flex items-center gap-1.5 transition-all text-xs font-medium group ${showComments ? "text-[#f5c84b]" : "text-[#8a8396] hover:text-[#f5c84b]"}`}
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">comment</span>
                            {commentCount > 0 ? commentCount : "Comment"}
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 text-[#8a8396] hover:text-[#f5c84b] transition-all text-xs font-medium group"
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">share</span>
                            Share
                        </button>
                    </div>

                    {/* Comments Section with smooth transition */}
                    <div
                        className={`transition-all duration-300 ease-in-out ${showComments ? 'max-h-[2000px] opacity-100 mt-4 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}
                    >
                        <div className="space-y-4">
                            {loadingComments && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="flex items-center gap-2 text-xs text-[#8a8396]">
                                        <div className="w-4 h-4 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin" />
                                        Loading comments...
                                    </div>
                                </div>
                            )}

                            {comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 text-sm group animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Link to={`/profile/${comment.user.id}`} className="flex-shrink-0">
                                        {comment.user.avatarUrl ? (
                                            <img
                                                src={comment.user.avatarUrl}
                                                alt={comment.user.displayName}
                                                className="w-8 h-8 rounded-full border border-[#e8e4f0]"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#f8f9fa] border border-[#e8e4f0] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[#8a8396] text-sm">person</span>
                                            </div>
                                        )}
                                    </Link>
                                    <div className="flex-1">
                                        <div className={`p-3 rounded-r-xl rounded-bl-xl ${comment.user.id === post.author.id ? 'bg-[#fff8e1]' : 'bg-[#faf9f7]'}`}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs">{comment.user.name}</span>
                                                    {comment.user.id === post.author.id && (
                                                        <span className="bg-[#f5c84b] text-[#1f1b2a] text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Author</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-[#8a8396]">{timeAgo(comment.createdAt)}</span>
                                            </div>

                                            {editingCommentId === comment.id ? (
                                                <div className="mt-2">
                                                    <textarea
                                                        value={editCommentContent}
                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                        className="w-full p-2 text-sm bg-white border border-[#e8e4f0] rounded-lg focus:ring-1 focus:ring-[#f5c84b] outline-none"
                                                        rows={2}
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            disabled={updatingComment}
                                                            onClick={() => handleUpdateComment(comment.id)}
                                                            className="px-3 py-1 bg-[#f5c84b] text-[#1f1b2a] text-[10px] font-bold rounded-md hover:bg-[#f4b82a] transition"
                                                        >
                                                            {updatingComment ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="px-3 py-1 bg-white border border-[#e8e4f0] text-[#6e6189] text-[10px] font-bold rounded-md hover:bg-[#faf9f7] transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[#1f1b2a]">{formatContent(comment.content, comment.mentionedUsernames)}</p>
                                            )}
                                        </div>

                                        {user?.id === comment.user.id && editingCommentId !== comment.id && (
                                            <div className="flex gap-3 px-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingCommentId(comment.id);
                                                        setEditCommentContent(comment.content);
                                                    }}
                                                    className="text-[10px] font-bold text-[#8a8396] hover:text-[#f5c84b] transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setCommentToDelete(comment.id)}
                                                    className="text-[10px] font-bold text-[#8a8396] hover:text-red-500 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Comment Input */}
                            <form onSubmit={handleComment} className="flex gap-3 items-start mt-4">
                                <Link to="/profile" className="flex-shrink-0">
                                    {user?.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt="My Profile"
                                            className="w-8 h-8 rounded-full border border-[#e8e4f0]"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#f8f9fa] border border-[#e8e4f0] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#8a8396] text-sm">person</span>
                                        </div>
                                    )}
                                </Link>
                                <div className="flex-1 relative">
                                    {/* Mention Suggestions for Comments */}
                                    {showMentionSuggestions && (
                                        <div className="mention-dropdown-comment absolute bottom-[calc(100%+8px)] left-0 z-50 w-64 bg-white border-2 border-[#1f1b2a]/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                                            <div className="p-2.5 bg-[#1f1b2a] text-[9px] font-black text-white uppercase tracking-widest flex justify-between items-center">
                                                <span>Mention Researchers</span>
                                                {mentionLoading && <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                            </div>
                                            <div className="max-h-[240px] overflow-y-auto">
                                                {mentionSuggestions.length > 0 ? (
                                                    mentionSuggestions.map((u, index) => (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => insertMention(u.displayName)}
                                                            onMouseEnter={() => setSelectedMentionIndex(index)}
                                                            className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition ${index === selectedMentionIndex ? 'bg-[#f5c84b]/10' : 'hover:bg-[#faf9f7]'}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg border border-[#e8e4f0] overflow-hidden flex-shrink-0 relative">
                                                                {u.avatar ? (
                                                                    <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-[#1f1b2a]/5 flex items-center justify-center text-[10px] text-[#1f1b2a] font-black uppercase">{u.displayName[0]}</div>
                                                                )}
                                                                {index === selectedMentionIndex && (
                                                                    <div className="absolute inset-0 bg-[#f5c84b]/10 border-2 border-[#f5c84b] rounded-lg z-10" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={`text-xs font-black block truncate ${index === selectedMentionIndex ? 'text-[#f5c84b]' : 'text-[#1f1b2a]'}`}>
                                                                    @{u.displayName.toLowerCase().replace(/\s+/g, '_')}
                                                                </span>
                                                                <span className="text-[9px] text-[#8a8396] block font-bold truncate tracking-tight">{u.displayName}</span>
                                                            </div>
                                                            {index === selectedMentionIndex && (
                                                                <span className="material-symbols-outlined text-[16px] text-[#f5c84b]">check_circle</span>
                                                            )}
                                                        </button>
                                                    ))
                                                ) : !mentionLoading && (
                                                    <div className="p-6 text-center">
                                                        <span className="material-symbols-outlined text-[24px] text-[#e8e4f0] mb-1">person_search</span>
                                                        <p className="text-[9px] text-[#8a8396] font-bold uppercase tracking-wider">No results</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <textarea
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={handleCommentInput}
                                        onKeyDown={handleCommentKeyDown}
                                        placeholder="Write a comment..."
                                        rows={1}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-[#f0f2f5] border-none text-sm focus:ring-2 focus:ring-[#f5c84b]/50 focus:bg-white resize-none overflow-hidden transition-all"
                                        style={{ height: 'auto', minHeight: '40px' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || sendingComment}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${newComment.trim()
                                            ? 'text-[#f5c84b] hover:bg-[#fff8e1] hover:scale-110'
                                            : 'text-[#c4c0cc] cursor-not-allowed'
                                            }`}
                                    >
                                        {sendingComment ? (
                                            <div className="w-5 h-5 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[20px]">send</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Post Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 px-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#e8e4f0] relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-[#1f1b2a] tracking-tight">Share Post</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-10 h-10 rounded-full hover:bg-[#faf9f7] flex items-center justify-center text-[#8a8396] transition"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <p className="text-[#6e6189] text-sm mb-6">
                            Share this research post with your network.
                        </p>

                        <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-2xl p-4 mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#8a8396] text-[20px]">link</span>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-[#1f1b2a] truncate">{`${window.location.origin}/post/${post.id}`}</p>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                                    toast.success("Post link copied!");
                                }}
                                className="px-4 py-2 bg-[#f5c84b] text-[#1f1b2a] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#f4b82a] transition active:scale-95"
                            >
                                Copy
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full h-14 rounded-2xl bg-[#1f1b2a] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#1f1b2a]/20 hover:bg-[#2d273a] transition-all active:scale-[0.98]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
            {/* Deletion Confirmation Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Post?"
                message="Are you sure you want to permanently remove this post? This action cannot be undone."
                confirmText="Delete Post"
            />

            <ConfirmationModal
                isOpen={commentToDelete !== null}
                onClose={() => setCommentToDelete(null)}
                onConfirm={confirmDeleteComment}
                title="Delete Comment?"
                message="Are you sure you want to remove this comment?"
                confirmText="Delete Comment"
            />
        </div>
    );
};

export default PostCard;
