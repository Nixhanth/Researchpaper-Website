package com.researcher.tool.utils;

import java.util.regex.Pattern;

public class OrcidValidator {

    private static final Pattern ORCID_PATTERN = Pattern.compile("^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$");

    /**
     * Validates the ORCID iD format and checksum.
     * ORCID must strictly follow: 0000-0000-0000-0000
     * Last character may be 'X'.
     *
     * @param orcid The ORCID iD string (e.g., "0000-0002-1825-0097")
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String orcid) {
        if (orcid == null || orcid.isEmpty()) {
            return false;
        }

        // 1. Basic format check
        if (!ORCID_PATTERN.matcher(orcid).matches()) {
            return false;
        }

        // 2. Checksum validation (ISO 7064 Mod 11-2)
        String digitsOnly = orcid.replace("-", "");
        if (digitsOnly.length() != 16) {
            return false;
        }

        int total = 0;
        for (int i = 0; i < 15; i++) {
            int digit = Character.getNumericValue(digitsOnly.charAt(i));
            total = (total + digit) * 2;
        }

        int remainder = total % 11;
        int result = (12 - remainder) % 11;
        char expectedChecksum = (result == 10) ? 'X' : (char) (result + '0');
        char actualChecksum = digitsOnly.charAt(15);

        return actualChecksum == expectedChecksum;
    }

    /**
     * Cleans an ORCID input string (removes URL prefixes, trailing slashes, etc.)
     * 
     * @param input Raw ORCID input (could be URL or just ID)
     * @return Formatted ORCID ID if extractable, or null
     */
    public static String clean(String input) {
        if (input == null)
            return null;

        String clean = input.trim();

        // Remove https://orcid.org/ or http://orcid.org/
        if (clean.toLowerCase().contains("orcid.org/")) {
            clean = clean.substring(clean.toLowerCase().indexOf("orcid.org/") + 10);
        }

        // Remove trailing slash
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }

        // Ensure standard format (add hyphens if missing but length is 16)
        if (clean.length() == 16 && !clean.contains("-")) {
            clean = clean.substring(0, 4) + "-" +
                    clean.substring(4, 8) + "-" +
                    clean.substring(8, 12) + "-" +
                    clean.substring(12, 16);
        }

        return clean;
    }
}
