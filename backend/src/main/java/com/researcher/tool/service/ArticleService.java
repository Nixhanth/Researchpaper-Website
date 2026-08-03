package com.researcher.tool.service;

import com.researcher.tool.dto.ArticleDto;
import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.model.Article;
import com.researcher.tool.model.User;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.repository.ArticleRepository;
import com.researcher.tool.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ArticleService {

        private final ArticleRepository articleRepository;
        private final UserRepository userRepository;
        private final PubMedService pubMedService;
        private final com.researcher.tool.repository.ResearcherProfileRepository profileRepository;
        private final com.researcher.tool.repository.UserArticleRepository userArticleRepository;

        public ArticleService(ArticleRepository articleRepository, UserRepository userRepository,
                        PubMedService pubMedService,
                        com.researcher.tool.repository.ResearcherProfileRepository profileRepository,
                        com.researcher.tool.repository.UserArticleRepository userArticleRepository) {
                this.articleRepository = articleRepository;
                this.userRepository = userRepository;
                this.pubMedService = pubMedService;
                this.profileRepository = profileRepository;
                this.userArticleRepository = userArticleRepository;
        }

        @Transactional
        public ArticleDto createArticle(String email, ArticleDto dto) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                validatePublicationYear(dto.getPublicationYear());

                // Check if global article with DOI already exists
                Article article;
                if (dto.getDoi() != null && !dto.getDoi().trim().isEmpty()) {
                        article = articleRepository.findById(1L).orElse(null); // Just a placeholder for search
                        // Actually search by DOI
                        // I'll add existsByDoi to ArticleRepository
                        article = articleRepository.findAll().stream()
                                        .filter(a -> dto.getDoi().equals(a.getDoi()))
                                        .findFirst()
                                        .orElse(null);
                } else {
                        article = null;
                }

                if (article == null) {
                        article = new Article(
                                        dto.getTitle(),
                                        dto.getAuthors(),
                                        dto.getPublicationYear(),
                                        dto.getArticleType(),
                                        dto.getAbstractText());

                        article.setDoi(dto.getDoi() != null && !dto.getDoi().trim().isEmpty() ? dto.getDoi().trim()
                                        : null);
                        article.setJournalName(dto.getJournalName() != null ? dto.getJournalName().trim() : null);
                        article.setPublisher(dto.getPublisher() != null ? dto.getPublisher().trim() : null);
                        article.setExternalUrl(dto.getExternalUrl() != null ? dto.getExternalUrl().trim() : null);
                        article.setConfirmed(true);
                        article = articleRepository.save(article);
                }

                if (userArticleRepository.existsByUserAndArticle(user, article)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Article already in your profile");
                }

                userArticleRepository.save(new com.researcher.tool.model.UserArticle(user, article));
                return mapToDto(article);
        }

        @Transactional
        public ArticleDto updateArticle(String email, Long id, ArticleDto dto) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                Article article = articleRepository.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Article not found"));

                // In the new many-to-many design, who can update an article?
                // For now, let's say anyone who has it in their profile if it's manual,
                // but realistically metadata should be shared.
                // We'll allow updates to global metadata for now but maybe restrict it later.

                validatePublicationYear(dto.getPublicationYear());

                article.setTitle(dto.getTitle());
                article.setAuthors(dto.getAuthors());
                article.setPublicationYear(dto.getPublicationYear());
                article.setArticleType(dto.getArticleType());
                article.setAbstractText(dto.getAbstractText());
                article.setDoi(dto.getDoi() != null && !dto.getDoi().trim().isEmpty() ? dto.getDoi().trim() : null);
                article.setJournalName(dto.getJournalName() != null ? dto.getJournalName().trim() : null);
                article.setPublisher(dto.getPublisher() != null ? dto.getPublisher().trim() : null);
                article.setExternalUrl(dto.getExternalUrl() != null ? dto.getExternalUrl().trim() : null);

                return mapToDto(articleRepository.save(article));
        }

        @Transactional
        public void deleteArticle(String email, Long id) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                Article article = articleRepository.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Article not found"));

                com.researcher.tool.model.UserArticle mapping = userArticleRepository
                                .findByUserAndArticle(user, article)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                "Article not in your profile"));

                userArticleRepository.delete(mapping);
        }

        @Transactional
        public void deleteArticles(String email, List<Long> ids) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                if (ids == null || ids.isEmpty())
                        return;

                for (Long id : ids) {
                        if (id == null)
                                continue;
                        articleRepository.findById(id).ifPresent(article -> {
                                userArticleRepository.findByUserAndArticle(user, article)
                                                .ifPresent(userArticleRepository::delete);
                        });
                }
        }

        @Transactional(readOnly = true)
        public PageResponse<ArticleDto> getMyArticles(String email, int page, int size) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                Pageable pageable = PageRequest.of(page, size, Sort.by("addedAt").descending());
                Page<com.researcher.tool.model.UserArticle> mappings = userArticleRepository
                                .findByUserOrderByAddedAtDesc(user, pageable);

                return new PageResponse<>(mappings.map(ua -> mapToDto(ua.getArticle())));
        }

        @Transactional(readOnly = true)
        public PageResponse<ArticleDto> getUserArticles(UUID userId, int page, int size) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                Pageable pageable = PageRequest.of(page, size, Sort.by("addedAt").descending());
                // For other users, only show confirmed articles
                Page<com.researcher.tool.model.UserArticle> mappings = userArticleRepository
                                .findByUserAndArticleConfirmedOrderByAddedAtDesc(user, true, pageable);

                return new PageResponse<>(mappings.map(ua -> mapToDto(ua.getArticle())));
        }

        @Transactional(readOnly = true)
        public List<String> getMyPubMedIds(String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                return userArticleRepository.findByUser(user).stream()
                                .map(ua -> ua.getArticle().getPubmedId())
                                .filter(pmid -> pmid != null && !pmid.isEmpty())
                                .toList();
        }

        @Transactional
        public ArticleDto addPubMedArticle(String email, String pmid) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                // Check if article exists in global cache
                Article article = articleRepository.findByPubmedId(pmid).orElse(null);

                if (article == null) {
                        // Fetch from PubMed
                        article = pubMedService.fetchSingleByPmid(pmid);
                        if (article == null) {
                                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found on PubMed");
                        }
                        article = articleRepository.save(article);
                }

                // Check if already in user's profile
                if (userArticleRepository.existsByUserAndArticle(user, article)) {
                        return mapToDto(article);
                }

                userArticleRepository.save(new com.researcher.tool.model.UserArticle(user, article));
                return mapToDto(article);
        }

        @Transactional
        public void addPubMedArticles(String email, java.util.List<String> pmids) {
                if (pmids == null || pmids.isEmpty())
                        return;

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));

                // 1. Identify which PMIDs we already have in DB
                java.util.List<String> pmidsToFetch = new ArrayList<>();
                Map<String, Article> existingArticles = new HashMap<>();

                for (String pmid : pmids) {
                        articleRepository.findByPubmedId(pmid).ifPresentOrElse(
                                        article -> existingArticles.put(pmid, article),
                                        () -> pmidsToFetch.add(pmid));
                }

                // 2. Batch fetch missing articles from PubMed
                if (!pmidsToFetch.isEmpty()) {
                        System.out.println("DEBUG: Batch fetching " + pmidsToFetch.size()
                                        + " articles from PubMed for import");
                        java.util.List<Article> fetchedArticles = pubMedService.fetchArticlesByIds(pmidsToFetch);

                        for (Article article : fetchedArticles) {
                                if (article != null && article.getPubmedId() != null) {
                                        try {
                                                Article saved = articleRepository.save(article);
                                                existingArticles.put(article.getPubmedId(), saved);
                                        } catch (Exception e) {
                                                System.err.println("Failed to save imported article "
                                                                + article.getPubmedId() + ": " + e.getMessage());
                                        }
                                }
                        }
                }

                // 3. Link all articles to user
                int linkedCount = 0;
                for (String pmid : pmids) {
                        Article article = existingArticles.get(pmid);
                        if (article != null) {
                                if (!userArticleRepository.existsByUserAndArticle(user, article)) {
                                        userArticleRepository
                                                        .save(new com.researcher.tool.model.UserArticle(user, article));
                                        linkedCount++;
                                }
                        } else {
                                System.err.println("Failed to import article PMID: " + pmid);
                        }
                }
                System.out.println("DEBUG: Successfully linked " + linkedCount + " articles to user " + email);
        }

        private void validatePublicationYear(Integer year) {
                if (year == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Publication year is required");
                }

                int currentYear = Year.now().getValue();
                if (year < 1900 || year > currentYear) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        String.format("Publication year must be between 1900 and %d", currentYear));
                }
        }

        private ArticleDto mapToDto(Article a) {
                ArticleDto dto = new ArticleDto();
                dto.setId(a.getId());
                dto.setTitle(a.getTitle());
                dto.setAuthors(a.getAuthors());
                dto.setPublicationYear(a.getPublicationYear());
                dto.setArticleType(a.getArticleType());
                dto.setAbstractText(a.getAbstractText());
                dto.setDoi(a.getDoi());
                dto.setJournalName(a.getJournalName());
                dto.setPublisher(a.getPublisher());
                dto.setExternalUrl(a.getExternalUrl());
                dto.setCreatedAt(a.getCreatedAt());
                dto.setUpdatedAt(a.getUpdatedAt());
                return dto;
        }

        // Old methods to be cleaned up or adapted
        @Transactional
        public java.util.List<ArticleDto> fetchFromPubMed(String email) {
                // Keep for backward compatibility or adapt
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                                "User not found"));
                ResearcherProfile profile = profileRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Profile not found"));

                if (profile.getPubmedAuthorId() == null || profile.getPubmedAuthorId().trim().isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PubMed Author ID not configured");
                }

                // Use the search method with AUTHOR type, limit to 20 for "fetch my pubs"
                Map<String, Object> searchResult = pubMedService.searchPubMed(profile.getPubmedAuthorId(), "AUTHOR", 0,
                                20);
                java.util.List<Article> articles = (java.util.List<Article>) searchResult.getOrDefault("articles",
                                new java.util.ArrayList<>());
                java.util.List<ArticleDto> results = new java.util.ArrayList<>();
                for (Article a : articles) {
                        Article existing = articleRepository.findByPubmedId(a.getPubmedId()).orElse(null);
                        if (existing == null) {
                                existing = articleRepository.save(a);
                        }
                        if (!userArticleRepository.existsByUserAndArticle(user, existing)) {
                                userArticleRepository.save(new com.researcher.tool.model.UserArticle(user, existing));
                        }
                        results.add(mapToDto(existing));
                }
                return results;
        }

        @Transactional
        public ArticleDto fetchByPmid(String email, String pmid) {
                return addPubMedArticle(email, pmid);
        }

        @Transactional(readOnly = true)
        public PageResponse<ArticleDto> getPendingArticles(String email, int page, int size) {
                // Per user request: "No pending state". So we return empty or just confirmed
                // ones.
                return new PageResponse<>();
        }

        @Transactional
        public ArticleDto confirmArticle(String email, Long id) {
                // Just map it if it exists
                return mapToDto(articleRepository.findById(id).orElseThrow());
        }

        @Transactional
        public void rejectArticle(String email, Long id) {
                deleteArticle(email, id);
        }
}
