import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, AdminUser } from '../../src/services/admin.service';
import { toast } from 'sonner';

// Types for extended user info
import { UserDetail } from '../../src/services/admin.service';

interface ExtendedUser extends AdminUser {
    fullProfile?: UserDetail;
}

const UserManagement: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState<ExtendedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || 'All Roles';
    const page = parseInt(searchParams.get('page') || '0');

    // Search debounce
    const [searchInput, setSearchInput] = useState(query);
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Action State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'BLOCK' | 'UNBLOCK' | 'BAN' | 'DELETE' | null;
        user: ExtendedUser | null;
        isConfirmed: boolean; // For final confirmation step
    }>({ isOpen: false, type: null, user: null, isConfirmed: false });

    const [reason, setReason] = useState('');
    const [blockDays, setBlockDays] = useState(7);
    const [actionLoading, setActionLoading] = useState(false);

    // Encryption Key State
    const [encryptionKey, setEncryptionKey] = useState('');
    const [encryptionError, setEncryptionError] = useState('');
    const [showEncryptionKey, setShowEncryptionKey] = useState(false);
    const [keyAttempts, setKeyAttempts] = useState(0);
    const [keyLockout, setKeyLockout] = useState<number | null>(null);

    // User Detail Drawer
    const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACADEMIC' | 'PUBLICATIONS' | 'NETWORK' | 'ADMIN'>('OVERVIEW');

    // The encryption key (in production, this would be validated server-side)
    // The encryption key is now validated server-side

    // Debounced search
    useEffect(() => {
        if (searchTimeout) clearTimeout(searchTimeout);

        const timeout = setTimeout(() => {
            if (searchInput !== query) {
                updateFilter('query', searchInput);
            }
        }, 300);

        setSearchTimeout(timeout);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    // Key lockout timer
    useEffect(() => {
        if (!keyLockout) return;

        const interval = setInterval(() => {
            if (Date.now() >= keyLockout) {
                setKeyLockout(null);
                setKeyAttempts(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [keyLockout]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getUsers(query, status === 'ALL' ? '' : status, role === 'All Roles' ? '' : role, page, 5);
            setUsers(data.content || []);
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch (err: any) {
            console.error('Failed to fetch users', err);
            setError('Failed to load users');
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [query, status, role, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        newParams.set('page', '0');
        setSearchParams(newParams);
    };

    const openAction = (type: 'BLOCK' | 'UNBLOCK' | 'BAN' | 'DELETE', user: ExtendedUser) => {
        setActionModal({ isOpen: true, type, user, isConfirmed: false });
        setReason('');
        setBlockDays(7);
        setEncryptionKey('');
        setEncryptionError('');
    };

    const validateEncryptionKey = (): boolean => {
        if (!encryptionKey.trim()) {
            setEncryptionError('Encryption key is required');
            return false;
        }
        return true;
    };

    const performAction = async () => {
        if (!actionModal.user || !actionModal.type) return;

        // Require encryption key for dangerous actions (now includes UNBLOCK)
        const dangerousActions = ['BLOCK', 'UNBLOCK', 'BAN', 'DELETE'];
        if (dangerousActions.includes(actionModal.type)) {
            if (!validateEncryptionKey()) return;
        }

        if (actionModal.type !== 'UNBLOCK' && !reason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        // Show final confirmation step
        if (!actionModal.isConfirmed) {
            setActionModal(prev => ({ ...prev, isConfirmed: true }));
            return;
        }

        setActionLoading(true);
        try {
            if (actionModal.type === 'BLOCK') {
                await adminService.blockUser(actionModal.user.id, blockDays, reason, encryptionKey);
                toast.success(`User blocked for ${blockDays} days`);
            } else if (actionModal.type === 'UNBLOCK') {
                await adminService.unblockUser(actionModal.user.id, reason || 'Manual unblock', encryptionKey);
                toast.success('User unblocked');
            } else if (actionModal.type === 'BAN') {
                await adminService.banUser(actionModal.user.id, reason, encryptionKey);
                toast.success('User banned permanently');
            } else if (actionModal.type === 'DELETE') {
                await adminService.deleteUser(actionModal.user.id, reason, encryptionKey);
                toast.success('User deleted');
            }
            fetchUsers();
            setActionModal({ isOpen: false, type: null, user: null, isConfirmed: false });
            setSelectedUser(null);
        } catch (err) {
            console.error('Action failed', err);
            toast.error('Failed to perform action');
        } finally {
            setActionLoading(false);
        }
    };

    const openUserDetail = async (user: ExtendedUser) => {
        setSelectedUser(user);
        setUserDetailLoading(true);

        // Fetch extended user data
        try {
            const userData = await adminService.getUserDetail(user.id);
            setSelectedUser({ ...user, fullProfile: userData });
        } catch (err) {
            // Use existing data if fetch fails
            setSelectedUser(user);
        } finally {
            setUserDetailLoading(false);
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'BLOCKED': case 'TEMP_BANNED': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'BANNED': case 'PERMANENT_BANNED': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'DELETED': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getActionColor = (type: string) => {
        switch (type) {
            case 'BLOCK': return 'bg-amber-500 hover:bg-amber-600';
            case 'UNBLOCK': return 'bg-emerald-500 hover:bg-emerald-600';
            case 'BAN': case 'DELETE': return 'bg-rose-500 hover:bg-rose-600';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    };

    const calculateProfileCompletion = (user: ExtendedUser): number => {
        const profile = user.fullProfile || user.profile;
        if (!profile) return 0;

        const fields = ['name', 'institution', 'bio', 'avatarUrl', 'country', 'department'];
        let filled = 0;

        if ((profile as any).name || (profile as any).fullName) filled++;
        if ((profile as any).institution) filled++;
        if ((profile as any).bio) filled++;
        if ((profile as any).avatarUrl) filled++;
        if ((profile as any).country) filled++;
        if ((profile as any).department) filled++;

        return Math.round((filled / fields.length) * 100);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden px-4 sm:px-0 gap-6 md:gap-7">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1f1b2a] tracking-tight">User Management</h1>
                    <p className="text-[#8a8396] text-sm font-medium">Moderate users, manage permissions, and review account status.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchUsers()}
                        disabled={loading}
                        className="p-2.5 text-[#6e6189] hover:bg-white rounded-xl transition hover:shadow-sm border border-transparent hover:border-[#e8e4f0] disabled:opacity-50"
                        title="Refresh"
                    >
                        <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-rose-500">error</span>
                        <span className="font-medium text-rose-700 text-sm">{error}</span>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 transition"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e4f0] shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center flex-shrink-0">
                <div className="relative flex-1 min-w-0">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a94a9]">search</span>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-[#faf9f7] border border-[#e8e4f0] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/50"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <select
                        value={role}
                        onChange={(e) => updateFilter('role', e.target.value)}
                        className="w-full sm:w-auto h-11 px-4 bg-white border border-[#e8e4f0] rounded-xl text-[10px] font-black uppercase tracking-wider text-[#6e6189] hover:bg-[#faf9f7] cursor-pointer"
                    >
                        {['All Roles', 'Student', 'Research Scholar', 'Faculty', 'Independent Researcher'].map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>

                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        {['ALL', 'ACTIVE', 'BLOCKED', 'BANNED', 'DELETED'].map(s => (
                            <button
                                key={s}
                                onClick={() => updateFilter('status', s === 'ALL' ? '' : s)}
                                className={`px-4 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${(status === s || (s === 'ALL' && !status))
                                    ? 'bg-[#1f1b2a] text-white shadow-lg'
                                    : 'bg-white border border-[#e8e4f0] text-[#6e6189] hover:bg-[#faf9f7]'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-[#e8e4f0] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 min-w-0">
                {loading && users.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-[#e8e4f0] border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-[#8a8396] font-medium text-sm">Loading dossier...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-[#f3f0f7] bg-[#faf9f7] sticky top-0 z-10">
                                    <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">User</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Institution</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Joined</th>
                                    <th className="px-6 sm:px-8 py-5 text-right text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f3f0f7]">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="w-16 h-16 bg-[#faf9f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <span className="material-symbols-outlined text-[#d1d5db] text-3xl">person_off</span>
                                            </div>
                                            <p className="text-[#8a8396] font-medium italic">No users found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr
                                            key={user.id}
                                            className="group hover:bg-[#fffcf0] transition-colors cursor-pointer"
                                            onClick={() => openUserDetail(user)}
                                        >
                                            <td className="px-6 sm:px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[#f3f0f7] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-white shadow-sm">
                                                        {user.fullProfile?.avatarUrl ? (
                                                            <img src={user.fullProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[#8a8396] text-xl">person</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-black text-[#1f1b2a] text-sm truncate">{user.profile?.name || 'Incomplete'}</span>
                                                        <span className="text-[10px] font-bold text-[#6e6189] truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getStatusColor(user.status)}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-bold text-[#1f1b2a] truncate block max-w-[150px]">
                                                    {user.profile?.institution || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black text-[#8a8396] tabular-nums">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-6 sm:px-8 py-5" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openUserDetail(user)}
                                                        className="w-8 h-8 bg-[#faf9f7] text-[#6e6189] rounded-lg flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-700 transition"
                                                        title="View Dossier"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                                    </button>
                                                    {user.status === 'BLOCKED' || user.status === 'BANNED' || user.status === 'TEMP_BANNED' || user.status === 'PERMANENT_BANNED' ? (
                                                        <button
                                                            onClick={() => openAction('UNBLOCK', user)}
                                                            className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition"
                                                            title="Unblock/Unban"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openAction('BLOCK', user)}
                                                            className="w-8 h-8 bg-[#faf9f7] text-[#6e6189] rounded-lg flex items-center justify-center hover:bg-amber-100 hover:text-amber-700 transition"
                                                            title="Block User"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">block</span>
                                                        </button>
                                                    )}

                                                    {!user.status.includes('BAN') && (
                                                        <button
                                                            onClick={() => openAction('BAN', user)}
                                                            className="w-8 h-8 bg-[#faf9f7] text-[#6e6189] rounded-lg flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 transition"
                                                            title="Ban Permanently"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">gavel</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => openAction('DELETE', user)}
                                                        className="w-8 h-8 bg-[#faf9f7] text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition"
                                                        title="Delete File"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="border-t border-[#f3f0f7] px-6 sm:px-8 py-5 flex items-center justify-between bg-[#faf9f7] flex-shrink-0">
                    <span className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest">
                        Total {totalElements}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => updateFilter('page', String(page - 1))}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-[#e8e4f0] rounded-xl text-[#6e6189] disabled:opacity-50 hover:bg-gray-50 transition shadow-sm active:scale-90"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => updateFilter('page', String(page + 1))}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-[#e8e4f0] rounded-xl text-[#6e6189] disabled:opacity-50 hover:bg-gray-50 transition shadow-sm active:scale-90"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlays / Drawers */}
            <div className="fixed inset-0 pointer-events-none z-[150]">
                {/* Action Modal (Confirmation Protocols) */}
                {actionModal.isOpen && actionModal.user && (
                    <div
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
                        onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                    >
                        <div
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-[#e8e4f0] animate-in zoom-in-95 duration-300"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${actionModal.type === 'BLOCK' ? 'bg-amber-100' :
                                        actionModal.type === 'UNBLOCK' ? 'bg-emerald-100' :
                                            'bg-rose-100'
                                        }`}>
                                        <span className={`material-symbols-outlined text-2xl ${actionModal.type === 'BLOCK' ? 'text-amber-600' :
                                            actionModal.type === 'UNBLOCK' ? 'text-emerald-600' :
                                                'text-rose-600'
                                            }`}>
                                            {actionModal.type === 'BLOCK' ? 'block' :
                                                actionModal.type === 'UNBLOCK' ? 'check_circle' :
                                                    actionModal.type === 'BAN' ? 'gavel' : 'delete'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl sm:text-2xl font-black text-[#1f1b2a] truncate">
                                            {actionModal.type} Action
                                        </h3>
                                        <p className="text-[10px] font-bold text-[#6e6189] uppercase tracking-widest">
                                            Authorizing Protocol
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#faf9f7] rounded-2xl mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-[#8a8396]">person</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-[#1f1b2a] truncate">{actionModal.user.profile?.name || 'Incomplete'}</p>
                                            <p className="text-[10px] font-bold text-[#6e6189] truncate">{actionModal.user.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {actionModal.isConfirmed ? (
                                        <div className="py-8 text-center animate-in zoom-in-95 duration-200">
                                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="material-symbols-outlined text-3xl">warning</span>
                                            </div>
                                            <h4 className="text-lg font-black text-[#1f1b2a] mb-2">Final Confirmation</h4>
                                            <p className="text-xs font-bold text-[#6e6189] px-4 leading-relaxed">
                                                Execute {actionModal.type?.toLowerCase()} on <strong>{actionModal.user.profile?.name}</strong>?
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {actionModal.type === 'BLOCK' && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2">Duration (Days)</label>
                                                    <input
                                                        type="number"
                                                        value={blockDays}
                                                        onChange={e => setBlockDays(parseInt(e.target.value) || 1)}
                                                        min={1}
                                                        className="w-full h-11 px-4 bg-[#faf9f7] border border-[#e8e4f0] rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/50 transition-all"
                                                    />
                                                </div>
                                            )}

                                            {actionModal.type !== 'UNBLOCK' && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2">Reason</label>
                                                    <textarea
                                                        value={reason}
                                                        onChange={e => setReason(e.target.value)}
                                                        className="w-full h-24 p-4 bg-[#faf9f7] border border-[#e8e4f0] rounded-xl text-sm font-bold resize-none focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/50 transition-all"
                                                        placeholder="Specify authorization purpose..."
                                                    />
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-[#e8e4f0]">
                                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2">Admin Key</label>
                                                <div className="relative">
                                                    <input
                                                        type={showEncryptionKey ? 'text' : 'password'}
                                                        value={encryptionKey}
                                                        onChange={e => {
                                                            setEncryptionKey(e.target.value);
                                                            setEncryptionError('');
                                                        }}
                                                        className={`w-full h-11 px-4 pr-12 bg-[#faf9f7] border rounded-xl text-sm font-black focus:outline-none focus:ring-2 transition-all ${encryptionError ? 'border-rose-300 focus:ring-rose-200' : 'border-[#e8e4f0] focus:ring-[#f5c84b]/50'
                                                            }`}
                                                        placeholder="Enter encryption key..."
                                                    />
                                                    <button
                                                        onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {showEncryptionKey ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                </div>
                                                {encryptionError && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-wider">{encryptionError}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button
                                            onClick={() => actionModal.isConfirmed ? setActionModal(p => ({ ...p, isConfirmed: false })) : setActionModal(p => ({ ...p, isOpen: false }))}
                                            className="h-12 bg-[#f3f0f7] text-[#6e6189] font-black rounded-xl text-[10px] uppercase tracking-wider hover:bg-[#e8e4f0] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={performAction}
                                            disabled={actionLoading}
                                            className={`h-12 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${getActionColor(actionModal.type || '')} disabled:opacity-50`}
                                        >
                                            {actionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {actionModal.isConfirmed ? 'Confirm Exec' : 'Execute'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedUser && (
                    <div className="fixed inset-0 z-[200] flex justify-end pointer-events-none">
                        {/* Backdrop - Blocks clicks to main page if we want, but user said pointer-events-none only to backdrop */}
                        {/* If they want it interactive on side but none on backdrop, this is it. */}
                        <div className="absolute inset-0 bg-black/2 backdrop-blur-[1px] pointer-events-none" />

                        <div
                            className="relative w-full max-w-4xl bg-[#faf9f7] h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-500 flex flex-col pointer-events-auto border-l border-[#e8e4f0]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Drawer Header - Matches Panel Background */}
                            <div className="bg-[#faf9f7] border-b border-[#e8e4f0] px-4 sm:px-8 py-5 flex items-center justify-between sticky top-0 z-20">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black text-[#1f1b2a] tracking-tight truncate leading-tight">User Inspector</h2>
                                    <p className="text-[11px] font-bold text-[#6e6189] truncate max-w-[300px] mt-0.5">
                                        {selectedUser.email}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-[#e8e4f0] shadow-sm sm:shadow-none"
                                >
                                    <span className="material-symbols-outlined text-[#6e6189] text-2xl font-light">close</span>
                                </button>
                            </div>

                            {userDetailLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-[#e8e4f0] border-t-indigo-500 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] animate-pulse">Syncing dossier...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Responsive Tab Navigation */}
                                    <div className="bg-white border-b border-[#e8e4f0] px-4 sm:px-8 overflow-x-auto scrollbar-hide flex gap-6 sm:gap-10 sticky top-[80px] sm:top-[85px] z-10">
                                        {[
                                            { id: 'OVERVIEW', label: 'Info', icon: 'info' },
                                            { id: 'ACADEMIC', label: 'Acad', icon: 'school' },
                                            { id: 'PUBLICATIONS', label: 'Pubs', icon: 'article' },
                                            { id: 'NETWORK', label: 'Net', icon: 'hub' },
                                            { id: 'ADMIN', label: 'Logs', icon: 'policy' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`py-4 sm:py-5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all border-b-2 whitespace-nowrap
                                                        ${activeTab === tab.id
                                                        ? 'border-[#f5c84b] text-[#1f1b2a]'
                                                        : 'border-transparent text-[#8a8396] hover:text-[#6e6189]'}`}
                                            >
                                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{tab.icon}</span>
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 sm:py-8 custom-scrollbar">
                                        {activeTab === 'OVERVIEW' && (
                                            <div className="flex flex-col gap-6 sm:gap-8">
                                                {/* Profile Card */}
                                                <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-[#e8e4f0] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden">
                                                    <div className="sm:absolute top-5 right-5 mb-4 sm:mb-0">
                                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedUser.status)}`}>
                                                            {selectedUser.status}
                                                        </span>
                                                    </div>

                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[1.5rem] bg-[#f7f5f2] border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                                                        {selectedUser.fullProfile?.avatarUrl ? (
                                                            <img src={selectedUser.fullProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                                                                <span className="material-symbols-outlined text-3xl sm:text-4xl">person</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 text-center sm:text-left min-w-0">
                                                        <h3 className="text-xl sm:text-2xl font-black text-[#1f1b2a] truncate">
                                                            {selectedUser.fullProfile?.fullName || selectedUser.profile?.name || 'Anon'}
                                                        </h3>
                                                        <p className="text-sm text-[#6e6189] font-bold">
                                                            @{selectedUser.fullProfile?.displayName || 'unnamed'}
                                                        </p>
                                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                                                            <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">
                                                                {selectedUser.fullProfile?.role || 'User'}
                                                            </div>
                                                            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                                                                {calculateProfileCompletion(selectedUser)}% Done
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Stats Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Followers', value: selectedUser.fullProfile?.followers || 0, icon: 'groups' },
                                                        { label: 'Following', value: selectedUser.fullProfile?.following || 0, icon: 'person_add' },
                                                        { label: 'Pubs', value: selectedUser.fullProfile?.publications?.length || 0, icon: 'article' },
                                                        { label: 'Strikes', value: selectedUser.fullProfile?.adminStats?.warningsCount || 0, icon: 'warning' }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="bg-white border border-[#e8e4f0] p-4 rounded-2xl shadow-sm text-center">
                                                            <span className="material-symbols-outlined text-gray-400 text-lg mb-1 block">{stat.icon}</span>
                                                            <p className="text-lg font-black text-[#1f1b2a]">{stat.value}</p>
                                                            <p className="text-[8px] font-black text-[#8a8396] uppercase tracking-widest">{stat.label}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div className="flex flex-col gap-4">
                                                        <h4 className="text-[10px] font-black text-[#1f1b2a] uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-3">Dossier Access</h4>
                                                        <div className="bg-white border border-[#e8e4f0] rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                                                            <div>
                                                                <label className="text-[9px] font-black text-[#8a8396] uppercase tracking-widest block mb-1">Email</label>
                                                                <p className="text-sm font-bold text-[#1f1b2a] truncate">{selectedUser.email}</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-[#8a8396] uppercase tracking-widest block mb-1">Joined</label>
                                                                <p className="text-sm font-bold text-[#1f1b2a]">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <h4 className="text-[10px] font-black text-[#1f1b2a] uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Biography</h4>
                                                        <div className="bg-white border border-[#e8e4f0] rounded-3xl p-6 shadow-sm min-h-[120px]">
                                                            <p className="text-sm text-[#6e6189] leading-relaxed italic line-clamp-4">
                                                                {selectedUser.fullProfile?.bio || "No biography dossier available."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'ACADEMIC' && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="flex flex-col gap-5">
                                                        <h4 className="text-xs font-black text-[#1f1b2a] uppercase tracking-[0.2em] px-2 border-l-4 border-indigo-500">Professional Context</h4>
                                                        <div className="bg-white border border-[#e8e4f0] rounded-[1.5rem] p-6 flex flex-col gap-5 shadow-sm">
                                                            <div>
                                                                <label className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest block mb-2">Institution</label>
                                                                <p className="text-md font-bold text-[#1f1b2a]">{selectedUser.fullProfile?.institution || 'Unknown'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest block mb-2">Department</label>
                                                                <p className="text-md font-bold text-[#1f1b2a]">{selectedUser.fullProfile?.department || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-5">
                                                        <h4 className="text-xs font-black text-[#1f1b2a] uppercase tracking-[0.2em] px-2 border-l-4 border-purple-500">Research Focus</h4>
                                                        <div className="bg-white border border-[#e8e4f0] rounded-[1.5rem] p-6 shadow-sm">
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedUser.fullProfile?.researchInterests?.map((interest, i) => (
                                                                    <span key={i} className="px-3 py-1 bg-[#faf9f7] border border-[#e8e4f0] rounded-lg text-[9px] font-black text-[#6e6189] uppercase">{interest}</span>
                                                                )) || <p className="text-xs text-[#8a8396] italic">No interests provided.</p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'PUBLICATIONS' && (
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black text-[#1f1b2a] uppercase tracking-[0.2em] px-2 border-l-4 border-[#f5c84b]">Linked Publications</h4>
                                                {selectedUser.fullProfile?.publications && selectedUser.fullProfile.publications.length > 0 ? (
                                                    <div className="flex flex-col gap-3">
                                                        {selectedUser.fullProfile.publications.map((pub, i) => (
                                                            <div key={i} className="bg-white border border-[#e8e4f0] p-4 rounded-2xl shadow-sm hover:border-[#f5c84b] transition-all group">
                                                                <h5 className="text-sm font-black text-[#1f1b2a] leading-tight mb-2 group-hover:text-amber-600 truncate-2-lines">{pub.title}</h5>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest">{pub.journal} • {pub.year}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-20 text-center bg-white border border-dashed border-[#e8e4f0] rounded-[2rem] sm:rounded-3xl shadow-sm">
                                                        <span className="material-symbols-outlined text-4xl text-[#d1d5db] mb-2">article</span>
                                                        <p className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest">No publications synced.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'NETWORK' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                                                {/* Followers Section */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-2">
                                                        <h4 className="text-[10px] font-black text-[#1f1b2a] uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-3">Followers Dossier</h4>
                                                        <span className="text-[10px] font-bold text-[#8a8396] tabular-nums">{selectedUser.fullProfile?.followers || 0}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {selectedUser.fullProfile?.followersList && selectedUser.fullProfile.followersList.length > 0 ? (
                                                            selectedUser.fullProfile.followersList.map((u, i) => (
                                                                <div key={i} className="bg-white border border-[#e8e4f0] p-3 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-default group">
                                                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400 flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                                                        <span className="material-symbols-outlined text-xl">person</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-[#1f1b2a] truncate">{u.name}</p>
                                                                        <p className="text-[9px] font-bold text-[#8a8396] truncate uppercase tracking-tight">{u.institution || 'Access Restricted'}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-12 flex flex-col items-center justify-center bg-white/50 border border-dashed border-[#e8e4f0] rounded-3xl">
                                                                <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">group</span>
                                                                <p className="text-[9px] text-[#8a8396] font-black uppercase tracking-widest italic text-center">No followers linked<br />to this account.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Following Section */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-2">
                                                        <h4 className="text-[10px] font-black text-[#1f1b2a] uppercase tracking-[0.2em] border-l-4 border-purple-500 pl-3">Following Intelligence</h4>
                                                        <span className="text-[10px] font-bold text-[#8a8396] tabular-nums">{selectedUser.fullProfile?.following || 0}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {selectedUser.fullProfile?.followingList && selectedUser.fullProfile.followingList.length > 0 ? (
                                                            selectedUser.fullProfile.followingList.map((u, i) => (
                                                                <div key={i} className="bg-white border border-[#e8e4f0] p-3 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md hover:border-purple-100 transition-all cursor-default group">
                                                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                                                                        <span className="material-symbols-outlined text-xl">group_add</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-[#1f1b2a] truncate">{u.name}</p>
                                                                        <p className="text-[9px] font-bold text-[#8a8396] truncate uppercase tracking-tight">{u.institution || 'Access Restricted'}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-12 flex flex-col items-center justify-center bg-white/50 border border-dashed border-[#e8e4f0] rounded-3xl">
                                                                <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">person_add</span>
                                                                <p className="text-[9px] text-[#8a8396] font-black uppercase tracking-widest italic text-center">Account is not<br />tracking any users.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'ADMIN' && (
                                            <div className="flex flex-col gap-6 pb-20">
                                                <div className="bg-[#1f1b2a] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                                                    <div className="relative z-10">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#f5c84b] mb-6">Security Record</h4>
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div>
                                                                <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">Strike Level</label>
                                                                <p className="text-3xl font-black text-rose-400 tabular-nums">{selectedUser.fullProfile?.adminStats?.warningsCount || 0}</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">Protocol Actions</label>
                                                                <p className="text-3xl font-black tabular-nums">{selectedUser.fullProfile?.adminStats?.totalActions || 0}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-0 right-0 p-10 opacity-5">
                                                        <span className="material-symbols-outlined text-[120px]">verified_user</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {selectedUser.status === 'BLOCKED' ? (
                                                        <button
                                                            onClick={() => openAction('UNBLOCK', selectedUser)}
                                                            className="p-4 sm:p-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                                            Pardon Protocol
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openAction('BLOCK', selectedUser)}
                                                            className="p-4 sm:p-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">block</span>
                                                            Temporary Block
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openAction('BAN', selectedUser)}
                                                        className="p-4 sm:p-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">gavel</span>
                                                        Expunge Access
                                                    </button>
                                                    <button
                                                        onClick={() => openAction('DELETE', selectedUser)}
                                                        className="p-4 sm:p-5 bg-white border border-[#e8e4f0] text-[#6e6189] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 sm:col-span-2 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                                                        Purge Dossier
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
