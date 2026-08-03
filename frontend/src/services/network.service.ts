import api from './api';
import { UserSummary } from './follow.service';
import { Page } from './post.service';

const networkService = {
    searchResearchers: async (options: {
        query?: string;
        department?: string;
        institution?: string;
        domain?: string;
        expertise?: string;
        country?: string;
        page?: number;
        size?: number;
    }) => {
        const { query, department, institution, domain, expertise, country, page = 0, size = 20 } = options;
        let url = `/api/v1/network/search?page=${page}&size=${size}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        if (department) url += `&department=${encodeURIComponent(department)}`;
        if (institution) url += `&institution=${encodeURIComponent(institution)}`;
        if (domain) url += `&domain=${encodeURIComponent(domain)}`;
        if (expertise) url += `&expertise=${encodeURIComponent(expertise)}`;
        if (country) url += `&country=${encodeURIComponent(country)}`;

        return api.get<Page<UserSummary>>(url).then(res => res.data);
    },

    getSuggestions: async (limit = 10) => {
        return api.get<UserSummary[]>(`/api/v1/network/suggestions?limit=${limit}`).then(res => res.data);
    },

    getMentions: async (query: string, limit = 10) => {
        return api.get<UserSummary[]>(`/api/v1/network/mentions?query=${encodeURIComponent(query)}&limit=${limit}`).then(res => res.data);
    },

    discoverResearchers: async (page = 0, size = 20) => {
        return api.get<Page<UserSummary>>(`/api/v1/network/search?page=${page}&size=${size}`).then(res => res.data);
    },

    getFollowing: async (userId: string, page = 0, size = 20) => {
        return api.get<Page<any>>(`/api/v1/users/${userId}/following?page=${page}&size=${size}`).then(res => res.data);
    },

    getFollowers: async (userId: string, page = 0, size = 20) => {
        return api.get<Page<any>>(`/api/v1/users/${userId}/followers?page=${page}&size=${size}`).then(res => res.data);
    },

    followUser: async (userId: string) => {
        return api.post(`/api/v1/users/${userId}/follow`);
    },

    unfollowUser: async (userId: string) => {
        return api.delete(`/api/v1/users/${userId}/follow`);
    },

    isFollowing: async (userId: string) => {
        return api.get<boolean>(`/api/v1/users/${userId}/is-following`).then(res => res.data);
    }
};

export default networkService;
