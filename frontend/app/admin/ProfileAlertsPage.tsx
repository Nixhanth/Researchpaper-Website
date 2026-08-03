
import React, { useState, useEffect } from 'react';
import { adminService } from '../../src/services/admin.service';
import { toast } from 'sonner';

interface ProfileUser {
    id: string;
    email: string;
    name: string;
    institution: string;
    role: string;
    completionPercentage: number;
    missingFields: string[];
    createdAt: string;
    lastLoginAt?: string;
}

const ProfileAlertsPage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<ProfileUser[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [activeFilter, setActiveFilter] = useState('incomplete'); // Default to showing incomplete users
    const [selectedRole, setSelectedRole] = useState('');
    const [page, setPage] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);

    const filters: Record<string, { min: number; max: number; label: string; color: string; description: string }> = {
        all: { min: 0, max: 100, label: 'All Users', color: 'bg-gray-100 text-gray-600', description: 'Total research pool' },
        incomplete: { min: 0, max: 59, label: 'Incomplete', color: 'bg-rose-100 text-rose-700', description: 'Missing Identity or Research ID' },
        basic: { min: 60, max: 79, label: 'Basic Rank', color: 'bg-amber-100 text-amber-700', description: 'Profile info exists, no Orcid/Pubs' },
        nearly: { min: 80, max: 94, label: 'Nearly Complete', color: 'bg-blue-100 text-blue-700', description: 'Academic link present, missing data' },
        verified: { min: 95, max: 100, label: 'Verified Credible', color: 'bg-emerald-100 text-emerald-700', description: 'Research IDs + Publications linked' }
    };

    // Email
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [subject, setSubject] = useState('Complete Your Researcher Profile');
    const [emailBody, setEmailBody] = useState(
        `Dear {{name}},\n\nWe noticed your profile is only {{percentage}}% complete. Keeping your profile updated helps you connect with other researchers and increases your visibility.\n\nPlease take a moment to complete the missing sections of your profile.\n\nBest regards,\nThe Researcher Tool Team`
    );
    const [sending, setSending] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    useEffect(() => {
        loadStats();
        loadUsers();
    }, []);

    useEffect(() => {
        loadUsers();
    }, [activeFilter, selectedRole, page]);

    const loadStats = async () => {
        try {
            const data = await adminService.getProfileCompletionStats();
            setStats(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const filter = filters[activeFilter];
            const data = await adminService.getUsersByProfileCompletion(
                filter.min,
                filter.max,
                selectedRole,
                'ACTIVE',
                page,
                5
            );
            setUsers(data.content);
            setTotalUsers(data.totalElements);
        } catch (error) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            const newSet = new Set(users.map(u => u.id));
            setSelectedUsers(newSet);
        }
    };

    const toggleUser = (id: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const handleSendEmail = async () => {
        if (selectedUsers.size === 0) {
            toast.error("Select at least one user");
            return;
        }

        setSending(true);
        try {
            const result = await adminService.sendBulkProfileCompletionEmail(
                Array.from(selectedUsers),
                subject,
                emailBody
            );
            toast.success(`Sent ${result.sent} emails successfully`);
            setShowEmailModal(false);
            setSelectedUsers(new Set());
        } catch (error) {
            toast.error("Failed to send emails");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-7 h-full flex flex-col overflow-hidden">
            {/* Header - Compact Stripe */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 bg-white p-4 rounded-3xl border border-[#e8e4f0] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1f1b2a] rounded-2xl flex items-center justify-center text-[#f5c84b] shadow-lg shadow-[#1f1b2a]/10">
                        <span className="material-symbols-outlined text-2xl">notification_important</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-[#1f1b2a] tracking-tight">Profile Integrity Control</h1>
                        <p className="text-[10px] text-[#8a8396] font-black uppercase tracking-[0.1em]">Audit research credibility & automate nudges</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-[#faf8f5] rounded-xl border border-[#e8e4f0] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span className="text-[10px] font-black text-[#1f1b2a] uppercase">Active: {stats?.total || 0}</span>
                    </div>
                    <div className="h-6 w-px bg-gray-100"></div>
                    <div className="flex gap-1.5">
                        <div className="px-2.5 py-1 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-rose-400 uppercase">Alert</span>
                            <span className="text-xs font-black text-rose-700">{stats?.incomplete || 0}</span>
                        </div>
                        <div className="px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-amber-400 uppercase">Basic</span>
                            <span className="text-xs font-black text-amber-700">{stats?.basic || 0}</span>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Verified</span>
                            <span className="text-xs font-black text-emerald-700">{stats?.complete || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-[#e8e4f0] shadow-sm flex flex-col md:flex-row md:items-end gap-6">

                {/* Filter Chips */}
                <div className="flex-1">
                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-widest mb-3 flex items-center gap-2">
                        Analyze Completion Stage
                        <span className="w-1 h-1 rounded-full bg-[#f5c84b]"></span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(filters).map(([key, filter]) => (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key)}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all border ${activeFilter === key
                                    ? 'border-[#1f1b2a] bg-[#1f1b2a] text-white shadow-lg -translate-y-0.5'
                                    : 'border-[#e8e4f0] bg-[#faf8f5] text-gray-500 hover:border-[#1f1b2a] hover:text-[#1f1b2a]'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[9px] font-bold text-[#8a8396] italic px-1">
                        {filters[activeFilter].description}
                    </p>
                </div>

                <div className="w-full md:w-64">
                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-widest mb-2">Role</label>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold focus:outline-none focus:border-[#f5c84b]"
                    >
                        <option value="">All Roles</option>
                        <option value="Student">Student</option>
                        <option value="Research Scholar">Research Scholar</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Independent Researcher">Independent Researcher</option>
                    </select>
                </div>

                <button
                    onClick={() => setShowEmailModal(true)}
                    disabled={selectedUsers.size === 0}
                    className="h-10 px-6 bg-[#f5c84b] text-[#1f1b2a] rounded-lg font-black text-xs uppercase tracking-widest hover:bg-[#f4b82a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Send Email ({selectedUsers.size})
                </button>
            </div>

            {/* User List */}
            <div className="bg-white rounded-2xl border border-[#e8e4f0] overflow-hidden shadow-sm flex flex-col h-[600px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#faf8f5] border-b border-[#e8e4f0]">
                            <tr>
                                <th className="px-6 py-4 text-left w-10">
                                    <input
                                        type="checkbox"
                                        checked={users.length > 0 && selectedUsers.size === users.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-[#f5c84b] focus:ring-[#f5c84b]"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Researcher Details</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Status / Role</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Integrity Rank</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Critical Requirements</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Last Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8e4f0] flex-1 overflow-y-auto">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="w-6 h-6 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></span>
                                            <span className="text-sm font-bold text-gray-500">Loading researchers...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                                            <span className="text-sm font-bold text-gray-500">No users found in this category.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-[#faf8f5]/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={() => toggleUser(user.id)}
                                                className="rounded border-gray-300 text-[#f5c84b] focus:ring-[#f5c84b]"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm transition-transform group-hover:scale-105 ${user.role === 'Student' ? 'bg-indigo-500' :
                                                        user.role === 'Faculty' ? 'bg-emerald-500' : 'bg-amber-500'
                                                        }`}>
                                                        {(user.name || user.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${user.completionPercentage >= 95 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                        <span className="material-symbols-outlined text-[8px] font-black text-white">
                                                            {user.completionPercentage >= 95 ? 'verified' : 'priority_high'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="min-w-0 cursor-pointer group/name"
                                                    onClick={() => window.open(`/profile/${user.id}`, '_blank')}
                                                >
                                                    <div className="font-black text-[#1f1b2a] text-sm group-hover/name:text-indigo-600 transition-colors truncate max-w-[200px] flex items-center gap-1.5">
                                                        {user.name || 'Anonymous Faculty'}
                                                        <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/name:opacity-100 transition-opacity">open_in_new</span>
                                                    </div>
                                                    <div className="text-[10px] text-[#8a8396] font-bold truncate max-w-[200px]">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${user.completionPercentage >= 95 ? 'bg-emerald-50 text-emerald-600' :
                                                    user.completionPercentage >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                                    }`}>
                                                    {user.completionPercentage >= 95 ? 'Verified Profile' :
                                                        user.completionPercentage >= 80 ? 'Nearly Complete' :
                                                            user.completionPercentage >= 60 ? 'Basic Account' : 'Action Required'}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#8a8396] pl-0.5">{user.role || 'Unspecified'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#1f1b2a]">{user.completionPercentage}%</span>
                                                    <span className="text-[9px] font-black text-[#8a8396] uppercase tracking-tighter">Weighted Score</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${user.completionPercentage < 60 ? 'bg-rose-500' :
                                                            user.completionPercentage < 80 ? 'bg-amber-500' :
                                                                user.completionPercentage < 95 ? 'bg-blue-500' : 'bg-emerald-500'
                                                            }`}
                                                        style={{ width: `${user.completionPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                {user.missingFields && user.missingFields.length > 0 ? (
                                                    // Prioritize ORCID and Publications
                                                    [...user.missingFields].sort((a, b) => {
                                                        const priority = ['ORCID', 'Publications', 'Bio', 'Photo'];
                                                        const indexA = priority.indexOf(a);
                                                        const indexB = priority.indexOf(b);
                                                        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                                                    }).slice(0, 3).map(field => (
                                                        <div key={field} className="group/item relative">
                                                            <span className={`inline-flex items-center px-2 py-1 border transition-colors cursor-help rounded-md text-[9px] font-black uppercase tracking-tight
                                                                ${(field === 'ORCID' || field === 'Publications')
                                                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                                    : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                                <span className="material-symbols-outlined text-[12px] mr-1">
                                                                    {field === 'ORCID' ? 'verified_user' :
                                                                        field === 'Publications' ? 'book' : 'warning'}
                                                                </span>
                                                                {field}
                                                            </span>
                                                            <div className="invisible group-hover/item:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-1.5 bg-[#1f1b2a] text-white text-[9px] font-black uppercase rounded shadow-xl whitespace-nowrap z-50">
                                                                {field === 'ORCID' ? '🔴 Critical Research ID' :
                                                                    field === 'Publications' ? '🔴 Priority Data' : '🟡 Profile Depth'}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2 bg-emerald-50 text-emerald-700 rounded-md py-1 border border-emerald-100 shadow-sm">
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Fully Credible</span>
                                                    </div>
                                                )}
                                                {user.missingFields && user.missingFields.length > 3 && (
                                                    <span className="text-[9px] text-[#8a8396] font-black uppercase tracking-widest bg-gray-100 px-2 rounded-md flex items-center">
                                                        +{user.missingFields.length - 3} More
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-[#1f1b2a] uppercase tracking-tighter">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                                </span>
                                                <span className="text-[9px] font-bold text-[#8a8396] uppercase">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Activity'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-[#f3f0f7] px-8 py-5 flex items-center justify-between bg-[#faf8f5] mt-auto sticky bottom-0 z-10">
                    <span className="text-xs font-bold text-[#8a8396]">
                        Showing {users.length} of {totalUsers} users
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-white border border-[#e8e4f0] rounded-xl text-xs font-bold text-[#6e6189] disabled:opacity-50 hover:bg-gray-50 transition"
                        >
                            Prev
                        </button>
                        <button
                            disabled={(page + 1) * 5 >= totalUsers}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-white border border-[#e8e4f0] rounded-xl text-xs font-bold text-[#6e6189] disabled:opacity-50 hover:bg-gray-50 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Email Composer Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-[#e8e4f0] flex items-center justify-between bg-[#faf8f5]">
                            <h3 className="font-black text-[#1f1b2a] text-lg">Send Batch Email</h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recipients</label>
                                <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                                    {selectedUsers.size} users selected
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#e8e4f0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#f5c84b]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message Template</label>
                                <textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={8}
                                    className="w-full px-3 py-2 border border-[#e8e4f0] rounded-lg text-sm font-medium focus:outline-none focus:border-[#f5c84b]"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Available variables: {'{{name}}'}, {'{{percentage}}'}, {'{{email}}'}</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-[#e8e4f0] flex justify-end gap-3">
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sending}
                                className="px-6 py-2 bg-[#f5c84b] text-[#1f1b2a] rounded-lg font-black uppercase tracking-wider hover:bg-[#f4b82a] transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {sending && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                                Send Emails
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileAlertsPage;
