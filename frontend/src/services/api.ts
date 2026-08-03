import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('user_access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add session token for onboarding flow
        const sessionToken = sessionStorage.getItem('onboarding_session_token');
        if (sessionToken) {
            config.headers['X-Session-Token'] = sessionToken;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle account blocks and token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const errorData = error.response?.data;

        // Handle ACCOUNT_BLOCKED responses (403 with specific error code)
        if (status === 403 && errorData?.error === 'ACCOUNT_BLOCKED') {
            console.error('[API] Account blocked detected:', errorData);

            // Clear all auth tokens
            localStorage.removeItem('user_access_token');
            sessionStorage.removeItem('onboarding_session_token');
            sessionStorage.removeItem('pending_registration');

            // Store the block info for the suspension page
            sessionStorage.setItem('account_block_info', JSON.stringify({
                status: errorData.status,
                message: errorData.message,
                blockedUntil: errorData.blockedUntil
            }));

            // Prevent redirect loop
            if (!window.location.pathname.includes('/account-')) {
                // Redirect based on ban type
                const accountStatus = errorData.status;
                if (accountStatus === 'BANNED' || accountStatus === 'PERMANENT_BANNED' || accountStatus === 'DELETED') {
                    window.location.href = '/account-disabled';
                } else {
                    window.location.href = '/account-suspended';
                }
            }

            // Return a specific error so components can handle it
            return Promise.reject({ ...error, isAccountBlocked: true });
        }

        // Handle regular 401 errors (token expiration)
        if (status === 401) {
            localStorage.removeItem('user_access_token');
            // Only redirect to login if not already there and not on public pages
            const publicPaths = ['/', '/login', '/signup', '/browse', '/forgot-password', '/verify-otp'];
            if (!publicPaths.some(p => window.location.pathname === p)) {
                window.location.href = '/login?expired=true';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
