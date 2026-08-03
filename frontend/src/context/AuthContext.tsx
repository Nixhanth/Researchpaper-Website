import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    authProvider: string;
    profileCompleted: boolean;
    onboardingStep: number;
    roles: string[];
    hasPassword: boolean;
    displayName: string;
    profileCompletion: number;
    verificationStatus: Record<string, string>;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    profileCompleted: boolean;
    onboardingStep: number;
    hasPassword: boolean;
    isNewSignup: boolean;
    setIsNewSignup: (val: boolean) => void;
    sessionToken: string | null;
    setSessionToken: (val: string | null) => void;
    // For profile completion alert
    dismissAlert: () => void;
    alertDismissed: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Initial State strictly as requested
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(() => {
        const t = localStorage.getItem('user_access_token');
        return (t && t !== 'null' && t !== 'undefined') ? t : null;
    });
    const [sessionToken, setSessionToken] = useState<string | null>(() => {
        return sessionStorage.getItem('onboarding_session_token');
    });
    const [isNewSignup, setIsNewSignup] = useState(false);
    const [alertDismissed, setAlertDismissed] = useState(() => {
        return sessionStorage.getItem('profile_alert_dismissed') === 'true';
    });

    const fetchCurrentUser = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/users/me');

            if (response.data) {
                const roles = response.data.roles || ['ROLE_USER'];
                const isOnboarding = roles.includes('ROLE_ONBOARDING');

                setUser({
                    id: response.data.id,
                    email: response.data.email,
                    fullName: response.data.fullName || 'Researcher',
                    avatarUrl: response.data.avatarUrl,
                    authProvider: response.data.authProvider,
                    profileCompleted: response.data.profileCompleted,
                    onboardingStep: response.data.onboardingStep,
                    roles: roles,
                    hasPassword: response.data.hasPassword || false,
                    displayName: response.data.displayName || '',
                    profileCompletion: response.data.profileCompletion || 0,
                    verificationStatus: response.data.verificationStatus || {}
                });

                // If we are in onboarding session, ensure sessionToken is in state
                if (isOnboarding && !sessionToken) {
                    const st = sessionStorage.getItem('onboarding_session_token');
                    if (st) setSessionToken(st);
                }
            } else {
                throw new Error("Invalid user data");
            }
        } catch (error) {
            console.error('Auth state validation failed:', error);
            setUser(null);
            localStorage.removeItem('user_access_token');
            setToken(null);
            // Don't clear sessionToken here as it might be needed for the onboarding wizard
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Check URL for OAuth token or session token
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const sessionTokenFromUrl = urlParams.get('session_token');

        if (tokenFromUrl && tokenFromUrl !== 'null' && tokenFromUrl !== 'undefined') {
            localStorage.setItem('user_access_token', tokenFromUrl);
            setToken(tokenFromUrl);
            // If we have a real token, we likely finished onboarding or logged in
            sessionStorage.removeItem('onboarding_session_token');
            setSessionToken(null);

            window.history.replaceState({}, document.title, window.location.pathname);
            fetchCurrentUser();
            return;
        }

        if (sessionTokenFromUrl && sessionTokenFromUrl !== 'null' && sessionTokenFromUrl !== 'undefined') {
            sessionStorage.setItem('onboarding_session_token', sessionTokenFromUrl);
            setSessionToken(sessionTokenFromUrl);
            localStorage.removeItem('user_access_token');
            setToken(null);

            window.history.replaceState({}, document.title, window.location.pathname);
            fetchCurrentUser();
            return;
        }

        // 2. Otherwise use storage token if valid
        if (token || sessionToken) {
            fetchCurrentUser();
        } else {
            setLoading(false);
        }
    }, [token, sessionToken]);

    const login = async (newToken: string) => {
        if (newToken) {
            localStorage.setItem('user_access_token', newToken);
            setToken(newToken);
            sessionStorage.removeItem('profile_alert_dismissed');
            setAlertDismissed(false);
            await fetchCurrentUser();
        }
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout failed on server', error);
        } finally {
            localStorage.removeItem('user_access_token');
            setToken(null);
            setUser(null);
            sessionStorage.removeItem('profile_alert_dismissed');
            setAlertDismissed(false);
        }
    };

    const isAuthenticated = user !== null;
    const profileCompleted = user?.profileCompleted === true;

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            isAuthenticated,
            profileCompleted,
            onboardingStep: user?.onboardingStep || 1,
            hasPassword: user?.hasPassword || false,
            isNewSignup,
            setIsNewSignup,
            sessionToken,
            setSessionToken,
            dismissAlert: () => {
                sessionStorage.setItem('profile_alert_dismissed', 'true');
                setAlertDismissed(true);
            },
            alertDismissed
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
