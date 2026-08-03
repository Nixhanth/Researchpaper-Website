import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const adminApi = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json',
    },
});

adminApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Update last activity as requested
        localStorage.setItem('admin_last_active', String(Date.now()));
        return config;
    },
    (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Admin API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message || error.message
        });

        // Treat both 401 (Unauthorized) and 403 (Forbidden) as session/auth errors for admin APIs
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('Auth error (401/403) - triggering centralized logout');
            adminService.clearAdminSessionAndLogout('session');
        }
        return Promise.reject(error);
    }
);

export interface AdminUser {
    id: string;
    email: string;
    status: 'ACTIVE' | 'BLOCKED' | 'BANNED' | 'DELETED' | 'TEMP_BANNED' | 'PERMANENT_BANNED' | 'ACTION_RESTRICTED';
    profileCompleted: boolean;
    createdAt: string;
    blockedUntil?: string;
    profile?: {
        name: string;
        institution: string;
        displayName?: string;
    };
    fullProfile?: UserDetail;
}

export interface UserDetail {
    displayName?: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
    country?: string;
    institution?: string;
    role?: string;
    department?: string;
    researchInterests?: string[];
    followers?: number;
    following?: number;
    profileCompletion?: number;
    contactEmail?: string;
    orcid?: string;
    linkedinUrl?: string;
    scholarUrl?: string;
    lastActive?: string;

    // Extended fields
    currentTitle?: string;
    personalWebsite?: string;
    pubmedAuthorId?: string;
    gender?: string;
    isPublic?: boolean;
    emailDiscovery?: boolean;
    publications?: {
        id: number;
        title: string;
        journal: string;
        year: string;
    }[];
    followersList?: {
        id: string;
        name: string;
        displayName: string;
        institution: string;
        role: string;
        avatarUrl: string;
    }[];
    followingList?: {
        id: string;
        name: string;
        displayName: string;
        institution: string;
        role: string;
        avatarUrl: string;
    }[];
    adminStats?: {
        totalActions: number;
        warningsCount: number;
        lastAction: string;
        accountStatus: string;
        totalStats?: AdminStats;
    };
}

export interface AuditLog {
    id: string;
    adminUsername: string;
    actionType: string;
    targetUserId: string;
    targetUserEmail?: string;
    reason: string;
    blockDurationDays?: number;
    createdAt: string;
    success: boolean;
    ipAddress?: string;
}

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    bannedUsers: number;
}

export const adminService = {
    clearAdminSessionAndLogout: (reason?: string) => {
        try {
            // Optional: Call server logout if needed
            // await adminApi.post('/api/admin/logout');
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            // 1. Clear SPECIFIC admin-related localStorage (MANDATORY isolation)
            const adminLocalKeys = [
                'admin_access_token',
                'admin_last_active',
                'adminLoginTime',
                'adminAuth',
                'adminLoginAttempts',
                'adminLockoutUntil'
            ];
            adminLocalKeys.forEach(key => localStorage.removeItem(key));

            // 2. Clear SPECIFIC admin-related sessionStorage (legacy/redundant)
            const adminSessionKeys = [
                'adminToken',
                'adminLoginTime',
                'adminLastActivity',
                'adminAuth'
            ];
            adminSessionKeys.forEach(key => sessionStorage.removeItem(key));

            // 3. Reset any admin-specific caches/state
            // (In a real app, this might involve clearing a Redux store or React Query cache)

            // 4. Force redirect to admin login
            if (!window.location.pathname.includes('/admin/login')) {
                const redirectUrl = reason
                    ? `/admin/login?expired=true&reason=${reason}`
                    : '/admin/login';
                window.location.href = redirectUrl;
            }
        }
    },

    login: async (credentials: { username: string; password: string }) => {
        // Clear ONLY admin-related session data BEFORE attempting login to ensure fresh session
        const adminSessionKeys = [
            'adminToken',
            'adminLoginTime',
            'adminLastActivity',
            'adminAuth'
        ];
        adminSessionKeys.forEach(key => sessionStorage.removeItem(key));

        const response = await adminApi.post('/api/admin/login', credentials);
        if (response.data.token) {
            // EXCLUSIVELY use localStorage for admin tokens as requested for refresh-safety
            localStorage.setItem('admin_access_token', response.data.token);
            localStorage.setItem('adminLoginTime', new Date().toISOString());
            localStorage.setItem('admin_last_active', String(Date.now()));
            localStorage.setItem('adminAuth', 'true'); // Flag for guard checks
        }
        return response.data;
    },

    getStats: async (): Promise<AdminStats> => {
        const response = await adminApi.get('/api/admin/stats');
        return response.data;
    },

    getUsers: async (query?: string, status?: string, role?: string, page = 0, size = 10) => {
        const params: Record<string, any> = { page, size };
        if (query) params.query = query;
        if (status && status !== 'ALL') params.status = status;
        if (role && role !== 'All Roles') params.role = role;

        const response = await adminApi.get('/api/admin/users', { params });
        return response.data;
    },

    getUserDetail: async (userId: string): Promise<UserDetail> => {
        try {
            const response = await adminApi.get(`/api/admin/users/${userId}/detail`);
            return response.data;
        } catch (error) {
            // Return empty object if endpoint doesn't exist yet
            console.warn('User detail endpoint not available');
            return {};
        }
    },

    blockUser: async (userId: string, days: number, reason: string, key: string) => {
        return adminApi.post(`/api/admin/users/${userId}/block`, { days, reason, key });
    },

    unblockUser: async (userId: string, reason: string, key: string) => {
        return adminApi.post(`/api/admin/users/${userId}/unblock`, { reason, key });
    },

    banUser: async (userId: string, reason: string, key: string) => {
        return adminApi.post(`/api/admin/users/${userId}/ban`, { reason, key });
    },

    deleteUser: async (userId: string, reason: string, key: string) => {
        return adminApi.delete(`/api/admin/users/${userId}`, { data: { reason, key } });
    },

    // Audit log methods
    getAuditLogs: async (page = 0, size = 20): Promise<{ content: AuditLog[]; totalPages: number; totalElements: number }> => {
        try {
            const response = await adminApi.get('/api/admin/audit-logs', { params: { page, size } });
            return response.data;
        } catch (error) {
            console.warn('Audit logs endpoint not available');
            return { content: [], totalPages: 0, totalElements: 0 };
        }
    },

    // Send notification to user
    sendNotification: async (userId: string, type: string, message: string) => {
        return adminApi.post(`/api/admin/users/${userId}/notify`, { type, message });
    },

    // Send email reminder
    sendEmailReminder: async (userId: string, templateType: 'profile_incomplete' | 'institution_missing' | 'custom', customMessage?: string) => {
        return adminApi.post(`/api/admin/users/${userId}/email-reminder`, { templateType, customMessage });
    },

    // Validate encryption key (client-side for now, should be server-side in production)
    validateEncryptionKey: (key: string): boolean => {
        return key.length > 0;
    },

    // Check if admin is authenticated
    isAuthenticated: (): boolean => {
        const token = localStorage.getItem('admin_access_token');
        return !!token;
    },

    // Get session info
    getSessionInfo: () => {
        return {
            loginTime: localStorage.getItem('adminLoginTime'),
            lastActivity: localStorage.getItem('admin_last_active'),
            isActive: adminService.isAuthenticated()
        };
    },

    // Profile Completion Alerts
    getProfileCompletionStats: async () => {
        const response = await adminApi.get('/api/admin/profile-completion/stats');
        return response.data;
    },

    getUsersByProfileCompletion: async (minCompletion: number, maxCompletion: number, role?: string, status?: string, page = 0, size = 10) => {
        const params: any = { minCompletion, maxCompletion, page, size };
        if (role) params.role = role;
        if (status) params.status = status;
        const response = await adminApi.get('/api/admin/profile-completion/users', { params });
        return response.data;
    },

    sendBulkProfileCompletionEmail: async (userIds: string[], subject: string, body: string) => {
        const response = await adminApi.post('/api/admin/profile-completion/send-bulk-email', {
            userIds,
            subject,
            body
        });
        return response.data;
    },

    // ============ SESSION MANAGEMENT ============

    getActiveSessions: async (): Promise<AdminSession[]> => {
        const response = await adminApi.get('/api/admin/sessions');
        return response.data;
    },

    invalidateSession: async (sessionId: string): Promise<void> => {
        await adminApi.delete(`/api/admin/sessions/${sessionId}`);
    },

    invalidateAllOtherSessions: async (): Promise<{ message: string }> => {
        const response = await adminApi.delete('/api/admin/sessions/all-except-current');
        return response.data;
    }
};

// Session interface for type safety
export interface AdminSession {
    id: string;
    browser: string;
    ipAddress: string;
    deviceInfo: string;
    lastActiveAt: string;
    createdAt: string;
    isCurrent: boolean;
}
