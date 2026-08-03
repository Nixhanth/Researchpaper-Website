package com.researcher.tool.dto;

import java.util.List;

public class UserDetailDto {
    private String displayName;
    private String fullName;
    private String bio;
    private String avatarUrl;
    private String country;
    private String institution;
    private String role;
    private String department;
    private List<String> researchInterests;
    private Integer followers;
    private Integer following;
    private Integer profileCompletion;
    private String contactEmail;
    private String orcid;
    private String linkedinUrl;
    private String scholarUrl;
    private String lastActive;

    // New fields for extended visibility
    private String currentTitle;
    private String personalWebsite;
    private String pubmedAuthorId;
    private String gender;
    private Boolean isPublic;
    private Boolean emailDiscovery;
    private List<ArticleSummaryDto> publications;
    private List<UserSummaryDto> followersList;
    private List<UserSummaryDto> followingList;
    private AdminStatsDto adminStats;

    public UserDetailDto() {
    }

    // Existing Getters and Setters
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

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
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

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public List<String> getResearchInterests() {
        return researchInterests;
    }

    public void setResearchInterests(List<String> researchInterests) {
        this.researchInterests = researchInterests;
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

    public Integer getProfileCompletion() {
        return profileCompletion;
    }

    public void setProfileCompletion(Integer profileCompletion) {
        this.profileCompletion = profileCompletion;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getOrcid() {
        return orcid;
    }

    public void setOrcid(String orcid) {
        this.orcid = orcid;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getScholarUrl() {
        return scholarUrl;
    }

    public void setScholarUrl(String scholarUrl) {
        this.scholarUrl = scholarUrl;
    }

    public String getLastActive() {
        return lastActive;
    }

    public void setLastActive(String lastActive) {
        this.lastActive = lastActive;
    }

    // New Getters and Setters
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

    public String getPubmedAuthorId() {
        return pubmedAuthorId;
    }

    public void setPubmedAuthorId(String pubmedAuthorId) {
        this.pubmedAuthorId = pubmedAuthorId;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
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

    public List<ArticleSummaryDto> getPublications() {
        return publications;
    }

    public void setPublications(List<ArticleSummaryDto> publications) {
        this.publications = publications;
    }

    public List<UserSummaryDto> getFollowersList() {
        return followersList;
    }

    public void setFollowersList(List<UserSummaryDto> followersList) {
        this.followersList = followersList;
    }

    public List<UserSummaryDto> getFollowingList() {
        return followingList;
    }

    public void setFollowingList(List<UserSummaryDto> followingList) {
        this.followingList = followingList;
    }

    public AdminStatsDto getAdminStats() {
        return adminStats;
    }

    public void setAdminStats(AdminStatsDto adminStats) {
        this.adminStats = adminStats;
    }

    // Inner DTOs
    public static class ArticleSummaryDto {
        private Long id;
        private String title;
        private String journal;
        private String year;

        public ArticleSummaryDto() {
        }

        public ArticleSummaryDto(Long id, String title, String journal, String year) {
            this.id = id;
            this.title = title;
            this.journal = journal;
            this.year = year;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getJournal() {
            return journal;
        }

        public void setJournal(String journal) {
            this.journal = journal;
        }

        public String getYear() {
            return year;
        }

        public void setYear(String year) {
            this.year = year;
        }
    }

    public static class UserSummaryDto {
        private java.util.UUID id;
        private String name;
        private String displayName;
        private String institution;
        private String role;
        private String avatarUrl;

        public UserSummaryDto() {
        }

        public UserSummaryDto(java.util.UUID id, String name, String displayName, String institution, String role,
                String avatarUrl) {
            this.id = id;
            this.name = name;
            this.displayName = displayName;
            this.institution = institution;
            this.role = role;
            this.avatarUrl = avatarUrl;
        }

        public java.util.UUID getId() {
            return id;
        }

        public void setId(java.util.UUID id) {
            this.id = id;
        }

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

        public String getAvatarUrl() {
            return avatarUrl;
        }

        public void setAvatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }
    }

    public static class AdminStatsDto {
        private long totalActions;
        private long warningsCount;
        private String lastAction;
        private String accountStatus;

        public AdminStatsDto() {
        }

        public long getTotalActions() {
            return totalActions;
        }

        public void setTotalActions(long totalActions) {
            this.totalActions = totalActions;
        }

        public long getWarningsCount() {
            return warningsCount;
        }

        public void setWarningsCount(long warningsCount) {
            this.warningsCount = warningsCount;
        }

        public String getLastAction() {
            return lastAction;
        }

        public void setLastAction(String lastAction) {
            this.lastAction = lastAction;
        }

        public String getAccountStatus() {
            return accountStatus;
        }

        public void setAccountStatus(String accountStatus) {
            this.accountStatus = accountStatus;
        }
    }
}
