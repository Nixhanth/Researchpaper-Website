import api from './api';

export interface FeedActivity {
    id: string;
    actorId: string;
    actorName: string;
    actorAvatar: string;
    type: 'PUBLICATION' | 'FOLLOW';
    targetId: string;
    targetName: string;
    content: string;
    timestamp: string;
}

const feedService = {
    getFeed: async (page = 0, size = 10) => {
        // MOCK FEED FOR FRONTEND-ONLY MODE
        return {
            content: [
                {
                    id: '1',
                    actorId: 'user-2',
                    actorName: 'Alice Smith',
                    actorAvatar: '',
                    type: 'PUBLICATION',
                    targetId: 'pub-1',
                    targetName: 'Advances in AI',
                    content: 'Published a new paper on Agentic Workflows.',
                    timestamp: new Date().toISOString()
                }
            ],
            totalPages: 1,
            totalElements: 1
        };
        // const response = await api.get(`/feed?page=${page}&size=${size}`);
        // return response.data;
    }
};

export default feedService;
