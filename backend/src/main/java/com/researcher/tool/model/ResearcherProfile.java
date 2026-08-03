package com.researcher.tool.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "researcher_profiles")
public class ResearcherProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(unique = true)
    private String displayName; // Username - unique and immutable after onboarding
    private String fullName;
    private String avatarUrl;
    private String country;
    private String institution;
    private String role; // Student, Research Scholar, Faculty, Independent Researcher
    private String gender; // Male, Female, Other

    // Step 2 Fields
    private String department;
    private String currentTitle; // Current Position / Title
    private String personalWebsite;
    private String orcid;
    private String scholarUrl;
    private String linkedinUrl;
    private String contactEmail;
    private Boolean isEmailVerified = false;
    private String pendingEmail;

    private Boolean isOrcidVerified = false;

    // PubMed Integration Fields
    private String pubmedAuthorId; // PubMed Author ID or ORCID
    @Column(name = "pubmed_last_sync")
    private java.time.LocalDateTime pubmedLastSync;
    private Boolean isPubmedIdValid = false;

    private Boolean isPublic = true;
    private Boolean emailDiscovery = true;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @ElementCollection
    @CollectionTable(name = "profile_interests", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "interest")
    private List<String> researchInterests;

    private Integer onboardingStep = 1;

    // Stats
    private Integer views = 0;
    private Integer citations = 0;
    private Integer followers = 0;
    private Integer following = 0;

    // Notification Preferences - Research
    private Boolean notifCitations = true;
    private Boolean notifProfileViews = true;
    private Boolean notifNewPublications = true;

    // Notification Preferences - Networking
    private Boolean notifNetworkUpdates = true;
    private Boolean notifNewFollowers = true;
    private Boolean notifMentions = true;

    // Granular Notification Controls (New)
    // Research
    private Boolean notifCitationInApp = true;
    private Boolean notifCitationEmail = true;
    private Boolean notifPublicationInApp = true;
    private Boolean notifPublicationEmail = true;
    private Boolean notifRecommendationInApp = true;
    private Boolean notifRecommendationEmail = true;

    // Social
    private Boolean notifFollowerInApp = true;
    private Boolean notifFollowerEmail = true;
    private Boolean notifMentionInApp = true;
    private Boolean notifMentionEmail = true;
    private Boolean notifProfileViewInApp = true;
    private Boolean notifProfileViewEmail = true;

    // System & Security (Admin enforced mostly, but stored here for user overrides
    // if allowed)
    private Boolean notifSecurityEmail = true; // Email ON by default, In-app mandatory
    private Boolean notifSystemEmail = true; // Announcements etc.

    // Channels
    private String emailDigest = "weekly"; // daily, weekly, never
    private Boolean pushEnabled = true;
    private Boolean emailMarketing = false;

    public ResearcherProfile() {
    }

    public ResearcherProfile(User user) {
        this.user = user;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getInstitution() {
        return institution;
    }

    public void setInstitution(String institution) {
        this.institution = institution;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getCurrentTitle() {
        return currentTitle;
    }

    public void setCurrentTitle(String currentTitle) {
        this.currentTitle = currentTitle;
    }

    public String getPersonalWebsite() {
        return personalWebsite;
    }

    public void setPersonalWebsite(String personalWebsite) {
        this.personalWebsite = personalWebsite;
    }

    public String getOrcid() {
        return orcid;
    }

    public void setOrcid(String orcid) {
        this.orcid = orcid;
    }

    public String getScholarUrl() {
        return scholarUrl;
    }

    public void setScholarUrl(String scholarUrl) {
        this.scholarUrl = scholarUrl;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public List<String> getResearchInterests() {
        return researchInterests;
    }

    public void setResearchInterests(List<String> researchInterests) {
        this.researchInterests = researchInterests;
    }

    public Integer getOnboardingStep() {
        return onboardingStep;
    }

    public void setOnboardingStep(Integer onboardingStep) {
        this.onboardingStep = onboardingStep;
    }

    public Integer getViews() {
        return views;
    }

    public void setViews(Integer views) {
        this.views = views;
    }

    public Integer getCitations() {
        return citations;
    }

    public void setCitations(Integer citations) {
        this.citations = citations;
    }

    public Integer getFollowers() {
        return followers;
    }

    public void setFollowers(Integer followers) {
        this.followers = followers;
    }

    public Integer getFollowing() {
        return following;
    }

    public void setFollowing(Integer following) {
        this.following = following;
    }

    public String getPubmedAuthorId() {
        return pubmedAuthorId;
    }

    public void setPubmedAuthorId(String pubmedAuthorId) {
        this.pubmedAuthorId = pubmedAuthorId;
    }

    public java.time.LocalDateTime getPubmedLastSync() {
        return pubmedLastSync;
    }

    public void setPubmedLastSync(java.time.LocalDateTime pubmedLastSync) {
        this.pubmedLastSync = pubmedLastSync;
    }

    public Boolean getIsPublic() {
        return isPublic;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public Boolean getEmailDiscovery() {
        return emailDiscovery;
    }

    public void setEmailDiscovery(Boolean emailDiscovery) {
        this.emailDiscovery = emailDiscovery;
    }

    public Boolean getNotifCitations() {
        return notifCitations;
    }

    public void setNotifCitations(Boolean notifCitations) {
        this.notifCitations = notifCitations;
    }

    public Boolean getNotifProfileViews() {
        return notifProfileViews;
    }

    public void setNotifProfileViews(Boolean notifProfileViews) {
        this.notifProfileViews = notifProfileViews;
    }

    public Boolean getNotifNewPublications() {
        return notifNewPublications;
    }

    public void setNotifNewPublications(Boolean notifNewPublications) {
        this.notifNewPublications = notifNewPublications;
    }

    public Boolean getNotifNetworkUpdates() {
        return notifNetworkUpdates;
    }

    public void setNotifNetworkUpdates(Boolean notifNetworkUpdates) {
        this.notifNetworkUpdates = notifNetworkUpdates;
    }

    public Boolean getNotifNewFollowers() {
        return notifNewFollowers;
    }

    public void setNotifNewFollowers(Boolean notifNewFollowers) {
        this.notifNewFollowers = notifNewFollowers;
    }

    public Boolean getNotifMentions() {
        return notifMentions;
    }

    public void setNotifMentions(Boolean notifMentions) {
        this.notifMentions = notifMentions;
    }

    public String getEmailDigest() {
        return emailDigest;
    }

    public void setEmailDigest(String emailDigest) {
        this.emailDigest = emailDigest;
    }

    public Boolean getPushEnabled() {
        return pushEnabled;
    }

    public void setPushEnabled(Boolean pushEnabled) {
        this.pushEnabled = pushEnabled;
    }

    public Boolean getEmailMarketing() {
        return emailMarketing;
    }

    public void setEmailMarketing(Boolean emailMarketing) {
        this.emailMarketing = emailMarketing;
    }

    public Boolean getIsEmailVerified() {
        return isEmailVerified;
    }

    public void setIsEmailVerified(Boolean isEmailVerified) {
        this.isEmailVerified = isEmailVerified;
    }

    public String getPendingEmail() {
        return pendingEmail;
    }

    public void setPendingEmail(String pendingEmail) {
        this.pendingEmail = pendingEmail;
    }

    public Boolean getIsOrcidVerified() {
        return isOrcidVerified;
    }

    public void setIsOrcidVerified(Boolean isOrcidVerified) {
        this.isOrcidVerified = isOrcidVerified;
    }

    public Boolean getIsPubmedIdValid() {
        return isPubmedIdValid;
    }

    public void setIsPubmedIdValid(Boolean isPubmedIdValid) {
        this.isPubmedIdValid = isPubmedIdValid;
    }

    // New Getters and Setters
    public Boolean getNotifCitationInApp() {
        return notifCitationInApp;
    }

    public void setNotifCitationInApp(Boolean notifCitationInApp) {
        this.notifCitationInApp = notifCitationInApp;
    }

    public Boolean getNotifCitationEmail() {
        return notifCitationEmail;
    }

    public void setNotifCitationEmail(Boolean notifCitationEmail) {
        this.notifCitationEmail = notifCitationEmail;
    }

    public Boolean getNotifPublicationInApp() {
        return notifPublicationInApp;
    }

    public void setNotifPublicationInApp(Boolean notifPublicationInApp) {
        this.notifPublicationInApp = notifPublicationInApp;
    }

    public Boolean getNotifPublicationEmail() {
        return notifPublicationEmail;
    }

    public void setNotifPublicationEmail(Boolean notifPublicationEmail) {
        this.notifPublicationEmail = notifPublicationEmail;
    }

    public Boolean getNotifRecommendationInApp() {
        return notifRecommendationInApp;
    }

    public void setNotifRecommendationInApp(Boolean notifRecommendationInApp) {
        this.notifRecommendationInApp = notifRecommendationInApp;
    }

    public Boolean getNotifRecommendationEmail() {
        return notifRecommendationEmail;
    }

    public void setNotifRecommendationEmail(Boolean notifRecommendationEmail) {
        this.notifRecommendationEmail = notifRecommendationEmail;
    }

    public Boolean getNotifFollowerInApp() {
        return notifFollowerInApp;
    }

    public void setNotifFollowerInApp(Boolean notifFollowerInApp) {
        this.notifFollowerInApp = notifFollowerInApp;
    }

    public Boolean getNotifFollowerEmail() {
        return notifFollowerEmail;
    }

    public void setNotifFollowerEmail(Boolean notifFollowerEmail) {
        this.notifFollowerEmail = notifFollowerEmail;
    }

    public Boolean getNotifMentionInApp() {
        return notifMentionInApp;
    }

    public void setNotifMentionInApp(Boolean notifMentionInApp) {
        this.notifMentionInApp = notifMentionInApp;
    }

    public Boolean getNotifMentionEmail() {
        return notifMentionEmail;
    }

    public void setNotifMentionEmail(Boolean notifMentionEmail) {
        this.notifMentionEmail = notifMentionEmail;
    }

    public Boolean getNotifProfileViewInApp() {
        return notifProfileViewInApp;
    }

    public void setNotifProfileViewInApp(Boolean notifProfileViewInApp) {
        this.notifProfileViewInApp = notifProfileViewInApp;
    }

    public Boolean getNotifProfileViewEmail() {
        return notifProfileViewEmail;
    }

    public void setNotifProfileViewEmail(Boolean notifProfileViewEmail) {
        this.notifProfileViewEmail = notifProfileViewEmail;
    }

    public Boolean getNotifSecurityEmail() {
        return notifSecurityEmail;
    }

    public void setNotifSecurityEmail(Boolean notifSecurityEmail) {
        this.notifSecurityEmail = notifSecurityEmail;
    }

    public Boolean getNotifSystemEmail() {
        return notifSystemEmail;
    }

    public void setNotifSystemEmail(Boolean notifSystemEmail) {
        this.notifSystemEmail = notifSystemEmail;
    }
}
