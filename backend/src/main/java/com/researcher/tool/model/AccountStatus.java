package com.researcher.tool.model;

public enum AccountStatus {
    ACTIVE,
    ACTION_RESTRICTED, // Can login but limited actions
    TEMP_BANNED, // Cannot login until ban expires
    PERMANENT_BANNED, // Permanently banned, no login ever
    BLOCKED, // Deprecated - use TEMP_BANNED
    BANNED, // Deprecated - use PERMANENT_BANNED
    DELETED
}
