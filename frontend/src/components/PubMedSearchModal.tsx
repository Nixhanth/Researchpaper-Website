import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import articleService, { Article } from '../services/article.service';
import { toast } from 'sonner';
import ConfirmationModal from './ConfirmationModal';

interface PubMedSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onArticlesAdded: () => void;
}

interface ActiveFilter {
    id: string;
    type: string;
    term: string;
    tag: string;
    label: string;
}

interface CachedPage {
    articles: Article[];
    timestamp: number;
}

interface SearchCache {
    query: string;
    totalCount: number;
    pages: Map<number, CachedPage>;
    timestamp: number;
}

const FIELD_OPTIONS = [
    { label: 'All Fields', value: 'ALL', tag: '' },
    { label: 'Paper Title', value: 'TITLE', tag: '[TI]' },
    { label: 'Author Name', value: 'AUTHOR', tag: '[AU]' },
    { label: 'Institution / College', value: 'INSTITUTION', tag: '[AD]' },
    { label: 'Author Email', value: 'EMAIL', tag: '[AD]' },
    { label: 'ORCID ID', value: 'ORCID', tag: '[AUID]' },
    { label: 'PMID', value: 'PMID', tag: '[PMID]' },
    { label: 'DOI', value: 'DOI', tag: '[AID]' },
    { label: 'Journal Name', value: 'JOURNAL', tag: '[TA]' },
    { label: 'Publication Year', value: 'YEAR', tag: '[DP]' },
    { label: 'Abstract Keywords', value: 'ABSTRACT', tag: '[AB]' },
    { label: 'MeSH Terms', value: 'MESH', tag: '[MeSH Terms]' },
    { label: 'Grant Number', value: 'GRANT', tag: '[Grant Number]' },
];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-[#f5c84b]/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#f5c84b] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <p className="mt-6 text-[#1f1b2a] font-bold text-sm tracking-wide animate-pulse">Searching PubMed...</p>
    </div>
);

const PubMedSearchModal: React.FC<PubMedSearchModalProps> = ({ isOpen, onClose, onArticlesAdded }) => {
    // Search State
    const [inputType, setInputType] = useState('ALL');
    const [inputTerm, setInputTerm] = useState('');
    const [filters, setFilters] = useState<ActiveFilter[]>([]);

    // Results State
    const [results, setResults] = useState<Article[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Pagination
    const [offset, setOffset] = useState(0);
    const limit = 10;

    // Selection
    const [selectedPmids, setSelectedPmids] = useState<Set<string>>(new Set());
    const [alreadyImportedPmids, setAlreadyImportedPmids] = useState<Set<string>>(new Set());
    const [expandedAbstract, setExpandedAbstract] = useState<number | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null);
    const searchCacheRef = useRef<SearchCache | null>(null);
    const retryCountRef = useRef(0);
    const maxRetries = 3;

    // Fetch already imported PubMed IDs on open
    useEffect(() => {
        if (isOpen) {
            setFilters([{ id: 'default', type: 'ALL', term: '', tag: '', label: 'All Fields' }]);
            setInputTerm('');
            setResults([]);
            setTotalCount(0);
            setHasSearched(false);
            setSearchError(null);
            setSelectedPmids(new Set());
            searchCacheRef.current = null;
            retryCountRef.current = 0;
            setOffset(0);

            // Fetch already imported PMIDs
            articleService.getMyPubMedIds()
                .then(pmids => setAlreadyImportedPmids(new Set(pmids)))
                .catch(err => console.error('Failed to fetch existing PubMed IDs', err));
        }
    }, [isOpen]);

    const handleAddFilter = () => {
        if (!inputTerm.trim()) return;
        const option = FIELD_OPTIONS.find(o => o.value === inputType);
        if (!option) return;

        const newFilter: ActiveFilter = {
            id: Date.now().toString(),
            type: inputType,
            term: inputTerm.trim(),
            tag: option.tag,
            label: `${option.label}: ${inputTerm.trim()}`
        };

        // Remove default empty filter if present
        const cleanFilters = filters.filter(f => f.id !== 'default' && f.term !== '');
        setFilters([...cleanFilters, newFilter]);
        setInputTerm('');
    };

    const handleRemoveFilter = (id: string) => {
        const newFilters = filters.filter(f => f.id !== id);
        setFilters(newFilters.length > 0 ? newFilters : [{ id: 'default', type: 'ALL', term: '', tag: '', label: 'All Fields' }]);
    };

    const buildQuery = useCallback(() => {
        const activeFilters = filters.filter(f => f.term.trim() !== '');
        if (activeFilters.length === 0 && inputTerm.trim()) {
            return inputTerm.trim();
        }
        if (activeFilters.length === 0) return '';
        return activeFilters
            .map(f => f.tag ? `${f.term}${f.tag}` : f.term)
            .join(' AND ');
    }, [filters, inputTerm]);

    const handleSearch = useCallback(async (newOffset = 0, isRetry = false) => {
        const query = buildQuery();
        if (!query) {
            toast.error('Please add a filter or enter a search term');
            return;
        }

        const cache = searchCacheRef.current;
        if (!isRetry && cache && cache.query === query && Date.now() - cache.timestamp < CACHE_TTL_MS) {
            const cachedPage = cache.pages.get(newOffset);
            if (cachedPage && Date.now() - cachedPage.timestamp < CACHE_TTL_MS) {
                setResults(cachedPage.articles);
                setTotalCount(cache.totalCount);
                setOffset(newOffset);
                setSearchError(null);
                return;
            }
        }

        setLoading(true);
        setHasSearched(true);
        setSearchError(null);
        setExpandedAbstract(null);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const response = await articleService.searchPubMed(
                query,
                'ALL',
                newOffset,
                limit,
                abortControllerRef.current.signal
            );

            retryCountRef.current = 0;

            if (response.count > 0 && (!response.articles || response.articles.length === 0)) {
                if (newOffset > 0 && retryCountRef.current < maxRetries) {
                    retryCountRef.current++;
                    setTimeout(() => handleSearch(newOffset, true), 1000 * retryCountRef.current);
                    return;
                }
                setSearchError(`Found ${response.count.toLocaleString()} matches, but failed to retrieve details.`);
                setResults([]);
                setTotalCount(response.count);
            } else {
                setResults(response.articles || []);
                setTotalCount(response.count || 0);

                if (!cache || cache.query !== query) {
                    searchCacheRef.current = {
                        query,
                        totalCount: response.count || 0,
                        pages: new Map(),
                        timestamp: Date.now()
                    };
                }
                searchCacheRef.current!.pages.set(newOffset, {
                    articles: response.articles || [],
                    timestamp: Date.now()
                });
            }
            setOffset(newOffset);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                if (retryCountRef.current < maxRetries) {
                    retryCountRef.current++;
                    setTimeout(() => handleSearch(newOffset, true), 1000 * retryCountRef.current);
                    return;
                }
                setSearchError("Failed to connect to PubMed. Please check your network.");
                setResults([]);
                setTotalCount(0);
            }
        } finally {
            setLoading(false);
        }
    }, [buildQuery]);

    const handlePageChange = useCallback((newOffset: number) => {
        setExpandedAbstract(null);
        handleSearch(newOffset);
    }, [handleSearch]);

    const handleImport = async () => {
        if (selectedPmids.size === 0) return;
        setImporting(true);
        try {
            const pmids = Array.from(selectedPmids);
            await articleService.addPubMedArticles(pmids);
            toast.success(`Successfully imported ${pmids.length} publications`);
            onArticlesAdded();
            onClose();
        } catch (error) {
            console.error('Import failed', error);
            toast.error('Failed to import publications');
        } finally {
            setImporting(false);
        }
    };

    const toggleSelection = (pmid: string) => {
        // Don't allow selecting already imported articles
        if (alreadyImportedPmids.has(pmid)) return;

        const newSet = new Set(selectedPmids);
        if (newSet.has(pmid)) newSet.delete(pmid);
        else newSet.add(pmid);
        setSelectedPmids(newSet);
    };

    const handleClearAndReset = () => {
        setFilters([{ id: 'default', type: 'ALL', term: '', tag: '', label: 'All Fields' }]);
        setInputTerm('');
        setResults([]);
        setTotalCount(0);
        setHasSearched(false);
        setSearchError(null);
        setOffset(0);
        searchCacheRef.current = null;
    };

    if (!isOpen) return null;

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);
    const canGoPrev = offset > 0;
    const canGoNext = offset + limit < totalCount;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
            <div className="absolute inset-0 bg-[#1f1b2a]/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-5xl bg-[#faf9f7] rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#e8e4f0]">
                {/* Header */}
                <div className="px-8 py-6 bg-white border-b border-[#f3f0f7] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-[#1f1b2a] tracking-tight">Add Publications</h2>
                        <p className="text-[#6e6189] font-medium mt-1">Search and import directly from PubMed</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#faf8f5] text-[#1f1b2a] hover:bg-[#f3f0f7] transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="p-6 bg-[#fffcf0] border-b border-[#f5c84b]/10 space-y-4 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative shrink-0 w-full sm:w-48">
                            <select
                                value={inputType}
                                onChange={(e) => setInputType(e.target.value)}
                                className="w-full h-12 pl-4 pr-10 bg-white border border-[#e8e4f0] rounded-xl font-bold text-[#1f1b2a] focus:border-[#f5c84b] focus:outline-none appearance-none cursor-pointer transition-colors"
                            >
                                {FIELD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a94a9] pointer-events-none material-symbols-outlined">expand_more</span>
                        </div>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputTerm}
                                onChange={(e) => setInputTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                                placeholder="Enter keywords, title, or author..."
                                className="w-full h-12 pl-5 pr-12 bg-white border border-[#e8e4f0] rounded-xl font-bold text-[#1f1b2a] placeholder-[#9a94a9] focus:border-[#f5c84b] focus:outline-none transition-colors"
                            />
                            {inputTerm && (
                                <button onClick={() => setInputTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleAddFilter}
                            disabled={!inputTerm.trim()}
                            className="h-12 w-12 flex items-center justify-center bg-white border border-[#e8e4f0] text-[#f5c84b] rounded-xl hover:border-[#f5c84b] hover:bg-[#fffcf0] disabled:opacity-50 disabled:bg-[#faf9f7] transition-all shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined font-bold">add</span>
                        </button>
                    </div>

                    {/* Active Filters & Search Info */}
                    <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
                        {filters.map(filter => (
                            <div key={filter.id} className="animate-in fade-in zoom-in-95 duration-200 inline-flex items-center h-8 pl-3 pr-1 bg-white border border-[#f5c84b]/30 rounded-lg text-xs font-bold text-[#1f1b2a] shadow-sm">
                                <span className="mr-1 opacity-50 uppercase tracking-tight">{filter.type !== 'ALL' ? filter.type : 'Filter'}:</span>
                                {filter.term || 'All'}
                                <button onClick={() => handleRemoveFilter(filter.id)} className="ml-2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-rose-50 text-rose-400">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </div>
                        ))}
                        {filters.length > 0 && filters[0].term !== '' && (
                            <button onClick={() => setShowClearConfirm(true)} className="text-xs font-bold text-rose-400 hover:text-rose-500 ml-auto hover:underline">
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-bold text-[#6e6189]">
                            {hasSearched ? (
                                loading ? 'Searching...' : `${totalCount.toLocaleString()} result(s) found`
                            ) : 'Ready to search'}
                        </span>
                        <button
                            onClick={() => { retryCountRef.current = 0; handleSearch(0); }}
                            disabled={loading || (filters.length === 0 && !inputTerm.trim() && filters[0]?.term === '')}
                            className="px-8 py-3 bg-[#f5c84b] text-[#1f1b2a] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#f4b82a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#f5c84b]/20 flex items-center gap-2 active:scale-95"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-[#1f1b2a] border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            )}
                            {loading ? 'Searching' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#faf8f5] custom-scrollbar">
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            {!hasSearched && !searchError && (
                                <div className="flex flex-col items-center justify-center py-24 text-center opacity-60">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 border border-[#e8e4f0] shadow-sm">
                                        <span className="material-symbols-outlined text-4xl text-[#f5c84b]">manage_search</span>
                                    </div>
                                    <h3 className="text-lg font-black text-[#1f1b2a] mb-2">Start Your Search</h3>
                                    <p className="text-[#6e6189] max-w-sm text-sm">Add filters (Author, Title, Year) to find specific publications.</p>
                                </div>
                            )}

                            {searchError && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 border border-rose-100">
                                        <span className="material-symbols-outlined text-4xl text-rose-400">error_outline</span>
                                    </div>
                                    <h3 className="text-lg font-black text-[#1f1b2a] mb-2">Search Error</h3>
                                    <p className="text-rose-500 font-medium max-w-md px-4 mb-6">{searchError}</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleSearch(offset, true)} className="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-bold hover:bg-rose-200 transition text-sm">
                                            Retry
                                        </button>
                                        <button onClick={handleClearAndReset} className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition text-sm">
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            )}

                            {hasSearched && !searchError && results.length === 0 && totalCount === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 border border-[#e8e4f0]">
                                        <span className="material-symbols-outlined text-4xl text-[#c4c0cc]">search_off</span>
                                    </div>
                                    <h3 className="text-lg font-black text-[#1f1b2a] mb-2">No Results Found</h3>
                                    <p className="text-[#6e6189] max-w-sm text-sm">Try using broader search terms or removing some filters.</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {results.map((article, idx) => {
                                    const isAlreadyImported = article.pubmedId && alreadyImportedPmids.has(article.pubmedId);
                                    const isSelected = article.pubmedId && selectedPmids.has(article.pubmedId);

                                    return (
                                        <div
                                            key={article.pubmedId || idx}
                                            className={`group relative bg-white rounded-2xl p-6 border transition-all duration-300 ${isAlreadyImported
                                                    ? 'border-emerald-200 bg-emerald-50/30 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'border-[#f5c84b] shadow-md bg-[#fffdf5] cursor-pointer'
                                                        : 'border-[#e8e4f0] hover:border-[#f5c84b]/50 hover:shadow-md cursor-pointer'
                                                }`}
                                            onClick={() => !isAlreadyImported && article.pubmedId && toggleSelection(article.pubmedId)}
                                        >
                                            {/* Already Imported Badge */}
                                            {isAlreadyImported && (
                                                <div className="absolute -top-2 -right-2 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                    Already Added
                                                </div>
                                            )}

                                            <div className="flex gap-5">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <h4 className={`text-lg font-bold leading-tight transition-colors ${isAlreadyImported
                                                                ? 'text-[#1f1b2a]/70'
                                                                : 'text-[#1f1b2a] group-hover:text-[#f4b82a]'
                                                            }`}>{article.title}</h4>
                                                        <div className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAlreadyImported
                                                                ? 'bg-emerald-500 border-emerald-500'
                                                                : isSelected
                                                                    ? 'bg-[#f5c84b] border-[#f5c84b]'
                                                                    : 'border-[#e8e4f0] group-hover:border-[#f5c84b]/50'
                                                            }`}>
                                                            {(isAlreadyImported || isSelected) && (
                                                                <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`text-[13px] mt-2 font-medium leading-relaxed ${isAlreadyImported ? 'text-[#6e6189]/70' : 'text-[#6e6189]'}`}>{article.authors}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#faf8f5] text-[#1f1b2a] border border-[#e8e4f0] uppercase tracking-wider">
                                                            {article.journalName || 'Unknown Journal'}
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#faf8f5] text-[#6e6189] border border-[#e8e4f0]">
                                                            {article.publicationYear}
                                                        </span>
                                                        {article.pubmedId && <span className="text-[10px] font-medium text-[#c0b8ce] ml-auto">PMID: {article.pubmedId}</span>}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-[#f8f6f2] flex items-center justify-between">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedAbstract(expandedAbstract === idx ? null : idx);
                                                            }}
                                                            className="text-[11px] font-bold text-[#f5c84b] hover:underline uppercase tracking-wider focus:outline-none"
                                                        >
                                                            {expandedAbstract === idx ? 'Hide Abstract' : 'Read Abstract'}
                                                        </button>
                                                        {article.doi && <span className="text-[10px] font-bold text-[#c0b8ce] uppercase tracking-wider">DOI: {article.doi}</span>}
                                                    </div>

                                                    {expandedAbstract === idx && (
                                                        <div className="mt-3 p-4 bg-[#fffcf0] rounded-xl text-sm text-[#4a4555] leading-relaxed border border-[#f5c84b]/10 animate-in slide-in-from-top-1">
                                                            {article.abstractText || "No abstract available"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-white border-t border-[#f3f0f7] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(offset - limit)}
                            disabled={loading || !canGoPrev}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e8e4f0] bg-white text-[#1f1b2a] disabled:opacity-30 hover:bg-[#faf9f7] transition"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold text-[#1f1b2a] px-2">
                            {totalCount > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
                        </span>
                        <button
                            onClick={() => handlePageChange(offset + limit)}
                            disabled={loading || !canGoNext}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e8e4f0] bg-white text-[#1f1b2a] disabled:opacity-30 hover:bg-[#faf9f7] transition"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-[#6e6189] font-bold hover:bg-[#f3f0f7] rounded-xl transition text-sm">Cancel</button>
                        <button
                            onClick={handleImport}
                            disabled={importing || selectedPmids.size === 0}
                            className="px-8 py-3 bg-[#1f1b2a] text-[#f5c84b] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-black/10 flex items-center gap-2 active:scale-95"
                        >
                            {importing ? (
                                <span className="w-5 h-5 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">download</span>
                            )}
                            Import ({selectedPmids.size})
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={() => { handleClearAndReset(); setShowClearConfirm(false); }}
                title="Clear Search?"
                message="This will reset all your active filters and search results."
                confirmText="Clear All"
                type="warning"
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e8e4f0; border-radius: 99px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }
                `
            }} />
        </div>,
        document.body
    );
};

export default PubMedSearchModal;
