package com.researcher.tool.dto;

import com.researcher.tool.model.AccountStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public class AdminUserDto {
    private UUID id;
    private String email;
    private AccountStatus status;
    private Boolean profileCompleted;
    private LocalDateTime createdAt;
    private LocalDateTime blockedUntil;
    private ProfileSummary profile;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public Boolean getProfileCompleted() {
        return profileCompleted;
    }

    public void setProfileCompleted(Boolean profileCompleted) {
        this.profileCompleted = profileCompleted;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getBlockedUntil() {
        return blockedUntil;
    }

    public void setBlockedUntil(LocalDateTime blockedUntil) {
        this.blockedUntil = blockedUntil;
    }

    public ProfileSummary getProfile() {
        return profile;
    }

    public void setProfile(ProfileSummary profile) {
        this.profile = profile;
    }

    public static class ProfileSummary {
        private String name;
        private String institution;
        private String displayName;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getInstitution() {
            return institution;
        }

        public void setInstitution(String institution) {
            this.institution = institution;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }
    }
}
