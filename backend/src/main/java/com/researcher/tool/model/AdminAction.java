package com.researcher.tool.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "admin_actions")
public class AdminAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "admin_username", nullable = false)
    private String adminUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private AdminActionType actionType;

    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "block_duration_days")
    private Integer blockDurationDays;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "success")
    private Boolean success = true;

    public AdminAction() {
    }

    public AdminAction(String adminUsername, AdminActionType actionType, UUID targetUserId, String reason,
            Integer blockDurationDays, Boolean success) {
        this.adminUsername = adminUsername;
        this.actionType = actionType;
        this.targetUserId = targetUserId;
        this.reason = reason;
        this.blockDurationDays = blockDurationDays;
        this.success = success;
        this.createdAt = LocalDateTime.now();
    }

    public AdminAction(String adminUsername, AdminActionType actionType, UUID targetUserId, String reason,
            Integer blockDurationDays) {
        this(adminUsername, actionType, targetUserId, reason, blockDurationDays, true);
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public String getAdminUsername() {
        return adminUsername;
    }

    public AdminActionType getActionType() {
        return actionType;
    }

    public UUID getTargetUserId() {
        return targetUserId;
    }

    public String getReason() {
        return reason;
    }

    public Integer getBlockDurationDays() {
        return blockDurationDays;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }
}
