package com.researcher.tool.dto;

import java.util.List;
import java.util.Map;

public class ProfileDto {
    private String userId;
    private String name;
    private String displayName;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    private String country;
    private String title; // Current Title / Position
    private String institution;
    private String role;
    private String department;
    private String gender;
    private String bio;
    private List<String> interests;
    private Map<String, String> socialLinks;
    private Map<String, Integer> stats;
    private Map<String, String> verificationStatus;
    private String avatarUrl;
    private Integer profileCompletion;

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public List<String> getInterests() {
        return interests;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }

    public Map<String, String> getSocialLinks() {
        return socialLinks;
    }

    public void setSocialLinks(Map<String, String> socialLinks) {
        this.socialLinks = socialLinks;
    }

    public Map<String, Integer> getStats() {
        return stats;
    }

    public void setStats(Map<String, Integer> stats) {
        this.stats = stats;
    }

    public Map<String, String> getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(Map<String, String> verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Integer getProfileCompletion() {
        return profileCompletion;
    }

    public void setProfileCompletion(Integer profileCompletion) {
        this.profileCompletion = profileCompletion;
    }

    private String pubmedAuthorId;
    private java.time.LocalDateTime pubmedLastSync;
    private Boolean isPublic;
    private Boolean emailDiscovery;

    // Notification Preferences
    private Boolean notifCitations;
    private Boolean notifProfileViews;
    private Boolean notifNewPublications;
    private Boolean notifNetworkUpdates;
    private Boolean notifNewFollowers;
    private Boolean notifMentions;
    private String emailDigest;
    private Boolean pushEnabled;
    private Boolean emailMarketing;

    // Granular Notification Controls (New)
    private Boolean notifCitationInApp;
    private Boolean notifCitationEmail;
    private Boolean notifPublicationInApp;
    private Boolean notifPublicationEmail;
    private Boolean notifRecommendationInApp;
    private Boolean notifRecommendationEmail;

    private Boolean notifFollowerInApp;
    private Boolean notifFollowerEmail;
    private Boolean notifMentionInApp;
    private Boolean notifMentionEmail;
    private Boolean notifProfileViewInApp;
    private Boolean notifProfileViewEmail;

    private Boolean notifSecurityEmail;
    private Boolean notifSystemEmail;

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

    // New Notification Getters and Setters
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
