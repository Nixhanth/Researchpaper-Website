import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import notificationService from '../services/notification.service';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    decrementCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const { isAuthenticated } = useAuth();

    const refreshUnreadCount = async () => {
        if (!isAuthenticated) return;
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            setUnreadCount(0);
        }
    };

    const decrementCount = () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    useEffect(() => {
        if (isAuthenticated) {
            refreshUnreadCount();
            // Polling for new notifications every 30 seconds
            const interval = setInterval(refreshUnreadCount, 10000);
            return () => clearInterval(interval);
        } else {
            setUnreadCount(0);
        }
    }, [isAuthenticated]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, decrementCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
