import api from './api';
import { Page } from './post.service';

export enum ArticleType {
    JOURNAL = 'JOURNAL',
    CONFERENCE = 'CONFERENCE',
    PREPRINT = 'PREPRINT',
    BOOK_CHAPTER = 'BOOK_CHAPTER'
}

export interface Article {
    id?: number;
    title: string;
    authors: string;
    publicationYear: number;
    articleType: ArticleType;
    abstractText: string;
    doi?: string;
    journalName?: string;
    publisher?: string;
    externalUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    source?: 'MANUAL' | 'PUBMED';
    pubmedId?: string;
    confirmed?: boolean;
}

const articleService = {
    createArticle: async (article: Article) => {
        return api.post<Article>('/api/articles', article).then(res => res.data);
    },
    updateArticle: async (id: number, article: Article) => {
        return api.put<Article>(`/api/articles/${id}`, article).then(res => res.data);
    },
    deleteArticle: async (id: number) => {
        return api.delete(`/api/articles/${id}`);
    },
    deleteArticlesBulk: async (ids: number[]) => {
        return api.post('/api/articles/delete-multiple', ids);
    },
    getMyArticles: async (page = 0, size = 5) => {
        return api.get<Page<Article>>(`/api/articles/me?page=${page}&size=${size}`).then(res => res.data);
    },
    getUserArticles: async (userId: string, page = 0, size = 5) => {
        return api.get<Page<Article>>(`/api/articles/user/${userId}?page=${page}&size=${size}`).then(res => res.data);
    },

    // PubMed Integration
    addPubMedArticles: async (pmids: string[]) => {
        return api.post<void>('/api/articles/pubmed/add-multiple', pmids);
    },

    searchPubMed: async (query: string, type: string = 'ALL', offset: number = 0, limit: number = 10, signal?: AbortSignal) => {
        return api.get<{ count: number, articles: Article[] }>(`/api/pubmed/search?query=${encodeURIComponent(query)}&type=${type}&offset=${offset}&limit=${limit}`, { signal }).then(res => res.data);
    },

    // Get existing PubMed IDs to check for already imported articles
    getMyPubMedIds: async () => {
        return api.get<string[]>('/api/articles/me/pubmed-ids').then(res => res.data);
    }
};

export default articleService;
