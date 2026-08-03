import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import notificationService, { Notification } from "../../src/services/notification.service";
import followService from "../../src/services/follow.service";
import { useNotification } from "../../src/context/NotificationContext";
import PageTitle from "../../src/components/PageTitle";
import FollowButton from "../../src/components/FollowButton";
import { toast } from "sonner";

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; ids: number[] }>({ isOpen: false, ids: [] });

    const navigate = useNavigate();
    const { refreshUnreadCount } = useNotification();

    useEffect(() => {
        fetchNotifications();
        markAllAsRead();
    }, []);

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            refreshUnreadCount();
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications();
            if (Array.isArray(data)) {
                setNotifications(data);
            } else if (data && data.content) {
                setNotifications(data.content);
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            refreshUnreadCount();
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const handleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const selectable = notifications.filter(n => !isSystemNotification(n.type));
        const allSelectableIds = new Set(selectable.map(n => n.id));
        const allSelected = selectable.length > 0 && selectable.every(n => selectedIds.has(n.id));

        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(allSelectableIds);
        }
    };

    const performDelete = async () => {
        const idsToDelete = deleteModal.ids;
        if (idsToDelete.length === 0) return;

        try {
            await notificationService.deleteNotifications(idsToDelete);
            setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                idsToDelete.forEach(id => next.delete(id));
                return next;
            });
            setDeleteModal({ isOpen: false, ids: [] });

            // Exit selection mode if we were deleting selected items or if no more items are selected
            if (selectedIds.size === 0 || idsToDelete.length > 1) {
                setIsSelectionMode(false);
            }

            toast.success(idsToDelete.length === 1 ? "Notification deleted" : "Notifications deleted");
        } catch (error) {
            console.error("Failed to delete notifications", error);
            toast.error("Could not delete notifications");
        }
    };

    const handleAccept = async (requestId: number) => {
        try {
            await followService.acceptRequest(requestId);
            toast.success("Request accepted");
            fetchNotifications();
            refreshUnreadCount();
        } catch (error) {
            toast.error("Failed to accept request");
        }
    };

    const handleReject = async (requestId: number) => {
        try {
            await followService.rejectRequest(requestId);
            fetchNotifications();
            refreshUnreadCount();
        } catch (error) {
            toast.error("Failed to reject request");
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case "FOLLOW": return "person_add";
            case "FOLLOW_BACK": return "person_add";
            case "SHARE": return "share";
            case "COMMENT": return "comment";
            case "LIKE": return "favorite";
            case "MENTION_POST":
            case "MENTION_COMMENT": return "alternate_email";
            case "BLOCK": return "block";
            case "UNBLOCK": return "check_circle";
            case "BAN": return "gavel";
            case "UNBAN": return "gavel";
            default: return "notifications";
        }
    };

    const isSystemNotification = (type: string) => {
        return ['BLOCK', 'BAN'].includes(type);
    };

    const selectableItems = notifications.filter(n => !isSystemNotification(n.type));
    const allSelected = selectableItems.length > 0 && selectableItems.length === selectedIds.size;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#faf9f7]">
            <PageTitle title="Notifications" />
            <div className="max-w-3xl mx-auto w-full p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#1f1b2a]">Notifications</h1>
                        <p className="text-sm text-[#8a8396] font-medium mt-1">
                            {isSelectionMode ? `Selection Mode: ${selectedIds.size} selected` : 'Stay updated with your community'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {!loading && notifications.length > 0 && (
                            <>
                                {!isSelectionMode ? (
                                    <button
                                        onClick={() => setIsSelectionMode(true)}
                                        className="h-11 px-6 bg-white border border-[#e8e4f0] rounded-2xl text-xs font-black uppercase tracking-widest text-[#6e6189] hover:bg-[#fffdf5] hover:border-[#f5c84b] hover:text-[#1f1b2a] transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">rule</span>
                                        Select
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(false);
                                                setSelectedIds(new Set());
                                            }}
                                            className="h-11 px-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSelectAll}
                                            className={`h-11 px-4 border rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                ${allSelected
                                                    ? 'bg-[#1f1b2a] border-[#1f1b2a] text-white shadow-lg shadow-[#1f1b2a]/10'
                                                    : 'bg-white border-[#e8e4f0] text-[#6e6189] hover:border-[#f5c84b]'}`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {allSelected ? 'deselect' : 'select_all'}
                                            </span>
                                            {allSelected ? 'Deselect' : 'All'}
                                        </button>
                                        {selectedIds.size > 0 && (
                                            <button
                                                onClick={() => setDeleteModal({ isOpen: true, ids: Array.from(selectedIds) })}
                                                className="h-11 px-6 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                Delete {selectedIds.size}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white/50 rounded-[2rem] border border-[#e8e4f0] animate-pulse"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border border-[#e8e4f0] shadow-sm">
                        <div className="w-20 h-20 bg-[#f7f5f2] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-[#d1d5db] text-4xl">notifications_off</span>
                        </div>
                        <h3 className="text-xl font-black text-[#1f1b2a]">All quiet here</h3>
                        <p className="text-[#8a8396] font-medium mt-2">Check back later for new alerts.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                className={`group relative flex items-start gap-4 p-5 rounded-[1.5rem] border transition-all duration-300
                                    ${selectedIds.has(n.id)
                                        ? 'bg-[#fffef0] border-[#f5c84b] shadow-md shadow-[#f5c84b]/5'
                                        : n.read
                                            ? 'bg-white border-[#e8e4f0] hover:border-gray-300 shadow-sm'
                                            : 'bg-white border-[#f5c84b]/40 shadow-sm shadow-[#f5c84b]/5'}`}
                            >
                                {/* Checkbox - Only in Selection Mode */}
                                {isSelectionMode && (
                                    <div
                                        className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer animate-in zoom-in-50 duration-200
                                            ${selectedIds.has(n.id)
                                                ? 'bg-[#f5c84b] border-[#f5c84b]'
                                                : 'bg-white border-[#e8e4f0] hover:border-[#f5c84b]'}
                                            ${isSystemNotification(n.type) ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isSystemNotification(n.type)) handleSelect(n.id);
                                        }}
                                    >
                                        {selectedIds.has(n.id) && (
                                            <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>
                                        )}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-[1.1rem] flex items-center justify-center border shadow-sm transition-all duration-300
                                        ${isSystemNotification(n.type)
                                            ? 'bg-rose-50 text-rose-500 border-rose-100'
                                            : 'bg-white text-[#f5c84b] border-[#e8e4f0]'}`}>
                                        <span className="material-symbols-outlined text-[24px]">
                                            {getIconForType(n.type)}
                                        </span>
                                    </div>
                                    {!n.read && (
                                        <div className="absolute -top-1 -right-1">
                                            <div className="w-3.5 h-3.5 bg-[#f5c84b] rounded-full border-[3px] border-white shadow-sm ring-1 ring-[#f5c84b]/20"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div
                                    className="flex-1 min-w-0 pt-0.5 cursor-pointer"
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            if (!isSystemNotification(n.type)) handleSelect(n.id);
                                            return;
                                        }

                                        if (!n.read) handleMarkAsRead(n.id);
                                        if (isSystemNotification(n.type)) return;

                                        const profileTypes = ['FOLLOW', 'FOLLOW_REQUEST', 'FOLLOW_BACK', 'FOLLOW_ACCEPTED'];
                                        if (profileTypes.includes(n.type)) {
                                            if (n.actor?.displayName) {
                                                navigate(`/u/${n.actor.displayName}`);
                                            } else if (n.actor?.id) {
                                                navigate(`/profile/${n.actor.id}`);
                                            }
                                        } else {
                                            navigate(`/post/${n.entityId}`);
                                        }
                                    }}
                                >
                                    <p className={`text-[15px] leading-[1.4] transition-colors ${n.read ? 'text-[#6e6189]' : 'text-[#1f1b2a] font-bold'}`}>
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8a8396]">
                                            {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {n.type === 'FOLLOW_REQUEST' && !isSelectionMode && (
                                        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleAccept(n.entityId)}
                                                className="px-5 py-2 bg-[#f5c84b] text-[#1f1b2a] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#ebbe40] transition-all shadow-sm active:scale-95"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleReject(n.entityId)}
                                                className="px-5 py-2 bg-[#f3f0f7] text-[#6e6189] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#e8e4f0] transition-all active:scale-95"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {(n.type === 'FOLLOW' || n.type === 'FOLLOW_BACK') && !isSelectionMode && (
                                        <div className="mt-4 w-fit" onClick={(e) => e.stopPropagation()}>
                                            <FollowButton
                                                userId={n.actor.id}
                                                className="h-9 !px-8 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Single Delete Action - Only in Selection Mode */}
                                {isSelectionMode && !isSystemNotification(n.type) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteModal({ isOpen: true, ids: [n.id] });
                                        }}
                                        className="w-10 h-10 rounded-[1rem] bg-[#f3f0f7] text-[#6e6189] hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 flex items-center justify-center animate-in slide-in-from-right-2"
                                        title="Delete this notification"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#1f1b2a]/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteModal({ isOpen: false, ids: [] })}></div>
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 border border-[#e8e4f0]">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-4xl">delete_sweep</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#1f1b2a] text-center">Are you sure?</h3>
                        <p className="text-[#6e6189] text-center mt-3 font-medium leading-relaxed">
                            {deleteModal.ids.length === 1
                                ? "You are about to delete this notification. This action cannot be undone."
                                : `You are about to delete ${deleteModal.ids.length} notifications. This action is permanent.`}
                        </p>
                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={performDelete}
                                className="w-full py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-[0.98]"
                            >
                                Yes, Delete
                            </button>
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, ids: [] })}
                                className="w-full py-4 bg-[#f3f0f7] text-[#6e6189] font-black uppercase tracking-widest rounded-2xl hover:bg-[#e8e4f0] transition-all active:scale-[0.98]"
                            >
                                Nevermind
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
