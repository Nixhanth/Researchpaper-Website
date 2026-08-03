import api from './api';

export interface Profile {
    userId?: string;
    name?: string;
    displayName?: string;
    title: string;
    institution: string;
    country?: string;
    role?: string;
    department?: string;
    bio: string;
    interests: string[];
    socialLinks: Record<string, string>;
    stats: Record<string, number>;
    isPublic?: boolean;
    emailDiscovery?: boolean;
    avatarUrl?: string;
    pubmedAuthorId?: string;
    pubmedLastSync?: string;
    verificationStatus?: Record<string, string>;
    notifCitations?: boolean;
    notifProfileViews?: boolean;
    notifNewPublications?: boolean;
    notifNetworkUpdates?: boolean;
    notifNewFollowers?: boolean;
    notifMentions?: boolean;
    // Granular Notification Controls (New)
    notifCitationInApp?: boolean;
    notifCitationEmail?: boolean;
    notifPublicationInApp?: boolean;
    notifPublicationEmail?: boolean;
    notifRecommendationInApp?: boolean;
    notifRecommendationEmail?: boolean;

    notifFollowerInApp?: boolean;
    notifFollowerEmail?: boolean;
    notifMentionInApp?: boolean;
    notifMentionEmail?: boolean;
    notifProfileViewInApp?: boolean;
    notifProfileViewEmail?: boolean;

    notifSecurityEmail?: boolean;
    notifSystemEmail?: boolean;

    emailDigest?: string;
    pushEnabled?: boolean;
    emailMarketing?: boolean;
}

const profileService = {
    getMyProfile: async () => {
        const response = await api.get<Profile>('/api/v1/profiles/me');
        return response.data;
    },

    updateMyProfile: async (profile: Partial<Profile>) => {
        const response = await api.put<Profile>('/api/v1/profiles/me', profile);
        return response.data;
    },

    getProfile: async (userId: string) => {
        const response = await api.get<Profile>(`/api/v1/profiles/${userId}`);
        return response.data;
    },

    getProfileByUsername: async (username: string) => {
        const response = await api.get<Profile>(`/api/v1/profiles/by-username/${username}`);
        return response.data;
    },

    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ avatarUrl: string }>('/api/v1/profiles/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteAvatar: async () => {
        return api.delete('/api/v1/profiles/avatar');
    },

    publicSearch: async (params: { query?: string, department?: string, institution?: string, domain?: string, expertise?: string, country?: string, page?: number, size?: number }) => {
        const response = await api.get('/api/v1/profiles/public/search', { params });
        return response.data;
    },

    requestEmailOtp: async (email: string) => {
        return await api.post('/api/v1/profiles/verify-contact-email/request', null, { params: { email } });
    },

    verifyEmailOtp: async (otp: string) => {
        return await api.post('/api/v1/profiles/verify-contact-email/confirm', null, { params: { otp } });
    }
};

export default profileService;
