import React, { useState } from 'react';
import { Article, ArticleType } from '../../src/services/article.service';

interface ArticleCardProps {
    article: Article;
    isOwner: boolean;
    onEdit?: (article: Article) => void;
    onDelete?: (id: number) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: number, selected: boolean) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, isOwner, onEdit, onDelete, isSelectionMode, isSelected, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getTypeColor = (type: ArticleType) => {
        switch (type) {
            case ArticleType.JOURNAL: return 'bg-blue-100 text-blue-700 border-blue-200';
            case ArticleType.CONFERENCE: return 'bg-purple-100 text-purple-700 border-purple-200';
            case ArticleType.PREPRINT: return 'bg-gray-100 text-gray-700 border-gray-200';
            case ArticleType.BOOK_CHAPTER: return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getTypeLabel = (type: ArticleType) => {
        switch (type) {
            case ArticleType.JOURNAL: return 'Journal Article';
            case ArticleType.CONFERENCE: return 'Conference Paper';
            case ArticleType.PREPRINT: return 'Preprint';
            case ArticleType.BOOK_CHAPTER: return 'Book Chapter';
            default: return type;
        }
    };

    return (
        <div className={`bg-white p-6 rounded-2xl border transition-all duration-300 group relative flex gap-4 ${isSelected ? 'border-[#f5c84b] bg-[#fffcf0] shadow-md' : 'border-[#e8e4f0] hover:shadow-lg hover:border-[#f5c84b]/30'}`}>
            {/* Selection Checkbox */}
            {isSelectionMode && (
                <div className="flex-shrink-0 pt-1">
                    <button
                        onClick={() => onSelect && article.id && onSelect(article.id, !isSelected)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-[#f5c84b] border-[#f5c84b] text-[#1f1b2a]' : 'bg-white border-[#e8e4f0] hover:border-[#f5c84b]'}`}
                    >
                        {isSelected && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                    </button>
                </div>
            )}

            <div className="flex-1 min-w-0">
                {/* Actions (Owner Only) */}
                {isOwner && !isSelectionMode && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onDelete && article.id) onDelete(article.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-[#e8e4f0] text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-full shadow-sm transition-all active:scale-95"
                            title="Delete Article"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                )}

                {/* Header / Meta */}
                <div className="flex flex-col gap-3 mb-4 pr-12">
                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getTypeColor(article.articleType)}`}>
                            {getTypeLabel(article.articleType)}
                        </span>
                        {article.doi && (
                            <a
                                href={`https://doi.org/${article.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-[#8a8396] hover:text-[#f5c84b] hover:underline flex items-center gap-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="material-symbols-outlined text-[14px]">link</span>
                                {article.doi}
                            </a>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-[#1f1b2a] leading-snug group-hover:text-[#f5c84b] transition-colors duration-300 cursor-pointer">
                        {article.title}
                    </h3>

                    <div className="text-xs text-[#6e6189] font-medium leading-relaxed">
                        <span className="text-[#1f1b2a] font-bold">{article.authors}</span>
                        <span className="mx-2 text-[#e8e4f0]">•</span>
                        <span className="font-bold">{article.publicationYear}</span>
                        {article.journalName && (
                            <>
                                <span className="mx-2 text-[#e8e4f0]">•</span>
                                <span className="italic text-[#8a8396]">{article.journalName}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Abstract */}
                <div className="relative mb-4">
                    <p className={`text-sm text-[#4a4555] leading-relaxed transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        {article.abstractText}
                    </p>
                    {article.abstractText && article.abstractText.length > 180 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="mt-2 text-[11px] font-black text-[#f5c84b] uppercase tracking-wider hover:text-[#d4a010] transition-colors focus:outline-none flex items-center gap-1"
                        >
                            {isExpanded ? (
                                <>Show Less <span className="material-symbols-outlined text-[14px]">expand_less</span></>
                            ) : (
                                <>Read More <span className="material-symbols-outlined text-[14px]">expand_more</span></>
                            )}
                        </button>
                    )}
                </div>

                {/* Footer Links */}
                {(article.externalUrl || article.publisher) && (
                    <div className="pt-4 border-t border-[#f5f5f5] flex items-center justify-between text-xs">
                        {article.publisher && (
                            <span className="text-[#8a8396] font-medium bg-[#faf8f5] px-2 py-1 rounded border border-[#e8e4f0]">
                                {article.publisher}
                            </span>
                        )}

                        {article.externalUrl && (
                            <a
                                href={article.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto flex items-center gap-1.5 text-[#1f1b2a] hover:text-[#f5c84b] font-bold transition-colors group/link"
                            >
                                View Source
                                <span className="material-symbols-outlined text-[16px] group-hover/link:translate-x-0.5 transition-transform">open_in_new</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArticleCard;
