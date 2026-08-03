package com.researcher.tool.controller;

import com.researcher.tool.dto.AuthResponse;
import com.researcher.tool.dto.LoginRequest;
import com.researcher.tool.dto.SignupRequest;
import com.researcher.tool.model.AuthProvider;
import com.researcher.tool.model.User;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.repository.UserRepository;
import com.researcher.tool.repository.ResearcherProfileRepository;
import com.researcher.tool.security.JwtService;
import com.researcher.tool.service.ResearcherProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.researcher.tool.model.OtpToken;
import com.researcher.tool.repository.OtpTokenRepository;
import com.researcher.tool.service.EmailService;
import com.researcher.tool.dto.OtpVerificationRequest;
import com.researcher.tool.dto.ResetPasswordRequest;
import com.researcher.tool.utils.EmailValidator;
import java.util.Random;
import java.time.LocalDateTime;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final ResearcherProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ResearcherProfileService profileService;
    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;
    private final com.researcher.tool.repository.OnboardingSessionRepository sessionRepository;
    private final com.researcher.tool.repository.AcademicDetailRepository academicDetailRepository;

    public AuthController(UserRepository userRepository,
            ResearcherProfileRepository profileRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            ResearcherProfileService profileService,
            OtpTokenRepository otpTokenRepository,
            EmailService emailService,
            com.researcher.tool.repository.OnboardingSessionRepository sessionRepository,
            com.researcher.tool.repository.AcademicDetailRepository academicDetailRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.profileService = profileService;
        this.otpTokenRepository = otpTokenRepository;
        this.emailService = emailService;
        this.sessionRepository = sessionRepository;
        this.academicDetailRepository = academicDetailRepository;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest signupRequest, HttpServletResponse response) {
        String email = signupRequest.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        if (EmailValidator.isDisposable(signupRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Disposable emails are not allowed.");
        }

        // Create or update OnboardingSession with pending info
        com.researcher.tool.model.OnboardingSession session = sessionRepository.findByEmail(signupRequest.getEmail())
                .orElseGet(() -> new com.researcher.tool.model.OnboardingSession(
                        signupRequest.getEmail(),
                        com.researcher.tool.model.AuthProvider.LOCAL,
                        null,
                        signupRequest.getFullName(),
                        null));

        session.setFullName(signupRequest.getFullName());
        if (signupRequest.getPassword() != null && !signupRequest.getPassword().isEmpty()) {
            session.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
            session.setCurrentStep(1);
        } else if (session.getCurrentStep() == null) {
            session.setCurrentStep(0);
        }
        sessionRepository.save(session);

        // We DO NOT save the user yet. We just send the OTP to verify the email.
        sendOtpInternal(signupRequest.getEmail(), OtpToken.OtpPurpose.REGISTRATION, "Account Verification", 10);

        return ResponseEntity.ok("OTP sent to your email for verification.");
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean exists = userRepository.existsByEmail(email.toLowerCase().trim());
        java.util.Map<String, Boolean> response = new java.util.HashMap<>();
        response.put("available", !exists);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody OtpVerificationRequest request, HttpServletResponse response) {
        String email = request.getEmail().toLowerCase().trim();
        Optional<OtpToken> otpToken = otpTokenRepository.findByEmailAndTokenAndPurpose(
                email, request.getOtp(), OtpToken.OtpPurpose.REGISTRATION);

        if (otpToken.isEmpty() || otpToken.get().isExpired()) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired OTP.");
        }

        // Check if user already exists
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // If they are in the DB but not verified (legacy or special case)
            user.setEmailVerified(true);
            userRepository.save(user);

            ResearcherProfile profile = profileRepository.findByUser(user).orElseThrow();
            String token = jwtService.generateToken(user.getEmail());
            return ResponseEntity.ok(createAuthResponse(user, profile, token));
        }

        // NEW: For new signups, create an OnboardingSession instead of a User
        com.researcher.tool.model.OnboardingSession session = sessionRepository.findByEmail(request.getEmail())
                .orElseGet(() -> new com.researcher.tool.model.OnboardingSession(
                        request.getEmail(),
                        AuthProvider.LOCAL,
                        null,
                        null,
                        null));

        session.setEmail(request.getEmail()); // Ensure email is correct
        if (session.getCurrentStep() == null) {
            session.setCurrentStep(0); // Start at password setting if not already set
        }
        sessionRepository.save(session);

        // Cleanup OTP
        @SuppressWarnings("null")
        OtpToken tokenObj = otpToken.get();
        otpTokenRepository.delete(tokenObj);

        // Return session token so frontend can proceed to onboarding
        java.util.Map<String, String> result = new java.util.HashMap<>();
        result.put("message", "Email verified successfully.");
        result.put("session_token", session.getSessionToken());
        result.put("email", session.getEmail());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/register-complete")
    public ResponseEntity<?> registerComplete(@RequestBody com.researcher.tool.dto.CompleteRegistrationRequest request,
            HttpServletResponse response) {
        // 1. Verify OTP again to ensure they actually verified the email
        Optional<OtpToken> otpToken = otpTokenRepository.findByEmailAndTokenAndPurpose(
                request.getEmail(), request.getOtp(), OtpToken.OtpPurpose.REGISTRATION);

        if (otpToken.isEmpty() || otpToken.get().isExpired()) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired OTP. Please verify your email again.");
        }

        try {
            // 2. Comprehensive Transactional Creation
            User user = profileService.completeRegistration(
                    request.getEmail(),
                    passwordEncoder.encode(request.getPassword()),
                    request.getProfile());

            // 3. Cleanup OTP
            otpTokenRepository.deleteByEmailAndPurpose(request.getEmail(), OtpToken.OtpPurpose.REGISTRATION);

            // 4. Issue Token and Log In
            String token = jwtService.generateToken(user.getEmail());

            ResearcherProfile profile = profileRepository.findByUser(user).get();
            return ResponseEntity.ok(createAuthResponse(user, profile, token));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestParam String email, @RequestParam String type) {
        OtpToken.OtpPurpose purpose = type.equals("FORGOT_PASSWORD") ? OtpToken.OtpPurpose.FORGOT_PASSWORD
                : OtpToken.OtpPurpose.REGISTRATION;
        sendOtpInternal(email, purpose, type.equals("FORGOT_PASSWORD") ? "Password Reset" : "Account Verification", 10);
        return ResponseEntity.ok("OTP resent successfully.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            String otp = String.format("%06d", new java.util.Random().nextInt(999999));
            user.setResetOtp(otp);
            user.setResetOtpExpiry(LocalDateTime.now().plusMinutes(5));
            user.setResetOtpAttempts(0);
            userRepository.save(user);

            emailService.sendOtpEmail(normalizedEmail, otp, "Password Reset");
        }

        // Always return success for security (avoid user enumeration)
        return ResponseEntity.ok("If an account exists with this email, a reset OTP has been sent.");
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyResetOtp(@RequestBody OtpVerificationRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invalid verification attempt.");
        }

        User user = userOptional.get();
        if (user.getResetOtp() == null || user.getResetOtpExpiry() == null) {
            return ResponseEntity.badRequest().body("Error: No active reset session found.");
        }

        if (LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            user.setResetOtp(null);
            user.setResetOtpExpiry(null);
            user.setResetOtpAttempts(0);
            userRepository.save(user);
            return ResponseEntity.badRequest().body("Error: Reset OTP has expired.");
        }

        if (!user.getResetOtp().equals(request.getOtp())) {
            int attempts = (user.getResetOtpAttempts() != null ? user.getResetOtpAttempts() : 0) + 1;
            user.setResetOtpAttempts(attempts);

            if (attempts >= 3) {
                user.setResetOtp(null);
                user.setResetOtpExpiry(null);
                user.setResetOtpAttempts(0);
                userRepository.save(user);
                return ResponseEntity.badRequest().body("Error: Max attempts reached. Please request a new OTP.");
            }

            userRepository.save(user);
            return ResponseEntity.badRequest()
                    .body("Error: Invalid OTP. Attempts remaining: " + (3 - attempts));
        }

        return ResponseEntity.ok(java.util.Map.of("status", "OTP_VERIFIED"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invalid password reset attempt.");
        }

        User user = userOptional.get();

        // Verify OTP again for the actual reset action to ensure
        // statelessness/integrity
        if (user.getResetOtp() == null || !user.getResetOtp().equals(request.getOtp()) ||
                LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            return ResponseEntity.badRequest()
                    .body("Error: Invalid or expired reset session. Please verify your OTP again.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        user.setResetOtpAttempts(0);
        userRepository.save(user);

        return ResponseEntity.ok("Password reset successfully. Please login.");
    }

    private void sendOtpInternal(String email, OtpToken.OtpPurpose purpose, String purposeText, int expiryMinutes) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpTokenRepository.deleteByEmailAndPurpose(email, purpose);
        otpTokenRepository.save(new OtpToken(otp, email, purpose, expiryMinutes));
        emailService.sendOtpEmail(email, otp, purposeText);
    }

    @PostMapping("/verify-login-otp")
    public ResponseEntity<?> verifyLoginOtp(@RequestBody OtpVerificationRequest request, HttpServletResponse response) {
        String email = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getOtp() == null || user.getOtpExpiry() == null) {
            return ResponseEntity.badRequest().body("Error: No active OTP session found.");
        }

        if (java.time.LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            user.setOtp(null);
            user.setOtpExpiry(null);
            user.setOtpAttempts(0);
            userRepository.save(user);
            return ResponseEntity.badRequest().body("Error: OTP has expired.");
        }

        if (!user.getOtp().equals(request.getOtp())) {
            int attempts = (user.getOtpAttempts() != null ? user.getOtpAttempts() : 0) + 1;
            user.setOtpAttempts(attempts);

            if (attempts >= 3) {
                user.setOtp(null);
                user.setOtpExpiry(null);
                user.setOtpAttempts(0);
                userRepository.save(user);
                return ResponseEntity.badRequest().body("Error: Max attempts reached. Please login again.");
            }

            userRepository.save(user);
            return ResponseEntity.badRequest()
                    .body("Error: Invalid OTP. Attempts remaining: " + (3 - attempts));
        }

        // Success!
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setOtpAttempts(0);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());

        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> profileRepository.save(new ResearcherProfile(user)));

        return ResponseEntity.ok(createAuthResponse(user, profile, token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        String email = loginRequest.getEmail().toLowerCase().trim();
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Allow password login regardless of provider, as long as a password exists
            if (user.getPassword() != null && passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                // Status Check - PERMANENT_BANNED first
                if (user.getStatus() == com.researcher.tool.model.AccountStatus.PERMANENT_BANNED ||
                        user.getStatus() == com.researcher.tool.model.AccountStatus.BANNED) {
                    java.util.Map<String, Object> banResponse = new java.util.HashMap<>();
                    banResponse.put("error", "permanent_ban");
                    banResponse.put("message",
                            "Your account has been permanently disabled for violating platform policies.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(banResponse);
                }

                // TEMP_BANNED check with auto-unban
                if (user.getStatus() == com.researcher.tool.model.AccountStatus.TEMP_BANNED ||
                        user.getStatus() == com.researcher.tool.model.AccountStatus.BLOCKED) {
                    java.time.LocalDateTime banExpiry = user.getBanExpiresAt() != null ? user.getBanExpiresAt()
                            : user.getBlockedUntil();
                    if (banExpiry != null && banExpiry.isAfter(java.time.LocalDateTime.now())) {
                        java.util.Map<String, Object> banResponse = new java.util.HashMap<>();
                        banResponse.put("error", "temp_ban");
                        banResponse.put("message", "Your account has been temporarily suspended until " +
                                banExpiry.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) +
                                " due to policy violations.");
                        banResponse.put("banExpiresAt", banExpiry.toString());
                        if (user.getBanReason() != null) {
                            banResponse.put("reason", user.getBanReason());
                        }
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(banResponse);
                    } else {
                        // Auto unban - ban period expired
                        user.setStatus(com.researcher.tool.model.AccountStatus.ACTIVE);
                        user.setBlockedUntil(null);
                        user.setBanExpiresAt(null);
                        user.setBanReason(null);
                        userRepository.save(user);
                    }
                }

                if (user.getStatus() == com.researcher.tool.model.AccountStatus.DELETED) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(java.util.Map.of("message", "Invalid email or password."));
                }

                if (!Boolean.TRUE.equals(user.getEmailVerified())) {
                    sendOtpInternal(user.getEmail(), OtpToken.OtpPurpose.REGISTRATION, "Account Verification", 10);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Error: Please verify your email before logging in. We've sent another OTP to your inbox.");
                }

                // NEW FLOW: Send OTP for Login using User fields
                String otp = String.format("%06d", new java.util.Random().nextInt(999999));
                user.setOtp(otp);
                user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(5));
                user.setOtpAttempts(0);
                userRepository.save(user);

                emailService.sendOtpEmail(user.getEmail(), otp, "Login Verification");

                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("status", "OTP_REQUIRED");
                result.put("message", "OTP sent to your email for verification.");
                result.put("email", user.getEmail());
                return ResponseEntity.ok(result);
            }

            // Generic error message for security if credentials don't match or password is
            // missing
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("message", "Invalid email or password. Please try again."));
        } else {
            // Check if there's a pending onboarding session
            Optional<com.researcher.tool.model.OnboardingSession> sessionOpt = sessionRepository
                    .findByEmail(email);
            if (sessionOpt.isPresent()) {
                com.researcher.tool.model.OnboardingSession session = sessionOpt.get();
                if (session.getPassword() != null
                        && passwordEncoder.matches(loginRequest.getPassword(), session.getPassword())) {
                    java.util.Map<String, Object> result = new java.util.HashMap<>();
                    result.put("message", "Please complete your onboarding.");
                    result.put("session_token", session.getSessionToken());
                    result.put("needsOnboarding", true);
                    return ResponseEntity.ok(result);
                }
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(java.util.Map.of("message", "Invalid email or password. Please try again."));
    }

    @PostMapping("/complete-onboarding")
    public ResponseEntity<?> completeOnboarding(
            @RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
            @RequestBody com.researcher.tool.dto.ProfileDto profileDto,
            HttpServletResponse response) {

        try {
            // Priority 1: Session-based onboarding (New users, OAuth or Email)
            if (sessionToken != null && !sessionToken.isEmpty()) {
                return completeOnboardingSession(sessionToken, profileDto, response);
            }

            // Priority 2: Authenticated user onboarding (In DB, just completing profile)
            Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .getAuthentication();
            if (authentication != null && authentication.isAuthenticated() &&
                    !"anonymousUser".equals(authentication.getPrincipal())) {

                String email = getEmailFromPrincipal(authentication.getPrincipal());
                if (email != null) {
                    profileService.completeOnboarding(email, profileDto);
                    User user = userRepository.findByEmail(email).get();
                    ResearcherProfile profile = profileRepository.findByUser(user).get();
                    String token = jwtService.generateToken(user.getEmail());
                    return ResponseEntity.ok(createAuthResponse(user, profile, token));
                }
            }

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: Not authenticated or no session token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error completing setup: " + e.getMessage());
        }
    }

    private ResponseEntity<?> completeOnboardingSession(
            String sessionToken,
            com.researcher.tool.dto.ProfileDto profileDto,
            HttpServletResponse response) {

        try {
            // 1. Find and validate session
            com.researcher.tool.model.OnboardingSession session = sessionRepository.findBySessionToken(sessionToken)
                    .orElseThrow(() -> new RuntimeException("Invalid or expired session"));

            if (session.isExpired()) {
                sessionRepository.delete(session);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: Session expired");
            }

            // Double-check if email is already registered (Prevent race conditions)
            if (userRepository.existsByEmail(session.getEmail())) {
                sessionRepository.delete(session);
                return ResponseEntity.badRequest().body("Error: Email is already registered. Please login.");
            }

            // 2. Validate Username (Crucial for fixing the mention crash)
            if (profileDto.getDisplayName() == null || profileDto.getDisplayName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Error: Username (Display Name) is required");
            }
            if (!profileService.isUsernameAvailable(profileDto.getDisplayName())) {
                return ResponseEntity.badRequest().body("Error: Username already taken");
            }

            // 3. Create User record ONLY NOW
            User user = new User(
                    session.getEmail(),
                    session.getPassword() != null ? session.getPassword() : "",
                    session.getAuthProvider(),
                    session.getProviderId());
            user.setEmailVerified(true);
            user.setProfileCompleted(true);
            user = userRepository.save(user);

            // 4. Create Profile
            ResearcherProfile profile = new ResearcherProfile(user);
            profile.setFullName(profileDto.getName() != null ? profileDto.getName() : session.getFullName());
            profile.setOnboardingStep(3); // Completed
            profile.setAvatarUrl(session.getAvatarUrl());

            updateProfileFromDto(profile, profileDto);
            profileRepository.save(profile);

            // 5. Save Academic Detail
            com.researcher.tool.model.AcademicDetail academicDetail = new com.researcher.tool.model.AcademicDetail(
                    user);
            updateAcademicDetailFromDto(academicDetail, profileDto);
            academicDetailRepository.save(academicDetail);

            // 6. Cleanup session
            sessionRepository.delete(session);

            // 7. Generate JWT and return
            String token = jwtService.generateToken(user.getEmail());

            return ResponseEntity.ok(createAuthResponse(user, profile, token));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(
            @RequestParam(required = false) String sessionToken,
            @RequestBody ResetPasswordRequest request) {

        // OAuth onboarding flow - store password in session
        if (sessionToken != null && !sessionToken.isEmpty()) {
            try {
                com.researcher.tool.model.OnboardingSession session = sessionRepository.findBySessionToken(sessionToken)
                        .orElseThrow(() -> new RuntimeException("Invalid session"));

                if (session.isExpired()) {
                    sessionRepository.delete(session);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: Session expired");
                }

                session.setPassword(passwordEncoder.encode(request.getNewPassword()));
                session.setCurrentStep(1);
                sessionRepository.save(session);

                return ResponseEntity.ok("Password set successfully");
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Error: " + e.getMessage());
            }
        }

        // Existing user flow
        Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: Not authenticated");
        }

        String email = getEmailFromPrincipal(authentication.getPrincipal());
        User user = userRepository.findByEmail(email).orElseThrow();

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Password set successfully");
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        return ResponseEntity.ok("Logged out successfully");
    }

    private String getEmailFromPrincipal(Object principal) {
        if (principal instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            return ((org.springframework.security.oauth2.core.user.OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof String) {
            return (String) principal;
        }
        return null;
    }

    private AuthResponse createAuthResponse(User user, ResearcherProfile profile, String token) {
        com.researcher.tool.dto.ProfileDto profileDto = profileService.getProfileByEmail(user.getEmail());
        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                profile.getFullName(),
                user.getAuthProvider(),
                profile.getAvatarUrl(),
                user.getProfileCompleted(),
                profile.getOnboardingStep(),
                user.getPassword() != null,
                profileDto.getProfileCompletion(),
                profileDto.getVerificationStatus());
    }

    private void updateProfileFromDto(ResearcherProfile profile, com.researcher.tool.dto.ProfileDto dto) {
        if (dto.getDisplayName() != null)
            profile.setDisplayName(dto.getDisplayName());
        if (dto.getCountry() != null)
            profile.setCountry(dto.getCountry());
        if (dto.getInstitution() != null)
            profile.setInstitution(dto.getInstitution());
        if (dto.getRole() != null)
            profile.setRole(dto.getRole());
        if (dto.getDepartment() != null)
            profile.setDepartment(dto.getDepartment());
        if (dto.getTitle() != null)
            profile.setCurrentTitle(dto.getTitle());
        if (dto.getBio() != null)
            profile.setBio(dto.getBio());
        if (dto.getGender() != null)
            profile.setGender(dto.getGender());
        if (dto.getAvatarUrl() != null)
            profile.setAvatarUrl(dto.getAvatarUrl());
        if (dto.getInterests() != null)
            profile.setResearchInterests(dto.getInterests());

        if (dto.getSocialLinks() != null) {
            java.util.Map<String, String> links = dto.getSocialLinks();
            if (links.containsKey("orcid"))
                profile.setOrcid(links.get("orcid"));
            if (links.containsKey("scholar"))
                profile.setScholarUrl(links.get("scholar"));
            if (links.containsKey("linkedin"))
                profile.setLinkedinUrl(links.get("linkedin"));
            if (links.containsKey("website"))
                profile.setPersonalWebsite(links.get("website"));
            if (links.containsKey("email"))
                profile.setContactEmail(links.get("email"));
        }
    }

    private void updateAcademicDetailFromDto(com.researcher.tool.model.AcademicDetail academic,
            com.researcher.tool.dto.ProfileDto dto) {
        if (dto.getDepartment() != null)
            academic.setDepartment(dto.getDepartment());
        if (dto.getTitle() != null)
            academic.setCurrentTitle(dto.getTitle());
        if (dto.getBio() != null)
            academic.setBio(dto.getBio());
        if (dto.getInterests() != null)
            academic.setInterests(dto.getInterests());
        if (dto.getSocialLinks() != null)
            academic.setSocialLinks(dto.getSocialLinks());
    }
}
