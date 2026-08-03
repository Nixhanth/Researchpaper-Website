import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: 'delete_forever',
                    iconBg: 'bg-red-50',
                    iconColor: 'text-red-500',
                    btnBg: 'bg-red-500 hover:bg-red-600',
                    ring: 'focus:ring-red-500/20'
                };
            case 'warning':
                return {
                    icon: 'warning',
                    iconBg: 'bg-amber-50',
                    iconColor: 'text-amber-500',
                    btnBg: 'bg-amber-500 hover:bg-amber-600',
                    ring: 'focus:ring-amber-500/20'
                };
            default:
                return {
                    icon: 'info',
                    iconBg: 'bg-blue-50',
                    iconColor: 'text-blue-500',
                    btnBg: 'bg-blue-500 hover:bg-blue-600',
                    ring: 'focus:ring-blue-500/20'
                };
        }
    };

    const styles = getTypeStyles();

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[#e8e4f0] animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 text-center">
                    <div className={`w-16 h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                        <span className={`material-symbols-outlined text-3xl ${styles.iconColor}`}>{styles.icon}</span>
                    </div>

                    <h3 className="text-xl font-bold text-[#1f1b2a] mb-2">{title}</h3>
                    <p className="text-[#6e6189] text-sm leading-relaxed mb-8">{message}</p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-[#f3f0f7] text-[#6e6189] rounded-xl font-bold hover:bg-[#e8e4f0] transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-6 py-3 ${styles.btnBg} text-white rounded-xl font-bold transition-all shadow-lg active:scale-95`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
