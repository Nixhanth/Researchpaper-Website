import React, { useState, useEffect } from 'react';
import { adminService, AuditLog, AdminSession } from '../../src/services/admin.service';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        bannedUsers: 0
    });
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [activeSessions, setActiveSessions] = useState<AdminSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionInfo, setSessionInfo] = useState({
        loginTime: new Date().toISOString(),
        lastAction: 'Dashboard loaded'
    });
    const navigate = useNavigate();

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, logsData, sessionsData] = await Promise.all([
                adminService.getStats(),
                adminService.getAuditLogs(0, 8),
                adminService.getActiveSessions()
            ]);
            // Filter sessions to only show activity from last 24 hours
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const filteredSessions = sessionsData.filter(s => {
                const activityTime = new Date(s.lastActiveAt).getTime();
                return (now - activityTime) <= oneDayMs;
            });

            setStats(statsData);
            setRecentLogs(logsData.content);
            setActiveSessions(filteredSessions);
            setSessionInfo(prev => ({ ...prev, lastAction: 'Stats refreshed' }));
        } catch (err: any) {
            console.error('Failed to fetch stats', err);
            setError('Failed to load dashboard data');
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Store session start time
        const loginTime = localStorage.getItem('adminLoginTime') || new Date().toISOString();
        if (!localStorage.getItem('adminLoginTime')) {
            localStorage.setItem('adminLoginTime', loginTime);
        }
        setSessionInfo(prev => ({ ...prev, loginTime }));
    }, []);

    const cards = [
        { label: 'Total Users', value: stats.totalUsers, icon: 'group', color: 'bg-indigo-500', status: null },
        { label: 'Active Users', value: stats.activeUsers, icon: 'check_circle', color: 'bg-emerald-500', status: 'ACTIVE' },
        { label: 'Blocked Users', value: stats.blockedUsers, icon: 'block', color: 'bg-amber-500', status: 'BLOCKED' },
        { label: 'Banned Users', value: stats.bannedUsers, icon: 'gavel', color: 'bg-rose-500', status: 'BANNED' }
    ];

    const formatTimeAgo = (isoString: string) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} h ago`;
        return new Date(isoString).toLocaleDateString();
    };

    const getActionColor = (type: string) => {
        switch (type) {
            case 'BLOCK': return 'text-amber-600 bg-amber-50';
            case 'UNBLOCK': return 'text-emerald-600 bg-emerald-50';
            case 'BAN': return 'text-rose-600 bg-rose-50';
            case 'DELETE': return 'text-gray-600 bg-gray-100';
            default: return 'text-indigo-600 bg-indigo-50';
        }
    };

    return (
        <div className="space-y-6 sm:space-y-7 h-full flex flex-col overflow-y-auto lg:overflow-hidden custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1f1b2a] tracking-tight">System Dashboard</h1>
                    <p className="text-[#8a8396] text-sm font-medium">Platform-wide overview and metrics.</p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e8e4f0] rounded-xl text-sm font-bold text-[#6e6189] hover:bg-[#faf9f7] transition disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    Refresh
                </button>
            </div>

            {/* Error state with retry */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-rose-500">error</span>
                        <span className="font-medium text-rose-700">{error}</span>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="w-full sm:w-auto px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Stats Cards - Compact Mode */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((stat, i) => (
                    <div
                        key={i}
                        onClick={() => navigate(stat.status ? `/admin/users?status=${stat.status}` : '/admin/users')}
                        className="bg-white p-4 rounded-3xl border border-[#e8e4f0] shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group cursor-pointer active:scale-95"
                    >
                        <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 ${stat.color}`}>
                            <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-[#8a8396] uppercase tracking-[0.15em] mb-0.5">{stat.label}</p>
                            <p className="text-2xl font-black text-[#1f1b2a] tracking-tight leading-none">
                                {loading ? (
                                    <span className="inline-block w-8 h-6 bg-gray-100 animate-pulse rounded" />
                                ) : (
                                    stat.value
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-0 flex-1">
                {/* Recent Activity (WIDE - 65%) */}
                <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-[2.5rem] border border-[#e8e4f0] shadow-sm flex flex-col min-h-0 overflow-hidden relative">
                    <div className="flex items-center justify-between mb-5 px-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500 text-lg">analytics</span>
                            <h3 className="text-md font-black text-[#1f1b2a] uppercase tracking-wider">Recent Activity</h3>
                        </div>
                        <button
                            onClick={() => navigate('/admin/audit-logs')}
                            className="text-[10px] font-black uppercase tracking-widest text-[#8a8396] hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg"
                        >
                            View All History
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mx-1">
                        {recentLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-[#8a8396] bg-[#faf9f7] rounded-3xl border border-dashed border-[#e8e4f0] m-1">
                                <span className="material-symbols-outlined text-3xl mb-2 opacity-50">history_toggle_off</span>
                                <p className="text-xs font-bold uppercase tracking-widest">No recent protocols found</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentLogs.map((log, index) => (
                                    <div key={log.id} className={`flex items-center gap-4 p-3 rounded-2xl hover:bg-[#faf9f7] transition group ${index !== recentLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getActionColor(log.actionType)} transition-transform group-hover:scale-105`}>
                                            <span className="material-symbols-outlined text-lg">
                                                {log.actionType === 'BLOCK' ? 'block' :
                                                    log.actionType === 'BAN' ? 'gavel' :
                                                        log.actionType === 'DELETE' ? 'delete' :
                                                            log.actionType === 'UNBLOCK' ? 'check_circle' : 'info'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-[#1f1b2a] truncate">
                                                    {log.actionType} <span className="text-[#8a8396] font-medium mx-1">on</span> {log.targetUserEmail || log.targetUserId.substring(0, 8)}
                                                </p>
                                                <p className="text-[11px] text-[#6e6189] font-medium truncate opacity-70">
                                                    {log.reason}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <span className="text-[10px] font-black text-[#8a8396] uppercase bg-gray-100 px-2 py-1 rounded-md tracking-tighter">
                                                    {formatTimeAgo(log.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Security Status (35%) */}
                <div className="lg:col-span-4 bg-[#1f1b2a] p-6 sm:p-7 rounded-[2.5rem] text-white shadow-xl flex flex-col overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#f5c84b]/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                    <div className="relative z-10 flex-shrink-0">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 text-[#f5c84b]">
                                <span className="material-symbols-outlined filled text-xl">verified_user</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Security</span>
                            </div>
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                                Live
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">System Secure</h2>
                        <div className="flex flex-col gap-1 mt-2">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                Protocol Activity (24h)
                            </p>
                            <p className="text-white text-xs font-bold">
                                {activeSessions.length} active admin {activeSessions.length === 1 ? 'session' : 'sessions'} detected.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8 flex-1 overflow-hidden flex flex-col relative z-10">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Activity</h3>
                            <button
                                onClick={() => navigate('/admin/audit-logs')}
                                className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Security Logs
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-3 space-y-3">
                            {activeSessions.length === 0 ? (
                                <div className="text-center py-8 opacity-50">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">No active sessions</p>
                                </div>
                            ) : (
                                // Group and limit sessions to avoid clutter
                                Array.from(new Map(activeSessions.map(s => [`${s.browser}-${s.ipAddress}`, s])).values())
                                    .slice(0, 4) // Show only top 4 unique session contexts
                                    .map((session) => (
                                        <div
                                            key={session.id}
                                            className={`p-3 rounded-xl border transition-all duration-300 group ${session.isCurrent
                                                ? 'bg-indigo-500/10 border-indigo-500/20'
                                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${session.isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-lg">
                                                            {session.deviceInfo.toLowerCase().includes('mobile') ? 'smartphone' : 'desktop_windows'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-white truncate max-w-[120px]">
                                                            {session.browser === 'Unknown' ? 'Admin Console' : session.browser}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">
                                                            {session.ipAddress === '0:0:0:0:0:0:0:1' ? 'Local Network' : session.ipAddress}
                                                        </p>
                                                    </div>
                                                </div>
                                                {session.isCurrent && (
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse mt-1" />
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-black tracking-tighter uppercase text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    {formatTimeAgo(session.lastActiveAt)}
                                                </span>
                                                <span className={`${session.isCurrent ? 'text-indigo-400' : 'text-[#f5c84b]'}`}>
                                                    {session.isCurrent ? 'Current Context' : 'Active Connection'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10 flex-shrink-0 relative z-10">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Health</span>
                            <span className="text-emerald-400 font-black">98.4%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3">
                            <div className="w-[98%] h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
