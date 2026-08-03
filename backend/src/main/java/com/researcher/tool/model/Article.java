package com.researcher.tool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "articles")
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    @NotBlank(message = "Title is required")
    @Size(min = 10, max = 500, message = "Title must be between 10 and 500 characters")
    private String title;

    @Column(nullable = false, length = 1000)
    @NotBlank(message = "Authors are required")
    private String authors;

    @Column(name = "publication_year", nullable = false)
    @NotNull(message = "Publication year is required")
    @Min(value = 1900, message = "Publication year must be 1900 or later")
    @Max(value = 2026, message = "Publication year cannot be in the future")
    private Integer publicationYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "article_type", nullable = false, length = 50)
    @NotNull(message = "Article type is required")
    private ArticleType articleType;

    @Column(name = "abstract_text", columnDefinition = "TEXT", nullable = false)
    @NotBlank(message = "Abstract is required")
    @Size(min = 50, message = "Abstract must be at least 50 characters")
    private String abstractText;

    @Column(length = 100)
    @Pattern(regexp = "^$|^10\\.\\d{4,9}/[-._;()/:a-zA-Z0-9]+$", message = "Invalid DOI format")
    private String doi;

    @Column(name = "journal_name", length = 300)
    private String journalName;

    @Column(length = 200)
    private String publisher;

    @Column(name = "external_url", length = 1000)
    @Pattern(regexp = "^$|^https?://.*", message = "External URL must be a valid HTTP/HTTPS URL")
    private String externalUrl;

    // PubMed Integration Fields
    @Column(name = "source", length = 50)
    private String source = "MANUAL"; // MANUAL or PUBMED

    @Column(name = "pubmed_id", unique = true)
    private String pubmedId; // PubMed ID for tracking

    @Column(name = "raw_metadata", columnDefinition = "TEXT")
    private String rawMetadata; // Full PubMed response

    @Column(name = "confirmed")
    private Boolean confirmed = true; // Auto-true for manual, also true for new PubMed flow per user request

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Article() {
    }

    public Article(String title, String authors, Integer publicationYear,
            ArticleType articleType, String abstractText) {
        this.title = title;
        this.authors = authors;
        this.publicationYear = publicationYear;
        this.articleType = articleType;
        this.abstractText = abstractText;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
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

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getPubmedId() {
        return pubmedId;
    }

    public void setPubmedId(String pubmedId) {
        this.pubmedId = pubmedId;
    }

    public String getRawMetadata() {
        return rawMetadata;
    }

    public void setRawMetadata(String rawMetadata) {
        this.rawMetadata = rawMetadata;
    }

    public Boolean getConfirmed() {
        return confirmed;
    }

    public void setConfirmed(Boolean confirmed) {
        this.confirmed = confirmed;
    }
}
