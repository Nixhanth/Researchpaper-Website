package com.researcher.tool.repository;

import com.researcher.tool.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);

    long countByRecipientUserIdAndIsReadFalse(UUID recipientUserId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipientUserId = :recipientUserId")
    void markAllAsReadByRecipientId(UUID recipientUserId);

    void deleteByEntityIdAndType(Long entityId, Notification.NotificationType type);

    java.util.Optional<Notification> findByRecipientUserIdAndActorUserIdAndType(UUID recipientUserId, UUID actorUserId,
            Notification.NotificationType type);

    // New methods for cleanup
    @Transactional
    void deleteByRecipientUserId(UUID recipientUserId);
}
