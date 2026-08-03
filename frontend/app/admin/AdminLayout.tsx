import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../src/services/admin.service';
import { Toaster } from 'sonner';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE_TIMEOUT = 30 * 1000; // Show warning 30 seconds before timeout

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
    const [timeoutCountdown, setTimeoutCountdown] = useState(30);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Auth Guard & Refresh/Bootstrap Guard
    useEffect(() => {
        const isAdmin = localStorage.getItem('adminAuth');
        if (!isAdmin || !localStorage.getItem('admin_access_token')) {
            adminService.clearAdminSessionAndLogout();
            return;
        }

        // Lightweight session check
        const checkSession = async () => {
            try {
                await adminService.getStats();
            } catch (error) {
                // Error handling is managed by interceptor, but we log here
                console.error('Session check failed', error);
            }
        };

        checkSession();
    }, [navigate]);

    // Sessions are now "Refresh / crash safe" as requested - no aggressive cleanup on unload
    useEffect(() => {
        // We persist through refresh by using localStorage
    }, []);

    // Update last activity on user interaction
    const updateActivity = useCallback(() => {
        setLastActivity(Date.now());
        setShowTimeoutWarning(false);
        // Exclusively use localStorage for activity tracking as requested
        localStorage.setItem('admin_last_active', String(Date.now()));
    }, []);

    // Listen for user activity
    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, updateActivity);
            });
        };
    }, [updateActivity]);

    // Check for inactivity timeout
    useEffect(() => {
        const checkInactivity = () => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivity;

            if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
                // Auto logout using centralized function
                adminService.clearAdminSessionAndLogout('session');
            } else if (timeSinceActivity >= INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT) {
                // Show warning
                setShowTimeoutWarning(true);
                setTimeoutCountdown(Math.ceil((INACTIVITY_TIMEOUT - timeSinceActivity) / 1000));
            }
        };

        const interval = setInterval(checkInactivity, 1000);
        return () => clearInterval(interval);
    }, [lastActivity]);

    // Countdown for warning modal
    useEffect(() => {
        if (!showTimeoutWarning) return;

        const countdown = setInterval(() => {
            setTimeoutCountdown(prev => {
                if (prev <= 1) {
                    adminService.clearAdminSessionAndLogout('session');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdown);
    }, [showTimeoutWarning]);

    const handleStayLoggedIn = () => {
        updateActivity();
        setShowTimeoutWarning(false);
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const navItems = [
        { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/admin/users', icon: 'group', label: 'User Management' },
        { path: '/admin/profile-alerts', icon: 'notifications_active', label: 'Profile Alerts' },
        { path: '/admin/audit-logs', icon: 'history', label: 'Audit Logs' },
    ];

    return (
        <div className="flex h-screen bg-[#faf9f7] overflow-hidden relative">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1f1b2a] border-b border-white/10 z-50 flex items-center justify-between px-4">
                <Link to="/admin/dashboard" className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-white font-black text-sm tracking-tight uppercase">Admin</span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="w-10 h-10 flex items-center justify-center text-white"
                >
                    <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                </button>
            </header>

            {/* Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 h-screen z-[60] lg:z-30 flex-shrink-0
                w-64 bg-[#1f1b2a] text-white flex flex-col transition-transform duration-300
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo Section */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <Link
                        to="/admin/dashboard"
                        className="flex items-center gap-3 group transition-all hover:opacity-90"
                    >
                        <div className="relative">
                            <img
                                src="/logo.png"
                                alt="Research Platform"
                                className="w-10 h-10 object-contain transition-all group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(245,200,75,0.5)]"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-white leading-tight">ADMIN</h1>
                            <p className="text-[9px] font-bold text-[#f5c84b] uppercase tracking-[0.15em]">Control Panel</p>
                        </div>
                    </Link>
                    <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path
                                ? 'bg-[#f5c84b] text-[#1f1b2a] font-black shadow-lg shadow-[#f5c84b]/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-sm font-bold tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </nav>



                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => adminService.clearAdminSessionAndLogout()}
                        className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="text-sm font-bold">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen min-w-0 pt-16 lg:pt-0">
                <main className="flex-1 overflow-hidden">
                    <div className="w-full h-full px-4 sm:px-8 py-4 sm:py-6 overflow-hidden">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Session Timeout Warning Modal */}
            {showTimeoutWarning && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-[#e8e4f0] animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-amber-600 text-4xl">schedule</span>
                            </div>
                            <h3 className="text-2xl font-black text-[#1f1b2a] mb-2">Session Expiring</h3>
                            <p className="text-[#6e6189] mb-6">
                                Your session will expire due to inactivity in:
                            </p>
                            <div className="text-5xl font-black text-amber-600 tabular-nums mb-6">
                                {timeoutCountdown}s
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => adminService.clearAdminSessionAndLogout()}
                                    className="px-4 py-3 bg-[#f3f0f7] text-[#6e6189] font-bold rounded-xl hover:bg-[#e8e4f0] transition"
                                >
                                    Logout Now
                                </button>
                                <button
                                    onClick={handleStayLoggedIn}
                                    className="px-4 py-3 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-xl hover:bg-[#e5b93b] transition shadow-lg"
                                >
                                    Stay Logged In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
