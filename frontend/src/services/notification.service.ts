import api from './api';
import { UserSummary } from './follow.service';
import { Page } from './post.service';

export interface Notification {
    id: number;
    actor: UserSummary;
    type: 'FOLLOW' | 'MENTION_POST' | 'MENTION_COMMENT' | 'COMMENT' | 'SHARE' | 'FOLLOW_REQUEST' | 'FOLLOW_ACCEPTED' | 'FOLLOW_REJECTED' | 'LIKE' | 'NEW_POST' | 'UNFOLLOW' | 'FOLLOW_BACK';
    entityId: number;
    read: boolean;
    message: string;
    createdAt: string;
}

const notificationService = {
    getNotifications: async (page = 0, size = 20) => {
        return api.get<Page<Notification>>(`/api/v1/notifications?page=${page}&size=${size}`).then(res => res.data);
    },
    markAsRead: async (id: number) => {
        return api.post(`/api/v1/notifications/${id}/read`);
    },
    getUnreadCount: async () => {
        return api.get<{ count: number }>(`/api/v1/notifications/unread-count`).then(res => res.data.count);
    },
    markAllAsRead: async () => {
        return api.post(`/api/v1/notifications/read-all`);
    },
    deleteNotification: async (id: number) => {
        return api.delete(`/api/v1/notifications/${id}`);
    },
    deleteAllNotifications: async () => {
        return api.delete(`/api/v1/notifications/all`);
    },
    deleteNotifications: async (ids: number[]) => {
        return api.post(`/api/v1/notifications/delete-batch`, ids);
    }
};

export default notificationService;
