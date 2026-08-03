package com.researcher.tool.dto;

import com.researcher.tool.model.AuthProvider;
import java.util.UUID;
import java.util.List;

public class UserInfoDto {
    private UUID id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private AuthProvider authProvider;
    private Boolean profileCompleted;
    private Integer onboardingStep;
    private List<String> roles;
    private Boolean hasPassword;
    private String displayName;
    private Integer profileCompletion;
    private java.util.Map<String, String> verificationStatus;

    public UserInfoDto() {
    }

    public UserInfoDto(UUID id, String email, String fullName, String avatarUrl, AuthProvider authProvider,
            Boolean profileCompleted, Integer onboardingStep, List<String> roles, Boolean hasPassword,
            String displayName, Integer profileCompletion, java.util.Map<String, String> verificationStatus) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.authProvider = authProvider;
        this.profileCompleted = profileCompleted;
        this.onboardingStep = onboardingStep;
        this.roles = roles;
        this.hasPassword = hasPassword;
        this.displayName = displayName;
        this.profileCompletion = profileCompletion;
        this.verificationStatus = verificationStatus;
    }

    // Getters and Setters
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

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(AuthProvider authProvider) {
        this.authProvider = authProvider;
    }

    public Boolean getProfileCompleted() {
        return profileCompleted;
    }

    public void setProfileCompleted(Boolean profileCompleted) {
        this.profileCompleted = profileCompleted;
    }

    public Integer getOnboardingStep() {
        return onboardingStep;
    }

    public void setOnboardingStep(Integer onboardingStep) {
        this.onboardingStep = onboardingStep;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public Boolean getHasPassword() {
        return hasPassword;
    }

    public void setHasPassword(Boolean hasPassword) {
        this.hasPassword = hasPassword;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Integer getProfileCompletion() {
        return profileCompletion;
    }

    public void setProfileCompletion(Integer profileCompletion) {
        this.profileCompletion = profileCompletion;
    }

    public java.util.Map<String, String> getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(java.util.Map<String, String> verificationStatus) {
        this.verificationStatus = verificationStatus;
    }
}
