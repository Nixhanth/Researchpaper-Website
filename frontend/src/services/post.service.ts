import api from './api';
import { UserSummary } from './follow.service';

export interface Comment {
    id: number;
    postId: number;
    user: UserSummary;
    content: string;
    createdAt: string;
    mentionedUsernames?: string[];
}

export interface Post {
    id: number;
    content: string;
    author: UserSummary;
    createdAt: string;
    isLiked: boolean;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    mentionedUsernames?: string[];
}

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
    cursor?: number | null; // For cursor-based pagination
}

const postService = {
    createPost: async (content: string) => {
        return api.post<Post>('/api/v1/posts', { content }).then(res => res.data);
    },
    getPostById: async (postId: string | number) => {
        return api.get<Post>(`/api/v1/posts/${postId}`).then(res => res.data);
    },
    getFeed: async (page = 0, size = 20) => {
        return api.get<Page<Post>>(`/api/v1/feed?page=${page}&size=${size}`).then(res => res.data);
    },
    getFeedWithCursor: async (cursor: number | null = null, limit = 25) => {
        const params = cursor ? `cursor=${cursor}&limit=${limit}` : `limit=${limit}`;
        return api.get<Page<Post>>(`/api/v1/feed?${params}`).then(res => res.data);
    },
    getUserPosts: async (userId: string, page = 0, size = 20) => {
        return api.get<Page<Post>>(`/api/v1/users/${userId}/posts?page=${page}&size=${size}`).then(res => res.data);
    },
    addComment: async (postId: number, content: string) => {
        return api.post<Comment>(`/api/v1/posts/${postId}/comments`, { content }).then(res => res.data);
    },
    getComments: async (postId: number) => {
        return api.get<Comment[]>(`/api/v1/posts/${postId}/comments`).then(res => res.data);
    },
    updateComment: async (commentId: number, content: string) => {
        return api.put<Comment>(`/api/v1/comments/${commentId}`, { content }).then(res => res.data);
    },
    deleteComment: async (commentId: number) => {
        return api.delete(`/api/v1/comments/${commentId}`);
    },
    sharePost: async (postId: number) => {
        return api.post(`/api/v1/posts/${postId}/share`);
    },
    likePost: async (postId: number) => {
        return api.post(`/api/v1/posts/${postId}/like`);
    },
    unlikePost: async (postId: number) => {
        return api.delete(`/api/v1/posts/${postId}/like`);
    },
    deletePost: async (postId: number) => {
        return api.delete(`/api/v1/posts/${postId}`);
    }
};

export default postService;
