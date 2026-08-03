package com.researcher.tool.dto;

import java.time.LocalDateTime;

public class PostDto {
    private Long id;
    private UserSummaryDto author;
    private String content;
    private LocalDateTime createdAt;

    // Interaction Meta
    @com.fasterxml.jackson.annotation.JsonProperty("isLiked")
    private boolean liked;
    private long likeCount;
    private long commentCount;
    private long shareCount;
    private java.util.List<String> mentionedUsernames;

    public PostDto() {
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

    public UserSummaryDto getAuthor() {
        return author;
    }

    public void setAuthor(UserSummaryDto author) {
        this.author = author;
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

    @com.fasterxml.jackson.annotation.JsonProperty("isLiked")
    public boolean isLiked() {
        return liked;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("isLiked")
    public void setLiked(boolean liked) {
        this.liked = liked;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(long likeCount) {
        this.likeCount = likeCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(long commentCount) {
        this.commentCount = commentCount;
    }

    public long getShareCount() {
        return shareCount;
    }

    public void setShareCount(long shareCount) {
        this.shareCount = shareCount;
    }
}
