import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BlockInfo {
    status: string;
    message: string;
    blockedUntil?: string;
}

const AccountSuspendedPage: React.FC = () => {
    const navigate = useNavigate();
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        // Get block info from session storage
        const storedInfo = sessionStorage.getItem('account_block_info');
        if (storedInfo) {
            setBlockInfo(JSON.parse(storedInfo));
        }
    }, []);

    useEffect(() => {
        if (!blockInfo?.blockedUntil) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const endTime = new Date(blockInfo.blockedUntil!).getTime();
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeRemaining('Suspension has ended. You may try logging in again.');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeRemaining(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`);
            } else {
                setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [blockInfo]);

    const handleTryAgain = () => {
        sessionStorage.removeItem('account_block_info');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-white text-4xl">schedule</span>
                    </div>
                    <h1 className="text-2xl font-black text-white">Account Temporarily Suspended</h1>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-[#6e6189] leading-relaxed">
                            {blockInfo?.message || 'Your account has been temporarily suspended by an administrator.'}
                        </p>
                    </div>

                    {timeRemaining && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                                Time Remaining
                            </p>
                            <p className="text-2xl font-black text-amber-700 tabular-nums">
                                {timeRemaining}
                            </p>
                        </div>
                    )}

                    <div className="bg-[#faf9f7] rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-[#1f1b2a] mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            What does this mean?
                        </h3>
                        <ul className="space-y-2 text-sm text-[#6e6189]">
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500">•</span>
                                You cannot access your account during this period
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500">•</span>
                                Your profile and content remain intact
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500">•</span>
                                Access will be automatically restored when the suspension ends
                            </li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                        <p className="text-sm text-blue-700 flex items-start gap-2">
                            <span className="material-symbols-outlined text-lg">support_agent</span>
                            <span>
                                If you believe this is a mistake, please contact{' '}
                                <a href="mailto:support@references.app" className="font-bold underline">
                                    support@references.app
                                </a>
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={handleTryAgain}
                        className="w-full py-4 bg-[#1f1b2a] text-white font-bold rounded-xl hover:bg-[#322d42] transition active:scale-95"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountSuspendedPage;
