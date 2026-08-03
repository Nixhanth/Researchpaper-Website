package com.researcher.tool.service;

import com.researcher.tool.dto.AdminUserDto;
import com.researcher.tool.dto.UserDetailDto;
import com.researcher.tool.dto.ProfileCompletionUserDto;
import com.researcher.tool.model.*;
import com.researcher.tool.repository.*;
import com.researcher.tool.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageImpl;
import java.util.Objects;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;

@Service
public class AdminService {

    @Value("${admin.username}")
    private String adminUsername;

    @Value("${admin.password}")
    private String adminPasswordHash;

    private final UserRepository userRepository;
    private final AdminActionRepository adminActionRepository;
    private final ResearcherProfileRepository researcherProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final AdminSessionRepository adminSessionRepository;
    private final UserArticleRepository userArticleRepository;
    private final UserSessionRepository userSessionRepository;
    private final ResearcherProfileService researcherProfileService;

    // Updated constructor to include AdminSessionRepository and
    // UserArticleRepository
    private final UserFollowRepository userFollowRepository;

    public AdminService(UserRepository userRepository, AdminActionRepository adminActionRepository,
            ResearcherProfileRepository researcherProfileRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService,
            JavaMailSender mailSender,
            AdminSessionRepository adminSessionRepository,
            UserArticleRepository userArticleRepository,
            UserSessionRepository userSessionRepository,
            UserFollowRepository userFollowRepository,
            ResearcherProfileService researcherProfileService) {
        this.userRepository = userRepository;
        this.adminActionRepository = adminActionRepository;
        this.researcherProfileRepository = researcherProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailSender = mailSender;
        this.adminSessionRepository = adminSessionRepository;
        this.userArticleRepository = userArticleRepository;
        this.userSessionRepository = userSessionRepository;
        this.userFollowRepository = userFollowRepository;
        this.researcherProfileService = researcherProfileService;
    }

    // ... (login methods remain unchanged) ...

    private int calculateProfileCompletion(ResearcherProfile profile) {
        return researcherProfileService.calculateProfileCompletion(profile);
    }

    // ... (rest of methods) ...

    private java.util.List<String> getMissingFields(ResearcherProfile profile) {
        java.util.List<String> missing = new java.util.ArrayList<>();

        // Critical Missing Items for Academic Credibility
        if (profile.getInstitution() == null || profile.getInstitution().isEmpty())
            missing.add("Institution");
        if (profile.getOrcid() == null || profile.getOrcid().isEmpty())
            missing.add("ORCID");

        long articleCount = userArticleRepository.countByUser(profile.getUser());
        if (articleCount == 0)
            missing.add("Publications");

        if (profile.getResearchInterests() == null || profile.getResearchInterests().isEmpty())
            missing.add("Research Interests");

        // Secondary Important Items
        if (profile.getScholarUrl() == null || profile.getScholarUrl().isEmpty())
            missing.add("Google Scholar");
        if (profile.getBio() == null || profile.getBio().isEmpty())
            missing.add("Bio");
        if (profile.getFullName() == null || profile.getFullName().isEmpty())
            missing.add("Full Name");

        return missing;
    }

    public String login(String username, String password) {
        // Fallback for backward compatibility if needed, or deprecate
        return login(username, password, "unknown", "unknown");
    }

    // Lockout Policy State
    private java.util.concurrent.atomic.AtomicInteger failedAttempts = new java.util.concurrent.atomic.AtomicInteger(0);
    private LocalDateTime lockoutExpiresAt = null;
    private LocalDateTime lastFailedAttempt = null;

    public String login(String username, String password, String ipAddress, String userAgent) {
        // 1. Check for Idle Reset (24h)
        if (lastFailedAttempt != null && lastFailedAttempt.plusHours(24).isBefore(LocalDateTime.now())) {
            failedAttempts.set(0);
            lockoutExpiresAt = null;
            lastFailedAttempt = null;
        }

        // 2. Check Lockout Status
        if (lockoutExpiresAt != null) {
            if (LocalDateTime.now().isBefore(lockoutExpiresAt)) {
                throw new RuntimeException("E_LOCKOUT:" + lockoutExpiresAt.toString()); // E_LOCKOUT:Timestamp
            } else {
                // Lock expired
                lockoutExpiresAt = null;
            }
        }

        // 3. Check Permanent Lock (20+ attempts)
        if (failedAttempts.get() >= 20) {
            throw new RuntimeException("E_PERMANENT_LOCK");
        }

        System.out.println("Admin login attempt: " + username);

        // 4. Validate Username
        if (!adminUsername.equals(username)) {
            handleFailedAttempt();
            System.out.println("Admin username mismatch. Expected: " + adminUsername + ", Got: " + username);
            throw new RuntimeException("Invalid credentials. Attempts: " + failedAttempts.get());
        }

        // 5. Validate Password
        // 5. Validate Password
        boolean isPasswordMatch;
        if (adminPasswordHash != null && adminPasswordHash.startsWith("$2a$")) {
            isPasswordMatch = passwordEncoder.matches(password, adminPasswordHash);
        } else {
            isPasswordMatch = password.equals(adminPasswordHash);
        }

        if (!isPasswordMatch) {
            handleFailedAttempt();
            System.out.println("Admin password mismatch.");
            throw new RuntimeException("Invalid credentials. Attempts: " + failedAttempts.get());
        }

        // 6. Success - Reset Counters
        failedAttempts.set(0);
        lockoutExpiresAt = null;
        lastFailedAttempt = null;

        // Generate a valid JWT
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "ADMIN");

        // Generate UUID for session ID and add to claims
        UUID sessionId = UUID.randomUUID();
        claims.put("sessionId", sessionId.toString());

        String token = jwtService.generateToken(claims, username);

        // Store session in DB
        AdminSession session = AdminSession.builder()
                .id(sessionId)
                .adminUsername(username)
                .tokenSignature(token.substring(Math.max(0, token.length() - 20))) // Store signature part (last 20
                                                                                   // chars) for verification
                .ipAddress(ipAddress)
                .deviceInfo(userAgent)
                .browser(parseBrowser(userAgent))
                .createdAt(LocalDateTime.now())
                .lastActiveAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(24)) // Match JWT expiry
                .isValid(true)
                .build();

        try {
            adminSessionRepository.save(Objects.requireNonNull(session));
        } catch (Exception e) {
            System.err.println("Failed to save admin session: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Login failed due to session error");
        }
        return token;
    }

    private void handleFailedAttempt() {
        int attempts = failedAttempts.incrementAndGet();
        lastFailedAttempt = LocalDateTime.now();

        // Apply Lockout Rules
        if (attempts == 5) {
            lockoutExpiresAt = LocalDateTime.now().plusMinutes(10);
        } else if (attempts == 10) {
            lockoutExpiresAt = LocalDateTime.now().plusMinutes(30);
        } else if (attempts == 15) {
            lockoutExpiresAt = LocalDateTime.now().plusHours(1);
        } else if (attempts >= 20) {
            // Permanent lock (until server restart or manual intervention)
            lockoutExpiresAt = LocalDateTime.MAX;
        }

        if (lockoutExpiresAt != null && attempts < 20) {
            throw new RuntimeException("E_LOCKOUT_STARTED:" + lockoutExpiresAt.toString());
        }
    }

    private String parseBrowser(String userAgent) {
        if (userAgent == null)
            return "Unknown";
        if (userAgent.contains("Chrome"))
            return "Chrome";
        if (userAgent.contains("Firefox"))
            return "Firefox";
        if (userAgent.contains("Safari"))
            return "Safari";
        if (userAgent.contains("Edge"))
            return "Edge";
        return "Unknown";
    }

    public boolean validateSession(String token) {
        try {
            // Extract username and role from JWT
            String username = jwtService.extractUsername(token);
            String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
            String sessionIdStr = jwtService.extractClaim(token, claims -> claims.get("sessionId", String.class));

            System.out.println("[AdminService] Validating session for user: " + username + ", role: " + role
                    + ", sessionId: " + sessionIdStr);

            // If no sessionId in token, validate based on JWT validity only (backward
            // compatibility)
            if (sessionIdStr == null) {
                System.out.println("[AdminService] No sessionId in token, using JWT-only validation");
                // For admin tokens without session ID, just check if JWT is valid and role is
                // ADMIN
                return "ADMIN".equals(role) && adminUsername.equals(username);
            }

            UUID sessionId = UUID.fromString(sessionIdStr);
            java.util.Optional<AdminSession> sessionOpt = adminSessionRepository
                    .findById(Objects.requireNonNull(sessionId));

            if (sessionOpt.isPresent()) {
                AdminSession session = sessionOpt.get();
                System.out.println("[AdminService] Session found: valid=" + session.isValid() + ", expires="
                        + session.getExpiresAt() + ", lastActive=" + session.getLastActiveAt());

                if (!session.isValid()) {
                    System.out.println("[AdminService] Session marked as invalid");
                    return false;
                }

                // Strictly enforce 5-minute inactivity timeout on backend
                LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
                if (session.getLastActiveAt().isBefore(fiveMinutesAgo)) {
                    System.out.println("[AdminService] Session invalidated due to 5-minute inactivity");
                    session.setValid(false);
                    adminSessionRepository.save(session);
                    return false;
                }

                if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
                    System.out.println("[AdminService] Session expired at " + session.getExpiresAt());
                    session.setValid(false);
                    adminSessionRepository.save(session);
                    return false;
                }

                // Update last active - Multi-session support: each session tracks its own
                // activity
                session.setLastActiveAt(LocalDateTime.now());
                adminSessionRepository.save(session);
                System.out.println("[AdminService] Session validated successfully");
                return true;
            } else {
                // Session not found in DB - this can happen if DB was recreated
                // If JWT is still valid (not expired) and role is ADMIN, auto-recreate the
                // session
                System.out.println("[AdminService] Session not found in DB. Checking if we should auto-recreate...");

                if ("ADMIN".equals(role) && adminUsername.equals(username)) {
                    // JWT is valid but session was lost (DB recreation). Auto-recreate session
                    // entry.
                    System.out.println("[AdminService] Auto-recreating session for valid admin JWT");
                    AdminSession newSession = AdminSession.builder()
                            .id(sessionId)
                            .adminUsername(username)
                            .tokenSignature(token.substring(Math.max(0, token.length() - 20)))
                            .ipAddress("auto-recreated")
                            .deviceInfo("Session restored after DB reset")
                            .browser("Unknown")
                            .createdAt(LocalDateTime.now())
                            .lastActiveAt(LocalDateTime.now())
                            .expiresAt(LocalDateTime.now().plusHours(24))
                            .isValid(true)
                            .build();

                    try {
                        adminSessionRepository.save(Objects.requireNonNull(newSession));
                        System.out.println("[AdminService] Session auto-recreated successfully");
                        return true;
                    } catch (Exception e) {
                        System.err.println("[AdminService] Failed to auto-recreate session: " + e.getMessage());
                        // Still return true if JWT is valid - don't block the admin
                        return true;
                    }
                }

                System.out.println("[AdminService] Session not found and cannot auto-recreate");
                return false;
            }
        } catch (Exception e) {
            System.err.println("[AdminService] Session validation error: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("activeUsers", userRepository.countByStatus(AccountStatus.ACTIVE));
        stats.put("blockedUsers", userRepository.countByStatus(AccountStatus.BLOCKED));
        stats.put("bannedUsers", userRepository.countByStatus(AccountStatus.BANNED));
        return stats;
    }

    @Transactional(readOnly = true)
    public Page<AdminUserDto> searchUsers(String query, com.researcher.tool.model.AccountStatus status, String role,
            Pageable pageable) {
        try {
            String safeQuery = (query == null) ? "" : query.trim();
            System.out
                    .println("Searching users with query: '" + safeQuery + "', status: " + status + ", role: " + role);

            Page<User> users = userRepository.searchUsers(safeQuery, status, role, pageable);
            System.out.println("Found " + users.getTotalElements() + " users");

            return users.map(user -> {
                AdminUserDto dto = new AdminUserDto();
                dto.setId(user.getId());
                dto.setEmail(user.getEmail());
                dto.setStatus(user.getStatus());
                dto.setProfileCompleted(user.getProfileCompleted());
                dto.setCreatedAt(user.getCreatedAt());
                dto.setBlockedUntil(user.getBlockedUntil());

                try {
                    researcherProfileRepository.findByUser(user).ifPresent(profile -> {
                        AdminUserDto.ProfileSummary summary = new AdminUserDto.ProfileSummary();
                        summary.setName(profile.getFullName());
                        summary.setInstitution(profile.getInstitution());
                        summary.setDisplayName(profile.getDisplayName());
                        dto.setProfile(summary);
                    });
                } catch (Exception e) {
                    System.err.println("Error fetching profile for user " + user.getEmail() + ": " + e.getMessage());
                }

                return dto;
            });
        } catch (Exception e) {
            System.err.println("Error in searchUsers: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public UserDetailDto getUserDetail(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserDetailDto dto = new UserDetailDto();

        researcherProfileRepository.findByUser(user).ifPresent(profile -> {
            dto.setDisplayName(profile.getDisplayName());
            dto.setFullName(profile.getFullName());
            dto.setBio(profile.getBio());
            dto.setAvatarUrl(profile.getAvatarUrl());
            dto.setCountry(profile.getCountry());
            dto.setInstitution(profile.getInstitution());
            dto.setRole(profile.getRole());
            dto.setDepartment(profile.getDepartment());
            dto.setResearchInterests(profile.getResearchInterests());
            dto.setFollowers(profile.getFollowers() != null ? profile.getFollowers() : 0);
            dto.setFollowing(profile.getFollowing() != null ? profile.getFollowing() : 0);
            dto.setContactEmail(profile.getContactEmail());
            dto.setOrcid(profile.getOrcid());
            dto.setLinkedinUrl(profile.getLinkedinUrl());
            dto.setScholarUrl(profile.getScholarUrl());

            // New fields
            dto.setCurrentTitle(profile.getCurrentTitle());
            dto.setPersonalWebsite(profile.getPersonalWebsite());
            dto.setPubmedAuthorId(profile.getPubmedAuthorId());
            dto.setGender(profile.getGender());
            dto.setIsPublic(profile.getIsPublic());
            dto.setEmailDiscovery(profile.getEmailDiscovery());

            // Calculate profile completion percentage
            int completion = calculateProfileCompletion(profile);
            dto.setProfileCompletion(completion);

            // Last active could be from user's updatedAt
            if (user.getUpdatedAt() != null) {
                dto.setLastActive(user.getUpdatedAt().toString());
            }

            // Fetch Publications (limit to 10 for summary)
            List<UserDetailDto.ArticleSummaryDto> articles = userArticleRepository.findByUser(user).stream()
                    .limit(10)
                    .map(ua -> new UserDetailDto.ArticleSummaryDto(
                            ua.getArticle().getId(),
                            ua.getArticle().getTitle(),
                            ua.getArticle().getJournalName(),
                            String.valueOf(ua.getArticle().getPublicationYear())))
                    .collect(Collectors.toList());
            dto.setPublications(articles);

            // Fetch Followers (limit to 10)
            List<UserDetailDto.UserSummaryDto> followers = userFollowRepository.findByFollowing(user).stream()
                    .limit(10)
                    .map(f -> {
                        User fol = f.getFollower();
                        ResearcherProfile folProf = researcherProfileRepository.findByUser(fol).orElse(null);
                        return new UserDetailDto.UserSummaryDto(
                                fol.getId(),
                                folProf != null ? folProf.getFullName() : "Anonymous",
                                folProf != null ? folProf.getDisplayName() : null,
                                folProf != null ? folProf.getInstitution() : null,
                                folProf != null ? folProf.getRole() : null,
                                folProf != null ? folProf.getAvatarUrl() : null);
                    })
                    .collect(Collectors.toList());
            dto.setFollowersList(followers);

            // Fetch Following (limit to 10)
            List<UserDetailDto.UserSummaryDto> following = userFollowRepository.findByFollower(user).stream()
                    .limit(10)
                    .map(f -> {
                        User fol = f.getFollowing();
                        ResearcherProfile folProf = researcherProfileRepository.findByUser(fol).orElse(null);
                        return new UserDetailDto.UserSummaryDto(
                                fol.getId(),
                                folProf != null ? folProf.getFullName() : "Anonymous",
                                folProf != null ? folProf.getDisplayName() : null,
                                folProf != null ? folProf.getInstitution() : null,
                                folProf != null ? folProf.getRole() : null,
                                folProf != null ? folProf.getAvatarUrl() : null);
                    })
                    .collect(Collectors.toList());
            dto.setFollowingList(following);

            // Fetch Admin Stats
            UserDetailDto.AdminStatsDto adminStats = new UserDetailDto.AdminStatsDto();
            List<AdminAction> actions = adminActionRepository.findByTargetUserIdOrderByCreatedAtDesc(user.getId());
            adminStats.setTotalActions(actions.size());
            adminStats.setWarningsCount(actions.stream()
                    .filter(a -> a.getActionType() == AdminActionType.BLOCK
                            || a.getActionType() == AdminActionType.NOTIFY)
                    .count());
            if (!actions.isEmpty()) {
                adminStats.setLastAction(
                        actions.get(0).getActionType().toString() + " at " + actions.get(0).getCreatedAt());
            }
            adminStats.setAccountStatus(user.getStatus().toString());
            dto.setAdminStats(adminStats);
        });

        return dto;
    }

    @Value("${admin.encryption-key}")
    private String adminEncryptionKey;

    @Transactional
    public void blockUser(UUID userId, int days, String reason, String key) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        validateEncryptionKey(key);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setStatus(AccountStatus.BLOCKED);
        user.setBlockedUntil(LocalDateTime.now().plusDays(days));
        userRepository.save(user);

        // CRITICAL: Invalidate all user sessions immediately
        int invalidatedSessions = invalidateUserSessions(userId, user.getEmail());
        System.out.println("[AdminService] Blocked user " + user.getEmail() + ", invalidated " + invalidatedSessions
                + " sessions");

        logAction(AdminActionType.BLOCK, userId, reason + " (" + invalidatedSessions + " sessions terminated)", days);
    }

    @Transactional
    public void unblockUser(UUID userId, String reason, String key) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        validateEncryptionKey(key);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setStatus(AccountStatus.ACTIVE);
        user.setBlockedUntil(null);
        user.setBanExpiresAt(null);
        user.setBanReason(null);
        userRepository.save(user);

        logAction(AdminActionType.UNBLOCK, userId, reason, null);
    }

    @Transactional
    public void banUser(UUID userId, String reason, String key) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        validateEncryptionKey(key);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setStatus(AccountStatus.BANNED);
        user.setBlockedUntil(null); // Permanent
        userRepository.save(user);

        // CRITICAL: Invalidate all user sessions immediately
        int invalidatedSessions = invalidateUserSessions(userId, user.getEmail());
        System.out.println(
                "[AdminService] Banned user " + user.getEmail() + ", invalidated " + invalidatedSessions + " sessions");

        logAction(AdminActionType.BAN, userId, reason + " (" + invalidatedSessions + " sessions terminated)", null);
    }

    @Transactional
    public void deleteUser(UUID userId, String reason, String key) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        validateEncryptionKey(key);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setStatus(AccountStatus.DELETED);
        userRepository.save(user);

        // CRITICAL: Invalidate all user sessions immediately
        int invalidatedSessions = invalidateUserSessions(userId, user.getEmail());
        System.out.println("[AdminService] Deleted user " + user.getEmail() + ", invalidated " + invalidatedSessions
                + " sessions");

        logAction(AdminActionType.DELETE, userId, reason + " (" + invalidatedSessions + " sessions terminated)", null);
    }

    /**
     * Invalidate all active sessions for a user.
     * This is called when blocking, banning, or deleting a user.
     */
    private int invalidateUserSessions(UUID userId, String email) {
        int count = 0;
        try {
            // Invalidate by userId
            try {
                count += userSessionRepository.invalidateAllSessionsForUser(userId);
            } catch (Exception e) {
                System.err.println("[AdminService] Failed to invalidate sessions by ID: " + e.getMessage());
            }

            // Also invalidate by email as fallback
            if (email != null) {
                try {
                    count += userSessionRepository.invalidateAllSessionsByEmail(email);
                } catch (Exception e) {
                    System.err.println("[AdminService] Failed to invalidate sessions by email: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("[AdminService] Failed to invalidate sessions: " + e.getMessage());
        }
        return count;
    }

    public void validateEncryptionKey(String key) {
        if (key == null || !key.equals(adminEncryptionKey)) {
            throw new RuntimeException("Invalid encryption key");
        }
    }

    @Transactional(readOnly = true)
    public Page<AdminAction> getAuditLogs(Pageable pageable) {
        if (pageable == null) {
            return Page.empty();
        }
        return adminActionRepository.findAll(pageable);
    }

    @Transactional
    public void sendNotification(UUID userId, String type, String message) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // For admin notifications, we'll log them for now
        // The notification model expects an actor, which doesn't apply for admin
        // notifications
        System.out.println("Admin notification for user " + user.getEmail() + ": [" + type + "] " + message);

        // Log this as an admin action
        logAction(AdminActionType.NOTIFY, userId, message, null);
    }

    @Transactional
    public void sendEmailReminder(UUID userId, String templateType, String customMessage) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID cannot be null");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String subject;
        String body;

        switch (templateType) {
            case "profile_incomplete":
                subject = "Complete Your Research Platform Profile";
                body = "Your profile is incomplete. A complete profile helps you connect with other researchers and increases your visibility in the community.\n\nPlease log in to complete your profile.";
                break;
            case "institution_missing":
                subject = "Add Your Institution to Your Profile";
                body = "We noticed you haven't added your institution to your profile. Adding this information helps verify your credentials and connect you with colleagues.\n\nPlease log in to update your profile.";
                break;
            case "custom":
                subject = "Message from Research Platform Admin";
                body = customMessage != null ? customMessage : "";
                break;
            default:
                subject = "Notification from Research Platform";
                body = customMessage != null ? customMessage
                        : "You have a new notification from the platform administrators.";
        }

        boolean sent = sendEmail(user.getEmail(), subject, body);

        // Log this as an admin action
        logAction(AdminActionType.EMAIL, userId, subject, null, sent);
    }

    private boolean sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(adminUsername); // Or a noreply address if configured
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            System.out.println("Email sent successfully to " + to);
            return true;
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
            // Don't rethrow to avoid breaking bulk operations, but maybe log it better?
            return false;
        }
    }

    // ... logAction method (unchanged) ...

    private void logAction(AdminActionType type, UUID targetId, String reason, Integer duration) {
        logAction(type, targetId, reason, duration, true);
    }

    private void logAction(AdminActionType type, UUID targetId, String reason, Integer duration, Boolean success) {
        AdminAction action = new AdminAction(
                adminUsername,
                type,
                targetId,
                reason,
                duration,
                success);
        adminActionRepository.save(action);
    }

    // Profile Completion Alert Methods (rest of file)
    // ... (getUsersByProfileCompletion, getMissingFields, getProfileCompletionStats
    // unchanged) ...
    // Note: Since I can't easily jump over unchanged methods in
    // replace_file_content if they are in middle, I'll update sendBulk...
    // separately or targeting distinct block.
    // I will target sendEmailReminder through logAction.

    // Profile Completion Alert Methods
    @Transactional(readOnly = true)
    public Page<ProfileCompletionUserDto> getUsersByProfileCompletion(
            int minCompletion, int maxCompletion, String role, String status, Pageable pageable) {

        AccountStatus accountStatus = status != null && !status.isEmpty() ? AccountStatus.valueOf(status.toUpperCase())
                : AccountStatus.ACTIVE;

        // Get all users of this status then filter by completion
        List<User> allUsers = userRepository.findByStatus(accountStatus);

        List<ProfileCompletionUserDto> filtered = allUsers.stream()
                .map(user -> {
                    ProfileCompletionUserDto dto = new ProfileCompletionUserDto();
                    dto.setId(user.getId());
                    dto.setEmail(user.getEmail());
                    dto.setCreatedAt(user.getCreatedAt());
                    dto.setLastLoginAt(user.getUpdatedAt());

                    var profileOpt = researcherProfileRepository.findByUser(user);
                    if (profileOpt.isPresent()) {
                        ResearcherProfile profile = profileOpt.get();
                        dto.setName(profile.getFullName());
                        dto.setInstitution(profile.getInstitution());
                        dto.setRole(profile.getRole());
                        int completion = calculateProfileCompletion(profile);
                        dto.setCompletionPercentage(completion);
                        dto.setMissingFields(getMissingFields(profile));
                    } else {
                        dto.setCompletionPercentage(0);
                        dto.setMissingFields(List.of("Full Name", "Institution", "Bio", "ORCID", "Country",
                                "Department", "Role", "Research Interests"));
                    }

                    return dto;
                })
                .filter(dto -> dto.getCompletionPercentage() >= minCompletion
                        && dto.getCompletionPercentage() <= maxCompletion)
                .filter(dto -> role == null || role.isEmpty() || role.equalsIgnoreCase(dto.getRole()))
                .collect(Collectors.toList());

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<ProfileCompletionUserDto> pageContent = start < filtered.size()
                ? filtered.subList(start, end)
                : java.util.Collections.emptyList();

        return new PageImpl<>(Objects.requireNonNull(pageContent), pageable, filtered.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProfileCompletionStats() {
        Map<String, Object> stats = new HashMap<>();
        long total = userRepository.countByStatus(AccountStatus.ACTIVE);

        // Calculate completion buckets
        java.util.List<User> activeUsers = userRepository.findByStatus(AccountStatus.ACTIVE);
        long incomplete = 0; // < 60
        long basic = 0; // 60-80
        long nearly = 0; // 80-95
        long complete = 0; // 95-100

        for (User user : activeUsers) {
            int completion = researcherProfileRepository.findByUser(user)
                    .map(this::calculateProfileCompletion)
                    .orElse(0);

            if (completion < 60)
                incomplete++;
            else if (completion < 80)
                basic++;
            else if (completion < 95)
                nearly++;
            else
                complete++;
        }

        stats.put("total", total);
        stats.put("incomplete", incomplete); // < 60%
        stats.put("basic", basic); // 60-80%
        stats.put("nearly", nearly); // 80-95%
        stats.put("complete", complete); // 95-100%
        return stats;
    }

    @Transactional
    public Map<String, Object> sendBulkProfileCompletionEmail(
            List<UUID> userIds, String subject, String body) {
        int sent = 0, failed = 0;

        for (UUID userId : userIds) {
            try {
                User user = userRepository.findById(Objects.requireNonNull(userId)).orElse(null);
                if (user == null) {
                    failed++;
                    logAction(AdminActionType.EMAIL, userId, "User not found for bulk email", null, false);
                    continue;
                }

                String name = "Researcher";
                int completion = 0;

                var profileOpt = researcherProfileRepository.findByUser(user);
                if (profileOpt.isPresent()) {
                    completion = calculateProfileCompletion(profileOpt.get());
                    if (profileOpt.get().getFullName() != null && !profileOpt.get().getFullName().isEmpty()) {
                        name = profileOpt.get().getFullName();
                    }
                } else {
                    // Try to get name part from email
                    name = user.getEmail().split("@")[0];
                }

                // If body contains {{percentage}}, double check strict completion logic?
                // Currently user.completion might not be stored in User entity, only calculated
                // on fly.

                String personalizedBody = body
                        .replace("{{name}}", name)
                        .replace("{{percentage}}", String.valueOf(completion))
                        .replace("{{email}}", user.getEmail());

                boolean success = sendEmail(user.getEmail(), subject, personalizedBody);

                logAction(AdminActionType.EMAIL, userId, "Profile completion email: " + subject, null, success);
                if (success)
                    sent++;
                else
                    failed++;
            } catch (Exception e) {
                failed++;
                System.err.println("Failed to send email to user " + userId + ": " + e.getMessage());
                logAction(AdminActionType.EMAIL, userId, "Email failed: " + e.getMessage(), null, false);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sent", sent);
        result.put("failed", failed);
        result.put("total", userIds.size());
        return result;
    }

    // ============ SESSION MANAGEMENT METHODS ============

    /**
     * Get all active sessions for the admin user.
     * Returns a list of session DTOs with id, browser, ipAddress, lastActiveAt,
     * createdAt, isCurrent
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveSessions(String currentToken) {
        String currentSessionIdStr = jwtService.extractClaim(currentToken,
                claims -> claims.get("sessionId", String.class));
        UUID currentSessionId = currentSessionIdStr != null ? UUID.fromString(currentSessionIdStr) : null;

        List<AdminSession> sessions = adminSessionRepository.findByAdminUsernameAndIsValidTrue(adminUsername);

        return sessions.stream()
                .filter(s -> s.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(session -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id", session.getId().toString());
                    dto.put("browser", session.getBrowser());
                    dto.put("ipAddress", session.getIpAddress());
                    dto.put("deviceInfo", session.getDeviceInfo());
                    dto.put("lastActiveAt", session.getLastActiveAt().toString());
                    dto.put("createdAt", session.getCreatedAt().toString());
                    dto.put("isCurrent", session.getId().equals(currentSessionId));
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Invalidate a specific session. Admin can invalidate any of their sessions
     * except current.
     */
    @Transactional
    public void invalidateSession(UUID sessionId, String currentToken) {
        String currentSessionIdStr = jwtService.extractClaim(currentToken,
                claims -> claims.get("sessionId", String.class));
        UUID currentSessionId = currentSessionIdStr != null ? UUID.fromString(currentSessionIdStr) : null;

        if (sessionId.equals(currentSessionId)) {
            throw new RuntimeException("Cannot invalidate current session. Use logout instead.");
        }

        adminSessionRepository.findById(sessionId).ifPresent(session -> {
            session.setValid(false);
            adminSessionRepository.save(session);
            System.out.println("[AdminService] Session " + sessionId + " invalidated");
        });
    }

    /**
     * Invalidate all sessions except the current one.
     * Returns the number of sessions invalidated.
     */
    @Transactional
    public int invalidateAllOtherSessions(String currentToken) {
        String currentSessionIdStr = jwtService.extractClaim(currentToken,
                claims -> claims.get("sessionId", String.class));
        UUID currentSessionId = currentSessionIdStr != null ? UUID.fromString(currentSessionIdStr) : null;

        List<AdminSession> sessions = adminSessionRepository.findByAdminUsernameAndIsValidTrue(adminUsername);
        int count = 0;

        for (AdminSession session : sessions) {
            if (!session.getId().equals(currentSessionId)) {
                session.setValid(false);
                adminSessionRepository.save(session);
                count++;
            }
        }

        System.out.println("[AdminService] Invalidated " + count + " sessions (kept current)");
        return count;
    }
}
