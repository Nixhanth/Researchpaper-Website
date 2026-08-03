package com.researcher.tool.dto;

import com.researcher.tool.model.AuthProvider;
import java.util.UUID;

public class AuthResponse {
    private String token;
    private UUID id;
    private String email;
    private String fullName;
    private AuthProvider authProvider;
    private String avatarUrl;
    private Boolean profileCompleted;
    private Integer onboardingStep;
    private Boolean hasPassword;

    private Integer profileCompletion;
    private java.util.Map<String, String> verificationStatus;

    public AuthResponse() {
    }

    public AuthResponse(String token, java.util.UUID id, String email, String fullName, AuthProvider authProvider,
            String avatarUrl, Boolean profileCompleted, Integer onboardingStep, Boolean hasPassword,
            Integer profileCompletion, java.util.Map<String, String> verificationStatus) {
        this.token = token;
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.authProvider = authProvider;
        this.avatarUrl = avatarUrl;
        this.profileCompleted = profileCompleted;
        this.onboardingStep = onboardingStep;
        this.hasPassword = hasPassword;
        this.profileCompletion = profileCompletion;
        this.verificationStatus = verificationStatus;
    }

    public Boolean getHasPassword() {
        return hasPassword;
    }

    public void setHasPassword(Boolean hasPassword) {
        this.hasPassword = hasPassword;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

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

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(AuthProvider authProvider) {
        this.authProvider = authProvider;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
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
