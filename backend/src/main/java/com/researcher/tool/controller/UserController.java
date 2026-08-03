package com.researcher.tool.controller;

import com.researcher.tool.dto.UserInfoDto;
import com.researcher.tool.model.User;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.repository.UserRepository;
import com.researcher.tool.repository.ResearcherProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final ResearcherProfileRepository profileRepository;
    private final com.researcher.tool.service.UserService userService;
    private final com.researcher.tool.repository.OnboardingSessionRepository sessionRepository;
    private final com.researcher.tool.repository.OtpTokenRepository otpTokenRepository;
    private final com.researcher.tool.service.EmailService emailService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final com.researcher.tool.service.ResearcherProfileService researcherProfileService;

    public UserController(UserRepository userRepository,
            ResearcherProfileRepository profileRepository,
            com.researcher.tool.service.UserService userService,
            com.researcher.tool.repository.OnboardingSessionRepository sessionRepository,
            com.researcher.tool.repository.OtpTokenRepository otpTokenRepository,
            com.researcher.tool.service.EmailService emailService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            com.researcher.tool.service.ResearcherProfileService researcherProfileService) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.userService = userService;
        this.sessionRepository = sessionRepository;
        this.otpTokenRepository = otpTokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.researcherProfileService = researcherProfileService;
    }

    @org.springframework.web.bind.annotation.PostMapping("/password")
    public ResponseEntity<Void> updatePassword(
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        userService.updatePassword(email, currentPassword, newPassword);
        return ResponseEntity.ok().build();
    }

    @org.springframework.web.bind.annotation.PostMapping("/request-delete-otp")
    public ResponseEntity<String> requestDeleteOtp(
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        String password = payload.get("password");

        User user = userRepository.findByEmail(email).orElseThrow();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.badRequest().body("Invalid password");
        }

        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        otpTokenRepository.deleteByEmailAndPurpose(email,
                com.researcher.tool.model.OtpToken.OtpPurpose.ACCOUNT_DELETION);
        otpTokenRepository.save(new com.researcher.tool.model.OtpToken(otp, email,
                com.researcher.tool.model.OtpToken.OtpPurpose.ACCOUNT_DELETION, 10));
        emailService.sendOtpEmail(email, otp, "Account Deletion");

        return ResponseEntity.ok("OTP sent to your email");
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/me")
    public ResponseEntity<?> deactivateAccount(
            @org.springframework.web.bind.annotation.RequestParam String otp) {
        String email = getAuthenticatedEmail();

        java.util.Optional<com.researcher.tool.model.OtpToken> otpToken = otpTokenRepository
                .findByEmailAndTokenAndPurpose(
                        email, otp, com.researcher.tool.model.OtpToken.OtpPurpose.ACCOUNT_DELETION);

        if (otpToken.isEmpty() || otpToken.get().isExpired()) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }

        userService.deactivateAccount(email);
        otpTokenRepository.deleteByEmailAndPurpose(email,
                com.researcher.tool.model.OtpToken.OtpPurpose.ACCOUNT_DELETION);

        return ResponseEntity.ok().build();
    }

    private String getAuthenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null)
            throw new RuntimeException("Not authenticated");
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User) {
            return ((OAuth2User) principal).getAttribute("email");
        }
        return (String) principal;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Session-Token", required = false) String sessionToken) {

        // Check for onboarding session first
        if (sessionToken != null && !sessionToken.isEmpty()) {
            try {
                Optional<com.researcher.tool.model.OnboardingSession> sessionOpt = sessionRepository
                        .findBySessionToken(sessionToken);

                if (sessionOpt.isPresent() && !sessionOpt.get().isExpired()) {
                    com.researcher.tool.model.OnboardingSession session = sessionOpt.get();
                    // Return minimal user info for onboarding
                    UserInfoDto sessionInfo = new UserInfoDto(
                            null, // No user ID yet
                            session.getEmail(),
                            session.getFullName() != null ? session.getFullName() : "",
                            session.getAvatarUrl() != null ? session.getAvatarUrl() : "",
                            session.getAuthProvider(),
                            false, // Profile not completed
                            session.getCurrentStep() != null ? session.getCurrentStep() : 0,
                            Collections.singletonList("ROLE_ONBOARDING"),
                            session.getPassword() != null,
                            null, // No display name in session yet
                            0, // Base completion for onboarding
                            new java.util.HashMap<>()); // Empty verification status for session
                    return ResponseEntity.ok(sessionInfo);
                }
            } catch (Exception e) {
                // Session lookup failed, continue to normal auth check
            }
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Not authenticated");
        }

        String email;
        Object principal = authentication.getPrincipal();

        if (principal instanceof OAuth2User) {
            email = ((OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof String) {
            email = (String) principal;
        } else {
            return ResponseEntity.status(401).body("Unknown principal type");
        }

        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOptional.get();
        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> profileRepository.save(new ResearcherProfile(user)));

        com.researcher.tool.dto.ProfileDto profileDto = researcherProfileService.getProfileByEmail(user.getEmail());

        UserInfoDto userInfo = new UserInfoDto(
                user.getId(),
                user.getEmail(),
                profile.getFullName() != null ? profile.getFullName() : "",
                profile.getAvatarUrl() != null ? profile.getAvatarUrl() : "",
                user.getAuthProvider(),
                user.getProfileCompleted(),
                profile.getOnboardingStep() != null ? profile.getOnboardingStep() : 1,
                Collections.singletonList("ROLE_USER"),
                user.getPassword() != null,
                profile.getDisplayName(),
                profileDto.getProfileCompletion(),
                profileDto.getVerificationStatus());

        return ResponseEntity.ok(userInfo);
    }
}
