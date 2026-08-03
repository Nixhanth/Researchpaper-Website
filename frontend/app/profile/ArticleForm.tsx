import React, { useState } from "react";
import { Article } from "../../src/services/article.service";
import articleService from "../../src/services/article.service";
import { toast } from "sonner";

interface ArticleFormProps {
    article?: Article;
    onSave: (article: Article) => Promise<void>;
    onCancel: () => void;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ article, onSave, onCancel }) => {
    const [pmid, setPmid] = useState("");
    const [fetching, setFetching] = useState(false);
    const [fetchedArticle, setFetchedArticle] = useState<Article | null>(null);

    // If editing, we still show the manual form fields? 
    // The user said "he cant add article without pubmed". 
    // Let's assume for NEW articles they must use PMID.
    // For EXISTING articles, they might want to edit details.

    const handleFetch = async () => {
        if (!pmid.trim()) {
            toast.error("Please enter a PubMed ID");
            return;
        }

        try {
            setFetching(true);
            const data = await articleService.fetchByPmid(pmid.trim());
            setFetchedArticle(data);
            toast.success("Publication found!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to fetch from PubMed. Please check the ID.");
        } finally {
            setFetching(false);
        }
    };

    const handleConfirm = async () => {
        if (fetchedArticle) {
            // In our new flow, fetchByPmid already saves it as PENDING in the backend.
            // So onSave just needs to notify the parent to refresh.
            await onSave(fetchedArticle);
        }
    };

    if (article) {
        // Edit mode (legacy or for small tweaks) - keep manual if needed or just show info
        return (
            <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                        Editing article details. Note: New articles must be added via PubMed ID.
                    </p>
                </div>
                {/* Simplified edit form or just info? Let's keep it simple for now and just allow cancel */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="font-bold">{article.title}</h5>
                    <p className="text-sm text-gray-600">{article.authors}</p>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-600">Cancel</button>
                    <button disabled className="px-4 py-2 text-sm font-bold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                        Manual Editing Disabled
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!fetchedArticle ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[#6e6189] uppercase tracking-wider mb-2">
                            PubMed ID (PMID) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={pmid}
                                onChange={(e) => setPmid(e.target.value)}
                                className="flex-1 p-3 border border-[#e8e4f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c84b]/50"
                                placeholder="Enter PMID (e.g., 38123456)"
                            />
                            <button
                                onClick={handleFetch}
                                disabled={fetching}
                                className="px-6 py-2 bg-[#1f1b2a] text-white rounded-lg text-sm font-bold hover:bg-[#2f2b3a] transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {fetching && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                Fetch
                            </button>
                        </div>
                        <p className="text-[10px] text-[#8a8396] mt-2 italic">
                            Find the PMID on pubmed.ncbi.nlm.nih.gov
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#ffe082] shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#f5c84b]/20 text-[#1f1b2a] rounded uppercase">Preview</span>
                            <button onClick={() => setFetchedArticle(null)} className="text-xs text-[#6e6189] hover:underline">Change ID</button>
                        </div>
                        <h5 className="font-bold text-[#1f1b2a] leading-tight">{fetchedArticle.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{fetchedArticle.authors}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{fetchedArticle.publicationYear}</span>
                            <span>•</span>
                            <span className="italic">{fetchedArticle.journalName}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex gap-3 items-start">
                        <span className="material-symbols-outlined text-green-600">info</span>
                        <p className="text-xs text-green-800">
                            This article will be added to your profile as <strong>Pending</strong>. You will need to confirm it from your profile page once added.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#e8e4f0]">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-[#e8e4f0] rounded-lg text-sm font-semibold text-[#6e6189] hover:bg-[#faf9f7] transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2.5 bg-[#f5c84b] text-[#1f1b2a] rounded-lg text-sm font-bold hover:bg-[#f4b82a] transition shadow-md"
                        >
                            Add to Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleForm;
