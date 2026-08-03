/**
 * Validates the ORCID iD format and checksum (ISO 7064 Mod 11-2).
 */
export const isValidOrcid = (orcid: string): boolean => {
    if (!orcid) return false;

    // Standard format: 0000-0000-0000-0000 (last can be X)
    const pattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    if (!pattern.test(orcid)) return false;

    const digitsOnly = orcid.replace(/-/g, "");
    if (digitsOnly.length !== 16) return false;

    let total = 0;
    for (let i = 0; i < 15; i++) {
        const digit = parseInt(digitsOnly[i], 10);
        total = (total + digit) * 2;
    }

    const remainder = total % 11;
    const result = (12 - remainder) % 11;
    const expectedChecksum = result === 10 ? "X" : result.toString();
    const actualChecksum = digitsOnly[15];

    return actualChecksum === expectedChecksum;
};

/**
 * Cleans an ORCID input string (removes URL prefixes, trailing slashes, etc.)
 */
export const cleanOrcid = (input: string): string => {
    if (!input) return "";

    let clean = input.trim();

    // Remove URL prefixes
    if (clean.toLowerCase().includes("orcid.org/")) {
        clean = clean.substring(clean.toLowerCase().indexOf("orcid.org/") + 10);
    }

    // Remove trailing slash
    if (clean.endsWith("/")) {
        clean = clean.substring(0, clean.length - 1);
    }

    // Ensure standard format (add hyphens if missing but length is 16)
    if (clean.length === 16 && !clean.includes("-")) {
        clean =
            clean.substring(0, 4) +
            "-" +
            clean.substring(4, 8) +
            "-" +
            clean.substring(8, 12) +
            "-" +
            clean.substring(12, 16);
    }

    return clean;
};

/**
 * Checks if the ORCID exists in the registry.
 */
export const checkOrcidRegistry = async (orcid: string): Promise<boolean> => {
    try {
        const response = await fetch(`https://pub.orcid.org/v3.0/${orcid}/person`, {
            headers: {
                Accept: "application/json",
            },
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to fetch ORCID registry:", error);
        return false;
    }
};
