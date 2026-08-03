import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileCompletionModal: React.FC = () => {
    const { user, isAuthenticated, profileCompleted, alertDismissed, dismissAlert } = useAuth();
    const navigate = useNavigate();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !alertDismissed) {
            const completion = user?.profileCompletion || 0;
            // Check if user is not fully verified (Institutional Email and ORCID)
            const isEmailVerified = user?.verificationStatus?.email === 'VERIFIED';
            const isOrcidVerified = user?.verificationStatus?.orcid === 'VERIFIED';
            const isFullyVerified = isEmailVerified && isOrcidVerified;

            // Trigger alert if completion < 90% OR not fully verified
            if (completion < 90 || !isFullyVerified) {
                // Show modal after a short delay for better UX
                const timer = setTimeout(() => setShow(true), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthenticated, user, alertDismissed]);

    if (!show) return null;

    const completion = user?.profileCompletion || 0;
    const isEmailVerified = user?.verificationStatus?.email === 'VERIFIED';
    const isOrcidVerified = user?.verificationStatus?.orcid === 'VERIFIED';

    // Determine intensity based on completion
    let intensity: 'strong' | 'medium' | 'soft' = 'soft';
    if (completion < 60) intensity = 'strong';
    else if (completion < 80) intensity = 'medium';

    const handleCompleteNow = () => {
        setShow(false);
        // Navigate to profile page and signal to open edit mode
        navigate('/profile', { state: { editMode: true } });
    };

    const handleLater = () => {
        setShow(false);
        dismissAlert();
    };

    const intensityConfig = {
        strong: {
            title: "Enhance Your Research Impact",
            description: "Your profile is currently incomplete. Identifying yourself clearly helps other researchers find your work and increases your citation potential.",
            color: "bg-red-50 text-red-900",
            icon: "warning",
            buttonClass: "bg-red-600 hover:bg-red-700 text-white"
        },
        medium: {
            title: "Almost There!",
            description: "You've shared some great info, but adding more detail will help you stand out. Complete your profile to unlock full platform features.",
            color: "bg-amber-50 text-amber-900",
            icon: "info",
            buttonClass: "bg-amber-600 hover:bg-amber-700 text-white"
        },
        soft: {
            title: "Build Research Trust",
            description: "A complete profile builds trust in the research community. Just a few more details to reach 100% and gain full platform credibility!",
            color: "bg-blue-50 text-blue-900",
            icon: "verified",
            buttonClass: "bg-primary hover:bg-primary-hover text-white"
        }
    };

    const config = intensityConfig[intensity];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop - clicking outside disabled per request */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 24 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 24 }}
                    className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden"
                >
                    {/* Header Section */}
                    <div className={`p-10 ${config.color} border-b border-black/5 relative`}>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-outlined text-[120px] rotate-12">
                                {config.icon}
                            </span>
                        </div>

                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/60 flex items-center justify-center mb-6 shadow-sm">
                                <span className={`material-symbols-outlined text-3xl ${intensity === 'strong' ? 'text-red-600' : intensity === 'medium' ? 'text-amber-600' : 'text-primary'}`}>
                                    {config.icon}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight mb-4">{config.title}</h2>
                            <p className="text-xl opacity-90 leading-relaxed max-w-[90%]">
                                {config.description}
                            </p>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-10">
                        {/* Progress Visualization */}
                        <div className="mb-10">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <span className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Current Strength</span>
                                    <span className="text-4xl font-black text-gray-900">{completion}%</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-primary mb-1">Target</span>
                                    <span className="text-xl font-black text-primary">100%</span>
                                </div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden p-1 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completion}%` }}
                                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                    className="h-full bg-primary rounded-full relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Critical Actions Required */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isOrcidVerified ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                <span className="material-symbols-outlined">
                                    {isOrcidVerified ? 'verified' : 'pending'}
                                </span>
                                <span className="font-bold text-sm">ORCID iD Verification</span>
                            </div>
                            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isEmailVerified ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                <span className="material-symbols-outlined">
                                    {isEmailVerified ? 'verified' : 'pending'}
                                </span>
                                <span className="font-bold text-sm">Institutional Email</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleCompleteNow}
                                className={`flex-[2] h-16 rounded-2xl font-black text-xl transition-all active:scale-[0.98] shadow-xl ${config.buttonClass} flex items-center justify-center gap-3`}
                            >
                                <span>Complete Now</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                            <button
                                onClick={handleLater}
                                className="flex-1 h-16 rounded-2xl font-bold text-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Later
                            </button>
                        </div>

                        <p className="text-center mt-8 text-sm font-medium text-gray-400">
                            We'll remind you again in your next session.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProfileCompletionModal;
