import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, AuditLog } from '../../src/services/admin.service';
import { toast } from 'sonner';

const AuditLogs: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const page = parseInt(searchParams.get('page') || '0');
    const size = 5;

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getAuditLogs(page, size);
            setLogs(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handlePageChange = (newPage: number) => {
        setSearchParams({ page: newPage.toString() });
    };

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleString();
    };

    const getActionColor = (type: string) => {
        switch (type) {
            case 'BLOCK': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'UNBLOCK': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'BAN': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'DELETE': return 'text-gray-600 bg-gray-100 border-gray-200';
            case 'NOTIFY': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
            case 'EMAIL': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex flex-col gap-1 flex-shrink-0">
                <h1 className="text-3xl font-black text-[#1f1b2a] tracking-tight">Audit Logs</h1>
                <p className="text-[#8a8396] font-medium">Complete history of administrative actions and security events.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-[#e8e4f0] shadow-sm flex flex-col h-[600px] overflow-hidden">
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#faf9f7] border-b border-[#e8e4f0]">
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider w-48">Timestamp</th>
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider w-32">Admin</th>
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider w-32">Action</th>
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider w-48">Target User</th>
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider">Reason / Details</th>
                                <th className="p-6 text-xs font-black text-[#8a8396] uppercase tracking-wider w-24">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8e4f0]">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="p-6"><div className="h-6 bg-gray-100 rounded w-24"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[#8a8396]">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">history_toggle_off</span>
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[#faf9f7] transition-colors group">
                                        <td className="p-6 text-sm font-medium text-[#6e6189] tabular-nums">
                                            {formatDateTime(log.createdAt)}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                                    {log.adminUsername.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold text-[#1f1b2a]">{log.adminUsername.split('@')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getActionColor(log.actionType)}`}>
                                                {log.actionType}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-sm font-bold text-[#1f1b2a]">{log.targetUserEmail || 'Unknown'}</div>
                                            <div className="text-[10px] text-[#8a8396] font-mono mt-0.5">{log.targetUserId.substring(0, 8)}...</div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-sm text-[#6e6189] max-w-md break-words">
                                                {log.reason || '-'}
                                                {log.blockDurationDays && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600">
                                                        {log.blockDurationDays} days
                                                    </span>
                                                )}
                                            </p>
                                        </td>
                                        <td className="p-6">
                                            {log.success ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    Success
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">error</span>
                                                    Failed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-white border-t border-[#e8e4f0] p-4 flex items-center justify-between mt-auto sticky bottom-0 z-10">
                    <p className="text-sm text-[#8a8396] font-medium">
                        Showing <span className="font-bold text-[#1f1b2a]">{logs.length}</span> of <span className="font-bold text-[#1f1b2a]">{totalElements}</span> logs
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 0}
                            className="p-2 rounded-xl border border-[#e8e4f0] text-[#6e6189] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="px-4 py-2 bg-[#faf9f7] rounded-xl text-sm font-bold text-[#1f1b2a]">
                            Page {page + 1} of {totalPages || 1}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-xl border border-[#e8e4f0] text-[#6e6189] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
