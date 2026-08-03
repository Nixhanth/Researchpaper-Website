package com.researcher.tool.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ProfileCompletionUserDto {
    private UUID id;
    private String email;
    private String name;
    private String institution;
    private String role;
    private int completionPercentage;
    private List<String> missingFields;
    private LocalDateTime createdAt;
    private LocalDateTime lastEmailSentAt;
    private LocalDateTime lastLoginAt;

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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public int getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(int completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public List<String> getMissingFields() {
        return missingFields;
    }

    public void setMissingFields(List<String> missingFields) {
        this.missingFields = missingFields;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastEmailSentAt() {
        return lastEmailSentAt;
    }

    public void setLastEmailSentAt(LocalDateTime lastEmailSentAt) {
        this.lastEmailSentAt = lastEmailSentAt;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
