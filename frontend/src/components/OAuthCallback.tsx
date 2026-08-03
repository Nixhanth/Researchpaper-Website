import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface OAuthCallbackProps {
    onFinish: () => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onFinish }) => {
    const { login, loading, isAuthenticated, sessionToken: activeSessionToken } = useAuth();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const sessionTokenFromUrl = urlParams.get('session_token');

        if (token) {
            login(token).then(() => {
                onFinish();
            });
        } else if (sessionTokenFromUrl) {
            // Wait for AuthContext to pick up the session_token and finish loading
            if (!loading && (isAuthenticated || activeSessionToken)) {
                onFinish();
            }
        } else {
            // If No URL params, check if we already have them in state/storage
            if (!loading) {
                const st = sessionStorage.getItem('onboarding_session_token');
                const lt = localStorage.getItem('user_access_token');
                if (st || lt || isAuthenticated || activeSessionToken) {
                    onFinish();
                } else {
                    console.error('No token found in OAuth context or URL');
                    onFinish();
                }
            }
        }
    }, [login, onFinish, loading, isAuthenticated, activeSessionToken]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#faf9f7]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-slate-600 font-medium">Completing login...</p>
            </div>
        </div>
    );
};

export default OAuthCallback;
