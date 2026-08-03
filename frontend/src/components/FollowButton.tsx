import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import followService from '../services/follow.service';
import { toast } from 'sonner';

interface FollowButtonProps {
    userId: string;
    initialStatus?: string; // "NONE" | "FOLLOWING" | "REQUESTED"
    onStatusChange?: (newStatus: string) => void;
    className?: string;
    showIcon?: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({
    userId,
    initialStatus,
    onStatusChange,
    className = "",
    showIcon = true
}) => {
    const [status, setStatus] = useState<string>(initialStatus || "NONE");
    const [loading, setLoading] = useState(false);
    const [showUnfollowModal, setShowUnfollowModal] = useState(false);
    const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);

    // If initialStatus is not provided, fetch it
    useEffect(() => {
        if (initialStatus === undefined) {
            checkStatus();
        } else {
            setStatus(initialStatus);
        }
    }, [initialStatus, userId]);

    const checkStatus = async () => {
        try {
            const s = await followService.getRelationshipStatus(userId);
            setStatus(s);
        } catch (error) {
            console.error("Failed to fetch follow status", error);
        }
    };

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (status === "NONE" || status === "FOLLOW_BACK") {
            setLoading(true);
            try {
                const response = await followService.followUser(userId);
                setStatus(response.status);
                if (response.status === "REQUESTED") {
                    toast.success("Follow request sent");
                } else {
                    toast.success(status === "FOLLOW_BACK" ? "Followed back!" : "You are now following this user");
                }
                onStatusChange?.(response.status);
            } catch (error: any) {
                if (error.response?.status === 429) {
                    toast.error(error.response.data.message || "You can't send another request right now");
                } else {
                    toast.error("Failed to follow user");
                }
            } finally {
                setLoading(false);
            }
        } else if (status === "FOLLOWING") {
            setShowUnfollowModal(true);
        } else if (status === "REQUESTED") {
            setShowCancelRequestModal(true);
        }
    };

    const confirmUnfollow = async () => {
        setLoading(true);
        try {
            await followService.unfollowUser(userId);
            // After unfollowing, check if they still follow us to show FOLLOW_BACK or NONE
            const s = await followService.getRelationshipStatus(userId);
            setStatus(s);
            toast.success("Unfollowed");
            onStatusChange?.(s);
        } catch (error) {
            toast.error("Failed to unfollow");
        } finally {
            setLoading(false);
            setShowUnfollowModal(false);
        }
    };

    const confirmCancelRequest = async () => {
        setLoading(true);
        try {
            await followService.cancelRequest(userId);
            // After cancelling, check if they follow us
            const s = await followService.getRelationshipStatus(userId);
            setStatus(s);
            toast.success("Follow request cancelled");
            onStatusChange?.(s);
        } catch (error) {
            toast.error("Failed to cancel request");
        } finally {
            setLoading(false);
            setShowCancelRequestModal(false);
        }
    };

    // Button Styles based on state
    const getButtonStyles = () => {
        if (status === "FOLLOWING") {
            return "bg-white border border-[#e8e4f0] text-[#1f1b2a] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm";
        }
        if (status === "REQUESTED") {
            return "bg-white border border-[#e8e4f0] text-[#6e6189] hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 shadow-sm";
        }
        if (status === "FOLLOW_BACK") {
            return "bg-[#fff8e1] border border-[#f5c84b]/50 text-[#1f1b2a] hover:bg-[#f5c84b] font-black tracking-tight";
        }
        return "bg-[#f5c84b] border border-[#f5c84b] text-[#1f1b2a] hover:bg-[#f4b82a] font-black tracking-tight shadow-md shadow-[#f5c84b]/10 hover:shadow-lg active:scale-95 transition-all";
    };

    const getButtonText = () => {
        if (loading) return "";
        if (status === "FOLLOWING") return "Following";
        if (status === "REQUESTED") return "Requested";
        if (status === "FOLLOW_BACK") return "Follow Back";
        return "Follow";
    };

    const getIcon = () => {
        if (loading) return null;
        if (status === "FOLLOWING") return "person_check";
        if (status === "REQUESTED") return "schedule_send";
        if (status === "FOLLOW_BACK") return "person_add";
        return "person_add";
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={loading}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${getButtonStyles()} ${className} disabled:opacity-70`}
            >
                {loading ? (
                    <span className="w-3 h-3 border-2 border-inherit border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <>
                        {showIcon && <span className="material-symbols-outlined text-[16px]">{getIcon()}</span>}
                        {getButtonText()}
                    </>
                )}
            </button>

            {/* Unfollow Modal */}
            {showUnfollowModal && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#1f1b2a]/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !loading && setShowUnfollowModal(false)}
                    />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="pt-10 pb-8 px-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                                <span className="material-symbols-outlined text-4xl text-rose-500 font-filled">person_remove</span>
                            </div>
                            <h3 className="text-xl font-black text-[#1f1b2a] mb-2 tracking-tight">Unfollow?</h3>
                            <p className="text-sm text-[#8a8396] font-medium leading-relaxed px-4">
                                If you change your mind, you'll have to request to follow again.
                            </p>
                        </div>
                        <div className="flex flex-col border-t border-gray-100">
                            <button
                                onClick={confirmUnfollow}
                                disabled={loading}
                                className="w-full py-4 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors uppercase tracking-widest disabled:opacity-50"
                            >
                                {loading ? 'Removing...' : 'Unfollow'}
                            </button>
                            <button
                                onClick={() => setShowUnfollowModal(false)}
                                disabled={loading}
                                className="w-full py-4 text-sm font-bold text-[#1f1b2a] hover:bg-gray-50 transition-colors uppercase tracking-widest border-t border-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Cancel Request Modal */}
            {showCancelRequestModal && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#1f1b2a]/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !loading && setShowCancelRequestModal(false)}
                    />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="pt-10 pb-8 px-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                                <span className="material-symbols-outlined text-4xl text-amber-500 font-filled">cancel_schedule_send</span>
                            </div>
                            <h3 className="text-xl font-black text-[#1f1b2a] mb-2 tracking-tight">Cancel Request?</h3>
                            <p className="text-sm text-[#8a8396] font-medium leading-relaxed px-4">
                                If you change your mind, you'll have to request to follow again.
                            </p>
                        </div>
                        <div className="flex flex-col border-t border-gray-100">
                            <button
                                onClick={confirmCancelRequest}
                                disabled={loading}
                                className="w-full py-4 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors uppercase tracking-widest disabled:opacity-50"
                            >
                                {loading ? 'Cancelling...' : 'Cancel Request'}
                            </button>
                            <button
                                onClick={() => setShowCancelRequestModal(false)}
                                disabled={loading}
                                className="w-full py-4 text-sm font-bold text-[#1f1b2a] hover:bg-gray-50 transition-colors uppercase tracking-widest border-t border-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default FollowButton;
