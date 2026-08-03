import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BlockInfo {
    status: string;
    message: string;
}

const AccountDisabledPage: React.FC = () => {
    const navigate = useNavigate();
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);

    useEffect(() => {
        // Get block info from session storage
        const storedInfo = sessionStorage.getItem('account_block_info');
        if (storedInfo) {
            setBlockInfo(JSON.parse(storedInfo));
        }
    }, []);

    const handleGoHome = () => {
        sessionStorage.removeItem('account_block_info');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-red-50 to-rose-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-red-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-white text-4xl">gavel</span>
                    </div>
                    <h1 className="text-2xl font-black text-white">Account Disabled</h1>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-[#6e6189] leading-relaxed">
                            {blockInfo?.message || 'Your account has been permanently disabled by an administrator.'}
                        </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                        <span className="material-symbols-outlined text-rose-500 text-3xl mb-2">block</span>
                        <p className="text-sm font-bold text-rose-700">
                            This action is permanent
                        </p>
                    </div>

                    <div className="bg-[#faf9f7] rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-[#1f1b2a] mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            What does this mean?
                        </h3>
                        <ul className="space-y-2 text-sm text-[#6e6189]">
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500">•</span>
                                You can no longer access this account
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500">•</span>
                                Your profile may have been removed from public view
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500">•</span>
                                This decision was made due to violation of our terms of service
                            </li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                        <p className="text-sm text-blue-700 flex items-start gap-2">
                            <span className="material-symbols-outlined text-lg">mail</span>
                            <span>
                                If you believe this is an error or would like to appeal, please contact{' '}
                                <a href="mailto:appeals@references.app" className="font-bold underline">
                                    appeals@references.app
                                </a>
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={handleGoHome}
                        className="w-full py-4 bg-[#1f1b2a] text-white font-bold rounded-xl hover:bg-[#322d42] transition active:scale-95"
                    >
                        Return to Homepage
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountDisabledPage;
