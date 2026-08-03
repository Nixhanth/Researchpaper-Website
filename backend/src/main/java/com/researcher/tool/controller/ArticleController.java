package com.researcher.tool.controller;

import com.researcher.tool.dto.ArticleDto;
import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.service.ArticleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @PostMapping
    public ResponseEntity<ArticleDto> createArticle(@Valid @RequestBody ArticleDto dto) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(articleService.createArticle(email, dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArticleDto> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleDto dto) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(articleService.updateArticle(email, id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        String email = getAuthenticatedEmail();
        articleService.deleteArticle(email, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/delete-multiple")
    public ResponseEntity<Void> deleteMultipleArticles(@RequestBody java.util.List<Long> ids) {
        String email = getAuthenticatedEmail();
        articleService.deleteArticles(email, ids);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<PageResponse<ArticleDto>> getMyArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(articleService.getMyArticles(email, page, size));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<ArticleDto>> getUserArticles(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        return ResponseEntity.ok(articleService.getUserArticles(userId, page, size));
    }

    // PubMed Integration Endpoints
    @PostMapping("/pubmed/add")
    public ResponseEntity<ArticleDto> addPubMedArticle(@RequestParam String pmid) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(articleService.addPubMedArticle(email, pmid));
    }

    @PostMapping("/pubmed/add-multiple")
    public ResponseEntity<Void> addMultiplePubMedArticles(@RequestBody java.util.List<String> pmids) {
        String email = getAuthenticatedEmail();
        articleService.addPubMedArticles(email, pmids);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me/pubmed-ids")
    public ResponseEntity<java.util.List<String>> getMyPubMedIds() {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(articleService.getMyPubMedIds(email));
    }

    private String getAuthenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new RuntimeException("User not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User) {
            return ((OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof String) {
            String email = (String) principal;
            if ("anonymousUser".equals(email))
                throw new RuntimeException("User not authenticated");
            return email;
        }
        throw new RuntimeException("User not authenticated");
    }
}
