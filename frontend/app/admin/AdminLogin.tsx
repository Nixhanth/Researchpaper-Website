import React, { useState, useEffect } from 'react';
import { adminService } from '../../src/services/admin.service';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Rate limiting state
    const [attempts, setAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);

    // Check for session expiry
    useEffect(() => {
        const expired = searchParams.get('expired');
        const reason = searchParams.get('reason');

        if (expired) {
            if (reason === 'session') {
                toast.error('Your admin session expired or was invalidated. Please log in again.');
            } else {
                toast.error('Your admin session has expired. Please log in again.');
            }
            // Clean up URL
            window.history.replaceState({}, '', '/admin/login');
        }
    }, [searchParams]);

    // Load lockout state from storage
    useEffect(() => {
        const storedAttempts = localStorage.getItem('adminLoginAttempts');
        const storedLockout = localStorage.getItem('adminLockoutUntil');

        if (storedAttempts) setAttempts(parseInt(storedAttempts));
        if (storedLockout) {
            const lockout = parseInt(storedLockout);
            if (lockout > Date.now()) {
                setLockoutUntil(lockout);
            } else {
                localStorage.removeItem('adminLockoutUntil');
                localStorage.removeItem('adminLoginAttempts');
            }
        }
    }, []);

    // Countdown timer for lockout
    useEffect(() => {
        if (!lockoutUntil) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            setLockoutRemaining(remaining);

            if (remaining <= 0) {
                setLockoutUntil(null);
                setAttempts(0);
                localStorage.removeItem('adminLockoutUntil');
                localStorage.removeItem('adminLoginAttempts');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lockoutUntil]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if locked out
        if (lockoutUntil && lockoutUntil > Date.now()) {
            toast.error(`Too many attempts. Please wait ${Math.ceil((lockoutUntil - Date.now()) / 1000)} seconds.`);
            return;
        }

        setLoading(true);
        try {
            await adminService.login(credentials);
            // Reset attempts on success
            localStorage.removeItem('adminLoginAttempts');
            localStorage.removeItem('adminLockoutUntil');
            toast.success('Access granted');
            navigate('/admin/dashboard');
        } catch (error: any) {
            console.error(error);

            // Increment attempts
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            localStorage.setItem('adminLoginAttempts', String(newAttempts));

            // Check for lockout (5 attempts = 10 min cooldown)
            if (newAttempts >= 5) {
                const lockout = Date.now() + 10 * 60 * 1000; // 10 minutes
                setLockoutUntil(lockout);
                localStorage.setItem('adminLockoutUntil', String(lockout));
                toast.error('Too many failed attempts. Locked for 10 minutes.');
            } else {
                // Generic error message - no hints
                toast.error('Invalid credentials');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatLockoutTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isLocked = lockoutUntil && lockoutUntil > Date.now();

    return (
        <div className="min-h-screen bg-[#1f1b2a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#f5c84b]" />

                {/* Logo Section */}
                <div className="mb-6 text-center">
                    <div
                        className="inline-flex items-center gap-3 cursor-pointer group transition-all hover:scale-105"
                        onClick={() => navigate('/admin/login')}
                    >
                        <div className="relative">
                            <img
                                src="/logo.png"
                                alt="Research Platform"
                                className="w-14 h-14 object-contain transition-all group-hover:drop-shadow-[0_0_8px_rgba(245,200,75,0.6)]"
                            />
                            {/* Shield overlay for admin */}

                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-black text-[#1f1b2a] tracking-tight leading-tight">References</h2>
                            <p className="text-[10px] font-bold text-[#f5c84b] uppercase tracking-widest">Research Platform</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-[#1f1b2a] rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#f5c84b]">
                        <span className="material-symbols-outlined text-[#f5c84b] text-3xl">shield_person</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#1f1b2a] tracking-tight text-center">Admin Access</h1>
                    <p className="text-sm text-[#8a8396] font-medium mt-1 text-center">Secure Platform Management</p>
                </div>

                {isLocked && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                        <span className="material-symbols-outlined text-rose-500 text-2xl mb-2">lock_clock</span>
                        <p className="text-sm font-bold text-rose-700">Access Temporarily Locked</p>
                        <p className="text-2xl font-black text-rose-600 tabular-nums mt-1">
                            {formatLockoutTime(lockoutRemaining)}
                        </p>
                        <p className="text-xs text-rose-500 mt-1">Too many failed attempts</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-[#8a8396] uppercase tracking-widest mb-2">Username</label>
                        <input
                            type="text"
                            className="w-full h-12 px-4 rounded-xl bg-[#faf9f7] border border-[#e8e4f0] hover:border-[#f5c84b]/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/30 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            value={credentials.username}
                            onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                            required
                            disabled={isLocked || loading}
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-[#8a8396] uppercase tracking-widest mb-2">Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full h-12 px-4 pr-12 rounded-xl bg-[#faf9f7] border border-[#e8e4f0] hover:border-[#f5c84b]/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/30 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                value={credentials.password}
                                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                required
                                disabled={isLocked || loading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 inset-y-0 w-8 flex items-center justify-center text-[#8a8396] hover:text-[#f5c84b]"
                                tabIndex={-1}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {attempts > 0 && attempts < 5 && !isLocked && (
                        <p className="text-xs text-amber-600 font-medium text-center">
                            {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining before lockout
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || isLocked}
                        className="w-full h-12 bg-[#1f1b2a] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#322d42] transition-all shadow-lg shadow-[#1f1b2a]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : isLocked ? (
                            <>
                                <span className="material-symbols-outlined text-lg">lock</span>
                                <span>Locked</span>
                            </>
                        ) : (
                            'Enter Console'
                        )}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default AdminLogin;
