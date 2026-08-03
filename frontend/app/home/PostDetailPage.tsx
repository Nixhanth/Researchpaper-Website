import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import postService, { Post } from '../../src/services/post.service';
import PostCard from '../../src/components/PostCard';
import PageTitle from '../../src/components/PageTitle';

const PostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;
            try {
                setLoading(true);
                const data = await postService.getPostById(postId);
                setPost(data);
            } catch (error) {
                console.error("Failed to fetch post", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-[#8a8396]">Loading post...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-20 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">error</span>
                <h2 className="text-xl font-bold text-[#1f1b2a]">Post not found</h2>
                <p className="text-[#8a8396] text-sm mt-2 mb-6">The post you're looking for might have been deleted or moved.</p>
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-2 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-lg hover:bg-[#f4b82a] transition"
                >
                    Return Home
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageTitle title="Post Details" />
            <div className="mb-6 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#6e6189] hover:bg-white hover:text-[#1f1b2a] border border-transparent hover:border-[#e8e4f0] transition shadow-sm"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-[#1f1b2a]">Post</h1>
            </div>

            <PostCard post={post} />

            <div className="mt-8 text-center text-xs text-[#8a8396]">
                Viewing individual research post
            </div>
        </div>
    );
};

export default PostDetailPage;
