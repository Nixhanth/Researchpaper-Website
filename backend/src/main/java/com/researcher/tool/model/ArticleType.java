package com.researcher.tool.model;

public enum ArticleType {
    JOURNAL("Journal Article"),
    CONFERENCE("Conference Paper"),
    PREPRINT("Preprint"),
    BOOK_CHAPTER("Book Chapter");

    private final String displayName;

    ArticleType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
