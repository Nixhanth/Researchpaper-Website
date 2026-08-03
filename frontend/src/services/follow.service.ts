import api from './api';

export interface FollowStats {
    followersCount: number;
    followingCount: number;
}

export interface UserSummary {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string;
    institution: string;
    department: string;
    bio: string;
    country: string;
    gender: string;
}

const followService = {
    followUser: async (userId: string) => {
        return api.post<{ status: string }>(`/api/v1/follow/${userId}`).then(res => res.data);
    },
    unfollowUser: async (userId: string) => {
        return api.delete(`/api/v1/unfollow/${userId}`);
    },
    removeFollower: async (userId: string) => {
        return api.delete(`/api/v1/follower/${userId}`);
    },
    cancelRequest: async (userId: string) => {
        return api.post(`/api/v1/follow/cancel/${userId}`);
    },
    acceptRequest: async (requestId: number) => {
        return api.post(`/api/v1/follow/request/${requestId}/accept`);
    },
    rejectRequest: async (requestId: number) => {
        return api.post(`/api/v1/follow/request/${requestId}/reject`);
    },
    getStats: async (userId: string) => {
        return api.get<FollowStats>(`/api/v1/users/${userId}/follow-stats`).then(res => res.data);
    },
    checkIsFollowing: async (userId: string) => {
        return api.get<{ isFollowing: boolean }>(`/api/v1/users/${userId}/is-following`).then(res => res.data.isFollowing);
    },
    getRelationshipStatus: async (userId: string) => {
        return api.get<{ status: string }>(`/api/v1/users/${userId}/relationship`).then(res => res.data.status);
    },
    getFollowers: async (userId: string) => {
        return api.get<UserSummary[]>(`/api/v1/users/${userId}/followers`).then(res => res.data);
    },
    getFollowing: async (userId: string) => {
        return api.get<UserSummary[]>(`/api/v1/users/${userId}/following`).then(res => res.data);
    },
    getSentRequests: async (userId: string) => {
        return api.get<UserSummary[]>(`/api/v1/users/${userId}/sent-requests`).then(res => res.data);
    }
};

export default followService;
