package com.researcher.tool.controller;

import com.researcher.tool.dto.ProfileDto;
import com.researcher.tool.service.ResearcherProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profiles")
public class ResearcherProfileController {

    private final ResearcherProfileService profileService;
    private final com.researcher.tool.service.FileStorageService fileStorageService;

    public ResearcherProfileController(ResearcherProfileService profileService,
            com.researcher.tool.service.FileStorageService fileStorageService) {
        this.profileService = profileService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping("/public/search")
    public ResponseEntity<?> publicSearch(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String domain,
            @RequestParam(required = false) String expertise,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String currentEmail = null;
        return ResponseEntity.ok(profileService.searchResearchers(currentEmail, query, department, institution, domain,
                expertise, country, page, size));
    }

    @PostMapping("/avatar")
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String fileName = fileStorageService.storeFile(file);
        String avatarUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(fileName)
                .toUriString();

        try {
            String email = getAuthenticatedEmail();
            // User might exist if they are re-onboarding or already registered
            ProfileDto profile = profileService.getProfileByEmail(email);
            profile.setAvatarUrl(avatarUrl);
            profileService.updateProfile(email, profile);
        } catch (Exception e) {
            // Not authenticated or user doesn't exist yet (still in onboarding session)
            // This is expected for new OAuth users. The frontend will include the
            // avatarUrl in completeOnboarding call later.
        }

        Map<String, String> response = new HashMap<>();
        response.put("avatarUrl", avatarUrl);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> deleteAvatar() {
        String email = getAuthenticatedEmail();
        profileService.deleteAvatar(email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileDto> getMyProfile() {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(profileService.getProfileByEmail(email));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ProfileDto> getProfile(@PathVariable java.util.UUID userId) {
        return ResponseEntity.ok(profileService.getProfileByUserId(userId));
    }

    @GetMapping("/by-username/{username}")
    public ResponseEntity<ProfileDto> getProfileByUsername(@PathVariable String username) {
        return ResponseEntity.ok(profileService.getProfileByUsername(username));
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileDto> updateMyProfile(@RequestBody ProfileDto profileDto) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(profileService.updateProfile(email, profileDto));
    }

    @GetMapping("/check-username")
    public ResponseEntity<Map<String, Boolean>> checkUsernameAvailability(@RequestParam String username) {
        boolean available = profileService.isUsernameAvailable(username);
        Map<String, Boolean> response = new HashMap<>();
        response.put("available", available);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-contact-email/request")
    public ResponseEntity<?> requestContactEmailVerification(@RequestParam String email) {
        String authEmail = getAuthenticatedEmail();
        profileService.requestContactEmailOtp(authEmail, email);
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email));
    }

    @PostMapping("/verify-contact-email/confirm")
    public ResponseEntity<?> verifyContactEmail(@RequestParam String otp) {
        String authEmail = getAuthenticatedEmail();
        profileService.verifyContactEmailOtp(authEmail, otp);
        return ResponseEntity.ok(Map.of("message", "Contact email verified successfully"));
    }

    private String getAuthenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof OAuth2User) {
            String email = ((OAuth2User) principal).getAttribute("email");
            if (email == null) {
                throw new RuntimeException("Email not found in OAuth2 attributes");
            }
            return email;
        } else if (principal instanceof String) {
            return (String) principal;
        }
        throw new RuntimeException("Could not determine authenticated user email");
    }
}
