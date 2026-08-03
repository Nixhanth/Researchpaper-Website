import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import postService, { Post } from '../services/post.service';
import networkService from '../services/network.service';
import { toast } from 'sonner';

interface CreatePostProps {
    onPostCreated: (post?: Post) => void;
}

interface MentionUser {
    id: string;
    displayName: string;
    avatar?: string;
}

const MAX_CHARS = 2000;
const WARNING_THRESHOLD = 1800;

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Mention state
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
    const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [mentionLoading, setMentionLoading] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [content]);

    // Debounced search for mentions
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setMentionLoading(true);
                if (mentionQuery.trim().length === 0) {
                    const results = await networkService.getSuggestions(8);
                    const mapped = results.map(u => ({
                        id: u.id,
                        displayName: u.displayName,
                        avatar: u.avatarUrl
                    }));
                    setMentionSuggestions(mapped);
                    setMentionLoading(false);
                    return;
                }

                const result = await networkService.getMentions(mentionQuery, 8);
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

    // Handle clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showMentionSuggestions && !(e.target as HTMLElement).closest('.mention-dropdown')) {
                setShowMentionSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMentionSuggestions]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        if (val.length <= MAX_CHARS) {
            setContent(val);
        }

        const cursorPosition = e.target.selectionStart;
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

    const insertMention = (username: string) => {
        const handle = username.toLowerCase().replace(/\s+/g, '_');
        const before = content.substring(0, mentionCursorIndex);
        const after = content.substring(mentionCursorIndex + mentionQuery.length + 1);
        const newContent = `${before}@${handle} ${after}`;

        setContent(newContent);
        setShowMentionSuggestions(false);
        setMentionSuggestions([]);
        setSelectedSuggestionIndex(0);

        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || loading) return;

        try {
            setLoading(true);
            const newPost = await postService.createPost(content);
            setContent("");
            onPostCreated(newPost);
        } catch (error) {
            console.error("Failed to create post", error);
            toast.error("Failed to post update");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentionSuggestions && mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => (prev + 1) % mentionSuggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionSuggestions[selectedSuggestionIndex].displayName);
                return;
            }
            if (e.key === 'Escape') {
                setShowMentionSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey && !showMentionSuggestions) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const charCount = content.length;
    const isNearLimit = charCount >= WARNING_THRESHOLD;
    const charCountColor = charCount >= MAX_CHARS ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-[#8a8396]';

    return (
        <div
            className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md mb-8 relative transition-all duration-300 ${isFocused ? 'border-[#f5c84b] ring-4 ring-[#f5c84b]/5' : 'border-[#e8e4f0]'
                }`}
        >
            <div className="flex gap-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl border-2 border-[#f5c84b]/10 p-0.5 bg-white shadow-sm overflow-hidden">
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt="Profile"
                                className="w-full h-full rounded-[10px] object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-[10px] bg-[#f8f9fa] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#8a8396] text-2xl">person</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 relative">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-1">
                            <p className="text-[10px] font-black text-[#8a8396] uppercase tracking-[0.15em] mb-3">Share an update, ask a question, or mention a researcher</p>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="What's happening in your research world? Type @ to mention..."
                            className="w-full min-h-[100px] p-4 rounded-xl bg-[#faf9f7] border border-[#e8e4f0] text-[15px] font-medium text-[#1f1b2a] placeholder:text-[#9a92a8] focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/10 focus:bg-white focus:border-[#f5c84b] transition-all resize-none shadow-inner"
                            maxLength={MAX_CHARS}
                        />

                        {/* Suggestions Dropdown */}
                        {showMentionSuggestions && (
                            <div className="mention-dropdown absolute top-full left-0 z-50 w-64 bg-white border-2 border-[#1f1b2a]/10 rounded-2xl shadow-2xl overflow-hidden mt-2 animate-in fade-in slide-in-from-top-4 duration-200">
                                <div className="p-3 bg-[#1f1b2a] text-[9px] font-black text-white uppercase tracking-widest flex justify-between items-center">
                                    <span>Mention Researchers</span>
                                    {mentionLoading && <span className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {mentionSuggestions.length > 0 ? (
                                        mentionSuggestions.map((u, index) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => insertMention(u.displayName)}
                                                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition ${index === selectedSuggestionIndex ? 'bg-[#f5c84b]/10' : 'hover:bg-[#faf9f7]'}`}
                                            >
                                                <div className="w-9 h-9 rounded-xl border border-[#e8e4f0] overflow-hidden flex-shrink-0 relative">
                                                    {u.avatar ? (
                                                        <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-[#1f1b2a]/5 flex items-center justify-center text-xs text-[#1f1b2a] font-black uppercase">{u.displayName[0]}</div>
                                                    )}
                                                    {index === selectedSuggestionIndex && (
                                                        <div className="absolute inset-0 bg-[#f5c84b]/10 border-2 border-[#f5c84b] rounded-xl z-10" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-black block truncate ${index === selectedSuggestionIndex ? 'text-[#f5c84b]' : 'text-[#1f1b2a]'}`}>
                                                        @{u.displayName.toLowerCase().replace(/\s+/g, '_')}
                                                    </span>
                                                    <span className="text-[10px] text-[#8a8396] block font-bold truncate">{u.displayName}</span>
                                                </div>
                                                {index === selectedSuggestionIndex && (
                                                    <span className="material-symbols-outlined text-[18px] text-[#f5c84b]">check_circle</span>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <span className="material-symbols-outlined text-[32px] text-[#e8e4f0] mb-2">person_search</span>
                                            <p className="text-[10px] text-[#8a8396] font-bold uppercase tracking-wider">No researchers found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-3">
                            {/* Character counter with progress bar */}
                            <div className="flex items-center gap-3">
                                <div className="relative w-20 h-1.5 bg-[#e8e4f0] rounded-full overflow-hidden">
                                    <div
                                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${charCount >= MAX_CHARS ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-[#f5c84b]'
                                            }`}
                                        style={{ width: `${Math.min((charCount / MAX_CHARS) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-medium transition-colors ${charCountColor}`}>
                                    {charCount} / {MAX_CHARS}
                                </span>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={!content.trim() || loading}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${content.trim()
                                    ? 'bg-[#f5c84b] text-[#1f1b2a] hover:bg-[#f4b82a] shadow-md shadow-[#f5c84b]/30 hover:shadow-lg hover:shadow-[#f5c84b]/40 active:scale-95'
                                    : 'bg-[#e8e4f0] text-[#8a8396] cursor-not-allowed'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#1f1b2a] border-t-transparent rounded-full animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Share
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
