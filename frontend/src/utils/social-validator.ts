
/**
 * Basic URL validation pattern
 */
export const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return urlRegex.test(url);
};

/**
 * Validates Google Scholar URL format and domain
 */
export const isValidScholarUrl = (url: string): boolean => {
    if (!url) return false;
    if (!isValidUrl(url)) return false;
    const lower = url.toLowerCase();
    return lower.includes("scholar.google.") || lower.includes("google.com/citations");
};

/**
 * Validates LinkedIn Profile URL format and domain
 */
export const isValidLinkedinUrl = (url: string): boolean => {
    if (!url) return false;
    if (!isValidUrl(url)) return false;
    const lower = url.toLowerCase();
    return lower.includes("linkedin.com/in/") || lower.includes("linkedin.com/profile/");
};

/**
 * Validates PubMed Author ID (should be numeric)
 */
export const isValidPubmedId = (id: string): boolean => {
    if (!id) return false;
    // Should not be a URL
    if (/^(http|https|www)/i.test(id) || id.includes(".com") || id.includes(".org")) {
        return false;
    }
    return /^\d+$/.test(id);
};

/**
 * Formats a URL to include https:// if missing
 */
export const formatUrl = (url: string): string => {
    if (!url || url.trim() === "") return "";
    let formatted = url.trim();
    if (!/^https?:\/\//i.test(formatted)) {
        formatted = 'https://' + formatted;
    }
    return formatted;
};
