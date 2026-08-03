package com.researcher.tool.dto;

import com.researcher.tool.model.ArticleType;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public class ArticleDto {
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(min = 10, max = 500, message = "Title must be between 10 and 500 characters")
    private String title;

    @NotBlank(message = "Authors are required")
    private String authors;

    @NotNull(message = "Publication year is required")
    @Min(value = 1900, message = "Publication year must be 1900 or later")
    @Max(value = 2026, message = "Publication year cannot be in the future")
    private Integer publicationYear;

    @NotNull(message = "Article type is required")
    private ArticleType articleType;

    @NotBlank(message = "Abstract is required")
    @Size(min = 50, message = "Abstract must be at least 50 characters")
    private String abstractText;

    @Pattern(regexp = "^$|^10\\.\\d{4,9}/[-._;()/:A-Z0-9]+$", message = "Invalid DOI format")
    private String doi;

    private String journalName;
    private String publisher;

    @Pattern(regexp = "^$|^https?://.*", message = "External URL must be a valid HTTP/HTTPS URL")
    private String externalUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public ArticleDto() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthors() {
        return authors;
    }

    public void setAuthors(String authors) {
        this.authors = authors;
    }

    public Integer getPublicationYear() {
        return publicationYear;
    }

    public void setPublicationYear(Integer publicationYear) {
        this.publicationYear = publicationYear;
    }

    public ArticleType getArticleType() {
        return articleType;
    }

    public void setArticleType(ArticleType articleType) {
        this.articleType = articleType;
    }

    public String getAbstractText() {
        return abstractText;
    }

    public void setAbstractText(String abstractText) {
        this.abstractText = abstractText;
    }

    public String getDoi() {
        return doi;
    }

    public void setDoi(String doi) {
        this.doi = doi;
    }

    public String getJournalName() {
        return journalName;
    }

    public void setJournalName(String journalName) {
        this.journalName = journalName;
    }

    public String getPublisher() {
        return publisher;
    }

    public void setPublisher(String publisher) {
        this.publisher = publisher;
    }

    public String getExternalUrl() {
        return externalUrl;
    }

    public void setExternalUrl(String externalUrl) {
        this.externalUrl = externalUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
