package com.researcher.tool.service;

import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.dto.ProfileDto;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.model.User;
import com.researcher.tool.repository.ResearcherProfileRepository;
import com.researcher.tool.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class ResearcherProfileService {

    private final ResearcherProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final FollowService followService;
    private final com.researcher.tool.repository.AcademicDetailRepository academicDetailRepository;
    private final com.researcher.tool.repository.UserArticleRepository userArticleRepository;
    private final PubMedService pubMedService;
    private final org.springframework.web.reactive.function.client.WebClient webClient;
    private final com.researcher.tool.repository.OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;

    public ResearcherProfileService(ResearcherProfileRepository profileRepository, UserRepository userRepository,
            FollowService followService,
            com.researcher.tool.repository.AcademicDetailRepository academicDetailRepository,
            com.researcher.tool.repository.UserArticleRepository userArticleRepository,
            PubMedService pubMedService,
            org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder,
            com.researcher.tool.repository.OtpTokenRepository otpTokenRepository,
            EmailService emailService) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.followService = followService;
        this.academicDetailRepository = academicDetailRepository;
        this.userArticleRepository = userArticleRepository;
        this.pubMedService = pubMedService;
        this.webClient = webClientBuilder.baseUrl("https://pub.orcid.org/v3.0").build();
        this.otpTokenRepository = otpTokenRepository;
        this.emailService = emailService;
    }

    public boolean isUsernameAvailable(String username) {
        return !profileRepository.existsByDisplayName(username);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> searchResearchers(String currentEmail, String query, String department,
            String institution,
            String domain, String expertise, String country, int page, int size) {
        User currentUser = null;
        if (currentEmail != null) {
            currentUser = userRepository.findByEmail(currentEmail).orElse(null);
        }
        java.util.UUID currentUserId = currentUser != null ? currentUser.getId() : null;

        // Prepare wildcards for case-insensitive LIKE search
        String queryPattern = (query != null && !query.trim().isEmpty()) ? "%" + query.trim().toLowerCase() + "%"
                : null;
        String instPattern = (institution != null && !institution.trim().isEmpty())
                ? "%" + institution.trim().toLowerCase() + "%"
                : null;
        String expPattern = (expertise != null && !expertise.trim().isEmpty())
                ? "%" + expertise.trim().toLowerCase() + "%"
                : null;
        String countryPattern = (country != null && !country.trim().isEmpty())
                ? "%" + country.trim().toLowerCase() + "%"
                : null;

        Page<ResearcherProfile> profiles;
        if (queryPattern == null && department == null && instPattern == null && domain == null && expPattern == null
                && countryPattern == null) {
            // Use randomized discovery for empty search, capped at 20 users as requested
            int discoverySize = Math.min(size, 20);
            profiles = profileRepository.discover(currentUserId, department, institution, domain, country,
                    PageRequest.of(0, discoverySize));
        } else {
            Pageable pageable = PageRequest.of(page, size, Sort.by("followers").descending());
            profiles = profileRepository.search(currentUserId, queryPattern, department, instPattern,
                    domain, expPattern, countryPattern, pageable);
        }

        return new PageResponse<>(profiles.map(this::mapToSummaryFromProfile));
    }

    @Transactional(readOnly = true)
    public ProfileDto getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> new ResearcherProfile(user));

        return mapToDto(profile);
    }

    @Transactional(readOnly = true)
    public ProfileDto getProfileByUserId(java.util.UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> new ResearcherProfile(user));

        return mapToDto(profile);
    }

    @Transactional(readOnly = true)
    public ProfileDto getProfileByUsername(String username) {
        ResearcherProfile profile = profileRepository.findByDisplayName(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToDto(profile);
    }

    @Transactional
    public ProfileDto updateProfile(String email, ProfileDto dto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> {
                    ResearcherProfile newProfile = new ResearcherProfile(user);
                    return profileRepository.save(newProfile);
                });

        if (dto.getName() != null)
            profile.setFullName(dto.getName());
        if (dto.getAvatarUrl() != null)
            profile.setAvatarUrl(dto.getAvatarUrl());
        // Username (displayName) is immutable after onboarding - do not allow changes
        // if (dto.getDisplayName() != null)
        // profile.setDisplayName(dto.getDisplayName());
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
        if (dto.getInterests() != null)
            profile.setResearchInterests(dto.getInterests());

        if (dto.getSocialLinks() != null) {
            Map<String, String> links = dto.getSocialLinks();
            if (links.containsKey("orcid")) {
                String rawOrcid = links.get("orcid");
                if (rawOrcid != null && !rawOrcid.isEmpty()) {
                    String cleanOrcid = com.researcher.tool.utils.OrcidValidator.clean(rawOrcid);
                    if (!com.researcher.tool.utils.OrcidValidator.isValid(cleanOrcid)) {
                        throw new RuntimeException("ORCID iD failed checksum validation. Please verify your ORCID.");
                    }
                    if (!cleanOrcid.equals(profile.getOrcid()) || !Boolean.TRUE.equals(profile.getIsOrcidVerified())) {
                        profile.setOrcid(cleanOrcid);
                        if (!checkOrcidExists(cleanOrcid)) {
                            throw new RuntimeException("This ORCID iD does not exist in the ORCID registry.");
                        }
                        profile.setIsOrcidVerified(true);
                    }
                } else {
                    profile.setOrcid(null);
                    profile.setIsOrcidVerified(false);
                }
            }
            if (links.containsKey("scholar"))
                profile.setScholarUrl(links.get("scholar"));
            if (links.containsKey("linkedin"))
                profile.setLinkedinUrl(links.get("linkedin"));
            if (links.containsKey("website"))
                profile.setPersonalWebsite(links.get("website"));
            if (links.containsKey("email")) {
                String newEmail = links.get("email");
                String currentEmail = profile.getContactEmail();
                if (newEmail != null && !newEmail.equals(currentEmail)) {
                    // Update contact email but mark unverified
                    profile.setContactEmail(newEmail);
                    profile.setIsEmailVerified(false);
                    profile.setPendingEmail(null); // Clear pending if they just changed it manually
                }
            }
        }

        ResearcherProfile savedProfile = profileRepository.save(profile);
        return mapToDto(savedProfile);
    }

    @Transactional
    public void completeOnboarding(String email, ProfileDto dto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validation
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new RuntimeException("Full Name is required");
        }
        if (dto.getDisplayName() == null || dto.getDisplayName().trim().isEmpty()) {
            throw new RuntimeException("Display Name is required");
        }
        if (dto.getCountry() == null || dto.getCountry().trim().isEmpty()) {
            throw new RuntimeException("Country is required");
        }
        if (dto.getInstitution() == null || dto.getInstitution().trim().isEmpty()) {
            throw new RuntimeException("Institution is required");
        }
        if (dto.getRole() == null || dto.getRole().trim().isEmpty()) {
            throw new RuntimeException("Role is required");
        }

        // 1. Fetch/Create Profile
        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> new ResearcherProfile(user));

        // 2. Update Profile level info (including name and onboarding step)
        if (dto.getName() != null && !dto.getName().isEmpty()) {
            profile.setFullName(dto.getName());
        }
        profile.setOnboardingStep(3); // Completed

        // Update other fields
        updateProfileFromDto(profile, dto);
        profileRepository.save(profile);

        // 3. Save Academic Detail (New Table)
        @SuppressWarnings("null")
        com.researcher.tool.model.AcademicDetail academicDetail = academicDetailRepository.findByUser(user)
                .orElseGet(() -> new com.researcher.tool.model.AcademicDetail(user));
        updateAcademicDetailFromDto(academicDetail, dto);
        academicDetailRepository.save(academicDetail);

        // 4. Update User level info
        user.setProfileCompleted(true);
        userRepository.save(user);
    }

    @Transactional
    public User completeRegistration(String email, String encodedPassword, com.researcher.tool.dto.ProfileDto dto) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already in use");
        }

        // Create User
        User user = new User(email, encodedPassword, com.researcher.tool.model.AuthProvider.LOCAL, null);
        user.setEmailVerified(true);
        user.setProfileCompleted(true);
        user = userRepository.save(user);

        // Create Profile
        ResearcherProfile profile = new ResearcherProfile(user);
        profile.setFullName(dto.getName());
        profile.setOnboardingStep(3); // Completed
        updateProfileFromDto(profile, dto);
        profileRepository.save(profile);

        // Save Academic Detail (New Table)
        com.researcher.tool.model.AcademicDetail academicDetail = new com.researcher.tool.model.AcademicDetail(user);
        updateAcademicDetailFromDto(academicDetail, dto);
        academicDetailRepository.save(academicDetail);

        return user;
    }

    private void updateProfileFromDto(ResearcherProfile profile, ProfileDto dto) {
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
        if (dto.getInterests() != null)
            profile.setResearchInterests(dto.getInterests());
        if (dto.getAvatarUrl() != null)
            profile.setAvatarUrl(dto.getAvatarUrl());
        if (dto.getGender() != null)
            profile.setGender(dto.getGender());
        if (dto.getIsPublic() != null)
            profile.setIsPublic(dto.getIsPublic());
        if (dto.getEmailDiscovery() != null)
            profile.setEmailDiscovery(dto.getEmailDiscovery());

        // Update notification settings
        if (dto.getNotifCitations() != null)
            profile.setNotifCitations(dto.getNotifCitations());
        if (dto.getNotifProfileViews() != null)
            profile.setNotifProfileViews(dto.getNotifProfileViews());
        if (dto.getNotifNewPublications() != null)
            profile.setNotifNewPublications(dto.getNotifNewPublications());
        if (dto.getNotifNetworkUpdates() != null)
            profile.setNotifNetworkUpdates(dto.getNotifNetworkUpdates());
        if (dto.getNotifNewFollowers() != null)
            profile.setNotifNewFollowers(dto.getNotifNewFollowers());
        if (dto.getNotifMentions() != null)
            profile.setNotifMentions(dto.getNotifMentions());
        if (dto.getEmailDigest() != null)
            profile.setEmailDigest(dto.getEmailDigest());
        if (dto.getPushEnabled() != null)
            profile.setPushEnabled(dto.getPushEnabled());
        if (dto.getEmailMarketing() != null)
            profile.setEmailMarketing(dto.getEmailMarketing());

        // New Granular Notifications
        if (dto.getNotifCitationInApp() != null)
            profile.setNotifCitationInApp(dto.getNotifCitationInApp());
        if (dto.getNotifCitationEmail() != null)
            profile.setNotifCitationEmail(dto.getNotifCitationEmail());
        if (dto.getNotifPublicationInApp() != null)
            profile.setNotifPublicationInApp(dto.getNotifPublicationInApp());
        if (dto.getNotifPublicationEmail() != null)
            profile.setNotifPublicationEmail(dto.getNotifPublicationEmail());
        if (dto.getNotifRecommendationInApp() != null)
            profile.setNotifRecommendationInApp(dto.getNotifRecommendationInApp());
        if (dto.getNotifRecommendationEmail() != null)
            profile.setNotifRecommendationEmail(dto.getNotifRecommendationEmail());

        if (dto.getNotifFollowerInApp() != null)
            profile.setNotifFollowerInApp(dto.getNotifFollowerInApp());
        if (dto.getNotifFollowerEmail() != null)
            profile.setNotifFollowerEmail(dto.getNotifFollowerEmail());
        if (dto.getNotifMentionInApp() != null)
            profile.setNotifMentionInApp(dto.getNotifMentionInApp());
        if (dto.getNotifMentionEmail() != null)
            profile.setNotifMentionEmail(dto.getNotifMentionEmail());
        if (dto.getNotifProfileViewInApp() != null)
            profile.setNotifProfileViewInApp(dto.getNotifProfileViewInApp());
        if (dto.getNotifProfileViewEmail() != null)
            profile.setNotifProfileViewEmail(dto.getNotifProfileViewEmail());

        if (dto.getNotifSecurityEmail() != null)
            profile.setNotifSecurityEmail(dto.getNotifSecurityEmail());
        if (dto.getNotifSystemEmail() != null)
            profile.setNotifSystemEmail(dto.getNotifSystemEmail());

        // Update PubMed ID if provided
        if (dto.getPubmedAuthorId() != null) {
            String newId = dto.getPubmedAuthorId();
            if (!newId.equals(profile.getPubmedAuthorId())) {
                profile.setPubmedAuthorId(newId);
                // Validate Pub Med ID
                boolean isValid = !pubMedService.fetchPublicationsFromPubMed(newId + "[Author]").isEmpty();
                profile.setIsPubmedIdValid(isValid);
            }
        }

        if (dto.getSocialLinks() != null) {
            Map<String, String> links = dto.getSocialLinks();
            if (links.containsKey("orcid")) {
                String rawOrcid = links.get("orcid");
                if (rawOrcid != null && !rawOrcid.isEmpty()) {
                    String cleanOrcid = com.researcher.tool.utils.OrcidValidator.clean(rawOrcid);
                    if (!com.researcher.tool.utils.OrcidValidator.isValid(cleanOrcid)) {
                        throw new RuntimeException("ORCID iD failed checksum validation. Please verify your ORCID.");
                    }
                    if (!cleanOrcid.equals(profile.getOrcid()) || !Boolean.TRUE.equals(profile.getIsOrcidVerified())) {
                        profile.setOrcid(cleanOrcid);
                        if (!checkOrcidExists(cleanOrcid)) {
                            throw new RuntimeException("This ORCID iD does not exist in the ORCID registry.");
                        }
                        profile.setIsOrcidVerified(true);
                    }
                } else {
                    profile.setOrcid(null);
                    profile.setIsOrcidVerified(false);
                }
            }
            if (links.containsKey("scholar"))
                profile.setScholarUrl(links.get("scholar"));
            if (links.containsKey("linkedin"))
                profile.setLinkedinUrl(links.get("linkedin"));
            if (links.containsKey("website"))
                profile.setPersonalWebsite(links.get("website"));
            if (links.containsKey("email"))
                profile.setContactEmail(links.get("email"));
        }

        // Also update academic details if they exist
        academicDetailRepository.findByUser(profile.getUser()).ifPresent(academic -> {
            @SuppressWarnings("null")
            com.researcher.tool.model.AcademicDetail nonNullAcademic = academic;
            updateAcademicDetailFromDto(nonNullAcademic, dto);
            academicDetailRepository.save(nonNullAcademic);
        });
    }

    private void updateAcademicDetailFromDto(com.researcher.tool.model.AcademicDetail academic, ProfileDto dto) {
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

    private ProfileDto mapToDto(ResearcherProfile profile) {
        ProfileDto dto = new ProfileDto();
        if (profile.getUser() != null) {
            dto.setUserId(profile.getUser().getId().toString());
        }
        dto.setName(profile.getFullName() != null ? profile.getFullName() : "");
        dto.setDisplayName(profile.getDisplayName() != null ? profile.getDisplayName() : "");
        dto.setCountry(profile.getCountry() != null ? profile.getCountry() : "");
        dto.setTitle(profile.getCurrentTitle() != null ? profile.getCurrentTitle() : "");
        dto.setInstitution(profile.getInstitution() != null ? profile.getInstitution() : "");
        dto.setRole(profile.getRole() != null ? profile.getRole() : "");
        dto.setDepartment(profile.getDepartment() != null ? profile.getDepartment() : "");
        dto.setBio(profile.getBio() != null ? profile.getBio() : "");
        dto.setInterests(
                profile.getResearchInterests() != null ? new java.util.ArrayList<>(profile.getResearchInterests())
                        : Collections.emptyList());
        dto.setAvatarUrl(profile.getAvatarUrl());
        dto.setGender(profile.getGender());
        dto.setIsPublic(profile.getIsPublic() != null ? profile.getIsPublic() : true);
        dto.setEmailDiscovery(profile.getEmailDiscovery() != null ? profile.getEmailDiscovery() : true);

        // Map notifications
        dto.setNotifCitations(profile.getNotifCitations() != null ? profile.getNotifCitations() : true);
        dto.setNotifProfileViews(profile.getNotifProfileViews() != null ? profile.getNotifProfileViews() : true);
        dto.setNotifNewPublications(
                profile.getNotifNewPublications() != null ? profile.getNotifNewPublications() : true);
        dto.setNotifNetworkUpdates(profile.getNotifNetworkUpdates() != null ? profile.getNotifNetworkUpdates() : true);
        dto.setNotifNewFollowers(profile.getNotifNewFollowers() != null ? profile.getNotifNewFollowers() : true);
        dto.setNotifMentions(profile.getNotifMentions() != null ? profile.getNotifMentions() : true);

        // New Granular Notifications
        dto.setNotifCitationInApp(profile.getNotifCitationInApp() != null ? profile.getNotifCitationInApp() : true);
        dto.setNotifCitationEmail(profile.getNotifCitationEmail() != null ? profile.getNotifCitationEmail() : true);
        dto.setNotifPublicationInApp(
                profile.getNotifPublicationInApp() != null ? profile.getNotifPublicationInApp() : true);
        dto.setNotifPublicationEmail(
                profile.getNotifPublicationEmail() != null ? profile.getNotifPublicationEmail() : true);
        dto.setNotifRecommendationInApp(
                profile.getNotifRecommendationInApp() != null ? profile.getNotifRecommendationInApp() : true);
        dto.setNotifRecommendationEmail(
                profile.getNotifRecommendationEmail() != null ? profile.getNotifRecommendationEmail() : true);

        dto.setNotifFollowerInApp(profile.getNotifFollowerInApp() != null ? profile.getNotifFollowerInApp() : true);
        dto.setNotifFollowerEmail(profile.getNotifFollowerEmail() != null ? profile.getNotifFollowerEmail() : true);
        dto.setNotifMentionInApp(profile.getNotifMentionInApp() != null ? profile.getNotifMentionInApp() : true);
        dto.setNotifMentionEmail(profile.getNotifMentionEmail() != null ? profile.getNotifMentionEmail() : true);
        dto.setNotifProfileViewInApp(
                profile.getNotifProfileViewInApp() != null ? profile.getNotifProfileViewInApp() : true);
        dto.setNotifProfileViewEmail(
                profile.getNotifProfileViewEmail() != null ? profile.getNotifProfileViewEmail() : true); // Likely email
                                                                                                         // or digest

        dto.setNotifSecurityEmail(profile.getNotifSecurityEmail() != null ? profile.getNotifSecurityEmail() : true);
        dto.setNotifSystemEmail(profile.getNotifSystemEmail() != null ? profile.getNotifSystemEmail() : true);

        dto.setEmailDigest(profile.getEmailDigest() != null ? profile.getEmailDigest() : "weekly");
        dto.setPushEnabled(profile.getPushEnabled() != null ? profile.getPushEnabled() : true);
        dto.setEmailMarketing(profile.getEmailMarketing() != null ? profile.getEmailMarketing() : false);
        dto.setStats(new java.util.HashMap<>());

        Map<String, String> socials = new HashMap<>();
        socials.put("orcid", profile.getOrcid() != null ? profile.getOrcid() : "");
        socials.put("scholar", profile.getScholarUrl() != null ? profile.getScholarUrl() : "");
        socials.put("linkedin", profile.getLinkedinUrl() != null ? profile.getLinkedinUrl() : "");
        socials.put("website", profile.getPersonalWebsite() != null ? profile.getPersonalWebsite() : "");

        // Return pending email if exists, otherwise contact email
        if (profile.getPendingEmail() != null && !profile.getPendingEmail().isEmpty()) {
            socials.put("email", profile.getPendingEmail());
        } else {
            socials.put("email", profile.getContactEmail() != null ? profile.getContactEmail()
                    : (profile.getUser() != null ? profile.getUser().getEmail() : ""));
        }
        dto.setSocialLinks(socials);

        Map<String, String> verificationStatus = new HashMap<>();
        verificationStatus.put("orcid", Boolean.TRUE.equals(profile.getIsOrcidVerified()) ? "VERIFIED" : "INVALID");

        if (profile.getPendingEmail() != null && !profile.getPendingEmail().isEmpty()) {
            verificationStatus.put("email", "PENDING");
        } else {
            verificationStatus.put("email",
                    Boolean.TRUE.equals(profile.getIsEmailVerified()) ? "VERIFIED" : "UNVERIFIED");
        }

        verificationStatus.put("scholar", "ADDED"); // Soft validation only
        verificationStatus.put("linkedin", "ADDED");
        verificationStatus.put("website", "ADDED");
        verificationStatus.put("pubmed", Boolean.TRUE.equals(profile.getIsPubmedIdValid()) ? "VALID" : "NOT_FOUND");

        dto.setVerificationStatus(verificationStatus);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("views", profile.getViews() != null ? profile.getViews() : 0);
        stats.put("citations", profile.getCitations() != null ? profile.getCitations() : 0);

        if (profile.getUser() != null) {
            com.researcher.tool.dto.FollowStatsDto followStats = followService.getStats(profile.getUser().getId());
            stats.put("followers", (int) followStats.getFollowersCount());
            stats.put("following", (int) followStats.getFollowingCount());
            long pubCount = userArticleRepository.countByUser(profile.getUser());
            stats.put("publications", (int) pubCount);
        } else {
            stats.put("publications", 0);
        }

        dto.setStats(stats);

        dto.setProfileCompletion(calculateProfileCompletion(profile));

        dto.setPubmedAuthorId(profile.getPubmedAuthorId());
        dto.setPubmedLastSync(profile.getPubmedLastSync());

        return dto;
    }

    @Transactional(readOnly = true)
    public java.util.List<UserSummaryDto> getSuggestions(String email, int limit) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ResearcherProfile profile = profileRepository.findByUser(user).orElse(null);

        java.util.List<ResearcherProfile> suggestions = profileRepository.findSuggestions(
                user.getId(), PageRequest.of(0, limit));

        return suggestions.stream()
                .map(this::mapToSummaryFromProfile)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public java.util.List<UserSummaryDto> getMentionSuggestions(String email, String query, int limit) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.List<ResearcherProfile> profiles = profileRepository.findMentions(
                user.getId(), query, PageRequest.of(0, limit));

        return profiles.stream()
                .map(this::mapToSummaryFromProfile)
                .collect(java.util.stream.Collectors.toList());
    }

    private UserSummaryDto mapToSummaryFromProfile(ResearcherProfile profile) {
        User user = profile.getUser();
        String name = profile.getFullName();
        String displayName = profile.getDisplayName();
        String avatar = profile.getAvatarUrl();
        String institution = profile.getInstitution();
        String department = profile.getDepartment();
        String bio = profile.getBio();
        String country = profile.getCountry();
        String gender = profile.getGender();
        java.util.List<String> interests = profile.getResearchInterests() != null
                ? new java.util.ArrayList<>(profile.getResearchInterests())
                : new java.util.ArrayList<>();
        return new UserSummaryDto(user.getId(), name, displayName, avatar, institution, department, bio, country,
                gender, interests);
    }

    @Transactional
    public void requestContactEmailOtp(String authEmail, String contactEmail) {
        User user = userRepository.findByEmail(authEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        String otp = String.format("%06d", new java.util.Random().nextInt(999999));

        // Save OTP with purpose REGISTRATION (or we could add a new purpose, but
        // REGISTRATION works for verification)
        // We use the contact email as the lookup key for the OTP
        otpTokenRepository.deleteByEmailAndPurpose(contactEmail,
                com.researcher.tool.model.OtpToken.OtpPurpose.REGISTRATION);
        otpTokenRepository.save(new com.researcher.tool.model.OtpToken(otp, contactEmail,
                com.researcher.tool.model.OtpToken.OtpPurpose.REGISTRATION, 10));

        emailService.sendOtpEmail(contactEmail, otp, "Contact Email Verification");

        profile.setPendingEmail(contactEmail);
        profileRepository.save(profile);
    }

    @Transactional
    public void verifyContactEmailOtp(String authEmail, String otp) {
        User user = userRepository.findByEmail(authEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        String pendingEmail = profile.getPendingEmail();
        if (pendingEmail == null) {
            throw new RuntimeException("No pending email verification found");
        }

        java.util.Optional<com.researcher.tool.model.OtpToken> otpToken = otpTokenRepository
                .findByEmailAndTokenAndPurpose(
                        pendingEmail, otp, com.researcher.tool.model.OtpToken.OtpPurpose.REGISTRATION);

        if (otpToken.isEmpty() || otpToken.get().isExpired()) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        profile.setContactEmail(pendingEmail);
        profile.setIsEmailVerified(true);
        profile.setPendingEmail(null);
        profileRepository.save(profile);

        otpToken.ifPresent(otpTokenRepository::delete);
    }

    private boolean checkOrcidExists(String orcid) {
        if (orcid == null || orcid.isEmpty()) {
            return false;
        }
        try {
            // Basic call to ORCID Public API to check existence
            java.util.Map response = webClient.get()
                    .uri("/{orcid}/person", orcid)
                    .header("Accept", "application/json")
                    .retrieve()
                    .bodyToMono(java.util.Map.class)
                    .block();
            return response != null;
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException.NotFound e) {
            return false;
        } catch (Exception e) {
            System.err.println("Failed to verify ORCID registry: " + e.getMessage());
            // If it's a network error, maybe shouldn't fail validation?
            // But spec says "If ORCID not found", so 404 is definitely false.
            return false;
        }
    }

    private boolean validateOrcid(String orcid) {
        String clean = com.researcher.tool.utils.OrcidValidator.clean(orcid);
        return com.researcher.tool.utils.OrcidValidator.isValid(clean);
    }

    @Transactional
    public void deleteAvatar(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ResearcherProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        profile.setAvatarUrl(null);
        profileRepository.save(profile);
    }

    public int calculateProfileCompletion(ResearcherProfile profile) {
        int score = 0;

        // 1. Core Identity (Base ~40%)
        if (profile.getFullName() != null && !profile.getFullName().isEmpty())
            score += 10;
        if (profile.getInstitution() != null && !profile.getInstitution().isEmpty())
            score += 10;
        if (profile.getCountry() != null && !profile.getCountry().isEmpty())
            score += 5;
        if (profile.getDepartment() != null && !profile.getDepartment().isEmpty())
            score += 5;
        if (profile.getRole() != null && !profile.getRole().isEmpty())
            score += 5;
        if (profile.getIsEmailVerified() != null && profile.getIsEmailVerified())
            score += 5;

        // 2. Academic Credibility (High Weight ~35%)
        if (profile.getOrcid() != null && !profile.getOrcid().isEmpty())
            score += 10;
        if (profile.getScholarUrl() != null && !profile.getScholarUrl().isEmpty())
            score += 10;
        if (profile.getPubmedAuthorId() != null && !profile.getPubmedAuthorId().isEmpty())
            score += 5;

        // Check for publications
        if (profile.getUser() != null) {
            long articleCount = userArticleRepository.countByUser(profile.getUser());
            if (articleCount > 0)
                score += 10;
        }

        // 3. Research Depth (Medium ~15%)
        if (profile.getResearchInterests() != null && !profile.getResearchInterests().isEmpty())
            score += 10;
        if (profile.getBio() != null && profile.getBio().length() > 20)
            score += 5;

        // 4. Professional Presence & Engagement (~10%)
        if (profile.getLinkedinUrl() != null && !profile.getLinkedinUrl().isEmpty())
            score += 5;
        if (profile.getPersonalWebsite() != null && !profile.getPersonalWebsite().isEmpty())
            score += 5;

        // Cap at 100
        return Math.min(100, score);
    }
}
