package com.researcher.tool.dto;

import java.util.UUID;

public class UserSummaryDto {
    private UUID id;
    private String name;
    private String displayName;
    private String avatarUrl;
    private String institution;
    private String department;
    private String bio;
    private String country;
    private String gender;
    private java.util.List<String> interests;

    public UserSummaryDto() {
    }

    public UserSummaryDto(UUID id, String name, String displayName, String avatarUrl, String institution,
            String department, String bio, String country, String gender, java.util.List<String> interests) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.institution = institution;
        this.department = department;
        this.bio = bio;
        this.country = country;
        this.gender = gender;
        this.interests = interests;
    }

    public UserSummaryDto(UUID id, String name, String displayName, String avatarUrl, String institution,
            String department, String bio) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.institution = institution;
        this.department = department;
        this.bio = bio;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
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

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getInstitution() {
        return institution;
    }

    public void setInstitution(String institution) {
        this.institution = institution;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public java.util.List<String> getInterests() {
        return interests;
    }

    public void setInterests(java.util.List<String> interests) {
        this.interests = interests;
    }
}
