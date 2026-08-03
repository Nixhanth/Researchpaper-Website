package com.researcher.tool.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "admin_sessions")
public class AdminSession {

    public AdminSession() {
    }

    public AdminSession(UUID id, String adminUsername, String tokenSignature, String ipAddress, String deviceInfo,
            String browser, LocalDateTime createdAt, LocalDateTime lastActiveAt, LocalDateTime expiresAt,
            boolean isValid) {
        this.id = id;
        this.adminUsername = adminUsername;
        this.tokenSignature = tokenSignature;
        this.ipAddress = ipAddress;
        this.deviceInfo = deviceInfo;
        this.browser = browser;
        this.createdAt = createdAt;
        this.lastActiveAt = lastActiveAt;
        this.expiresAt = expiresAt;
        this.isValid = isValid;
    }

    @Id
    private UUID id;

    @Column(nullable = false)
    private String adminUsername;

    @Column(nullable = false, length = 1000) // JWTs can be long
    private String tokenSignature; // Storing the last part of token or hash for verification

    private String ipAddress;
    private String deviceInfo;
    private String browser;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime lastActiveAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private boolean isValid;

    // Manual Lombok Implementation to fix compilation errors
    public static AdminSessionBuilder builder() {
        return new AdminSessionBuilder();
    }

    public boolean isValid() {
        return isValid;
    }

    public void setValid(boolean valid) {
        isValid = valid;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getLastActiveAt() {
        return lastActiveAt;
    }

    public void setLastActiveAt(LocalDateTime lastActiveAt) {
        this.lastActiveAt = lastActiveAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAdminUsername() {
        return adminUsername;
    }

    public void setAdminUsername(String adminUsername) {
        this.adminUsername = adminUsername;
    }

    public String getTokenSignature() {
        return tokenSignature;
    }

    public void setTokenSignature(String tokenSignature) {
        this.tokenSignature = tokenSignature;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public String getBrowser() {
        return browser;
    }

    public void setBrowser(String browser) {
        this.browser = browser;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static class AdminSessionBuilder {
        private UUID id;
        private String adminUsername;
        private String tokenSignature;
        private String ipAddress;
        private String deviceInfo;
        private String browser;
        private LocalDateTime createdAt;
        private LocalDateTime lastActiveAt;
        private LocalDateTime expiresAt;
        private boolean isValid;

        AdminSessionBuilder() {
        }

        public AdminSessionBuilder id(UUID id) {
            this.id = id;
            return this;
        }

        public AdminSessionBuilder adminUsername(String adminUsername) {
            this.adminUsername = adminUsername;
            return this;
        }

        public AdminSessionBuilder tokenSignature(String tokenSignature) {
            this.tokenSignature = tokenSignature;
            return this;
        }

        public AdminSessionBuilder ipAddress(String ipAddress) {
            this.ipAddress = ipAddress;
            return this;
        }

        public AdminSessionBuilder deviceInfo(String deviceInfo) {
            this.deviceInfo = deviceInfo;
            return this;
        }

        public AdminSessionBuilder browser(String browser) {
            this.browser = browser;
            return this;
        }

        public AdminSessionBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public AdminSessionBuilder lastActiveAt(LocalDateTime lastActiveAt) {
            this.lastActiveAt = lastActiveAt;
            return this;
        }

        public AdminSessionBuilder expiresAt(LocalDateTime expiresAt) {
            this.expiresAt = expiresAt;
            return this;
        }

        public AdminSessionBuilder isValid(boolean isValid) {
            this.isValid = isValid;
            return this;
        }

        public AdminSession build() {
            return new AdminSession(id, adminUsername, tokenSignature, ipAddress, deviceInfo, browser, createdAt,
                    lastActiveAt, expiresAt, isValid);
        }

        public String toString() {
            return "AdminSession.AdminSessionBuilder(id=" + this.id + ", adminUsername=" + this.adminUsername
                    + ", tokenSignature=" + this.tokenSignature + ", ipAddress=" + this.ipAddress + ", deviceInfo="
                    + this.deviceInfo + ", browser=" + this.browser + ", createdAt=" + this.createdAt
                    + ", lastActiveAt="
                    + this.lastActiveAt + ", expiresAt=" + this.expiresAt + ", isValid=" + this.isValid + ")";
        }
    }
}
