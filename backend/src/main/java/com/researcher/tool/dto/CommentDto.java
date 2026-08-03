package com.researcher.tool.dto;

import java.time.LocalDateTime;

public class CommentDto {
    private Long id;
    private Long postId;
    private UserSummaryDto user;
    private String content;
    private LocalDateTime createdAt;
    private java.util.List<String> mentionedUsernames;

    public CommentDto() {
    }

    public java.util.List<String> getMentionedUsernames() {
        return mentionedUsernames;
    }

    public void setMentionedUsernames(java.util.List<String> mentionedUsernames) {
        this.mentionedUsernames = mentionedUsernames;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public UserSummaryDto getUser() {
        return user;
    }

    public void setUser(UserSummaryDto user) {
        this.user = user;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
