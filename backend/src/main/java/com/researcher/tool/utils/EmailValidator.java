package com.researcher.tool.utils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class EmailValidator {

    private static final Set<String> DISPOSABLE_DOMAINS = new HashSet<>(Arrays.asList(
            "mailinator.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org",
            "trashmail.com", "yopmail.com", "sharklasers.com", "getairmail.com"));

    public static boolean isDisposable(String email) {
        if (email == null || !email.contains("@"))
            return false;
        String domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
        return DISPOSABLE_DOMAINS.contains(domain);
    }
}
