package com.researcher.tool.controller;

import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.service.ResearcherProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/network")
public class NetworkController {

    private final ResearcherProfileService profileService;

    public NetworkController(ResearcherProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/suggestions")
    public ResponseEntity<java.util.List<UserSummaryDto>> getSuggestions(
            @RequestParam(defaultValue = "10") int limit) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(profileService.getSuggestions(email, limit));
    }

    @GetMapping("/mentions")
    public ResponseEntity<java.util.List<UserSummaryDto>> getMentions(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(profileService.getMentionSuggestions(email, query, limit));
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<UserSummaryDto>> searchResearchers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String domain,
            @RequestParam(required = false) String expertise,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String currentEmail = getAuthenticatedEmail();
        return ResponseEntity.ok(profileService.searchResearchers(currentEmail, query, department, institution, domain,
                expertise,
                country, page, size));
    }

    private String getAuthenticatedEmail() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (authentication == null) {
            throw new RuntimeException("User not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            return ((org.springframework.security.oauth2.core.user.OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof String) {
            String email = (String) principal;
            if ("anonymousUser".equals(email))
                throw new RuntimeException("User not authenticated");
            return email;
        }
        throw new RuntimeException("User not authenticated");
    }
}
