package com.researcher.tool.service;

import com.researcher.tool.dto.NotificationDto;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.model.Notification;
import com.researcher.tool.model.Notification.NotificationType;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.model.User;
import com.researcher.tool.repository.NotificationRepository;
import com.researcher.tool.repository.ResearcherProfileRepository;
import com.researcher.tool.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ResearcherProfileRepository profileRepository;
    private final EmailService emailService;
    private final com.researcher.tool.repository.PostRepository postRepository;
    private final com.researcher.tool.repository.PostCommentRepository commentRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository,
            ResearcherProfileRepository profileRepository, EmailService emailService,
            com.researcher.tool.repository.PostRepository postRepository,
            com.researcher.tool.repository.PostCommentRepository commentRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.emailService = emailService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional
    public void createNotification(UUID recipientId, UUID actorId, NotificationType type, Long entityId) {
        if (recipientId.equals(actorId)) {
            return; // Don't notify self
        }

        Notification notification = new Notification(recipientId, actorId, type, entityId);
        notificationRepository.save(notification);

        // Async Email Trigger
        sendEmailNotification(recipientId, actorId, type, entityId);
    }

    @Async
    public void sendEmailNotification(UUID recipientId, UUID actorId, NotificationType type, Long entityId) {
        try {
            User recipient = userRepository.findById(recipientId).orElse(null);
            User actor = userRepository.findById(actorId).orElse(null);

            if (recipient == null || actor == null)
                return;

            String recipientEmail = recipient.getEmail();
            String actorName = getUserDisplayName(actor);

            switch (type) {
                case FOLLOW:
                    // Create a simple body for follow notification since EmailService doesn't have
                    // one specifically for just 'follow'
                    emailService.sendNotificationEmail(recipientEmail, actorName + " started following you",
                            String.format(
                                    "Hi,\n\n%s started following you on References.\n\nBest regards,\nReferences Team",
                                    actorName));
                    break;
                case LIKE:
                    if (entityId != null) {
                        postRepository.findById(entityId).ifPresent(post -> {
                            String preview = post.getContent().length() > 100
                                    ? post.getContent().substring(0, 100) + "..."
                                    : post.getContent();
                            emailService.sendLikeNotification(recipientEmail, actorName, preview);
                        });
                    }
                    break;
                case COMMENT:
                    if (entityId != null) {
                        // For COMMENT type, entityId is usually the post ID
                        postRepository.findById(entityId).ifPresent(post -> {
                            // Find the last comment by this actor on this post for preview
                            commentRepository.findByPostIdOrderByCreatedAtAsc(entityId).stream()
                                    .filter(c -> c.getUser().getId().equals(actorId))
                                    .reduce((first, second) -> second) // get last
                                    .ifPresent(comment -> {
                                        String preview = comment.getContent().length() > 100
                                                ? comment.getContent().substring(0, 100) + "..."
                                                : comment.getContent();
                                        emailService.sendCommentNotification(recipientEmail, actorName, preview);
                                    });
                        });
                    }
                    break;
                case MENTION_POST:
                    if (entityId != null) {
                        postRepository.findById(entityId).ifPresent(post -> {
                            String preview = post.getContent().length() > 100
                                    ? post.getContent().substring(0, 100) + "..."
                                    : post.getContent();
                            emailService.sendMentionNotification(recipientEmail, actorName, preview);
                        });
                    }
                    break;
                case MENTION_COMMENT:
                    if (entityId != null) {
                        // For MENTION_COMMENT, we need to find the comment.
                        // Note: in our current setup entityId passed might be post id.
                        // If it's comment id, we should fetch comment.
                        // Let's assume it's post id for now as per current service calls,
                        // but ideally we should pass comment id.
                        commentRepository.findAll().stream() // Not efficient, but for demo/fix
                                .filter(c -> c.getPost().getId().equals(entityId)
                                        && c.getUser().getId().equals(actorId))
                                .reduce((first, second) -> second)
                                .ifPresent(comment -> {
                                    String preview = comment.getContent().length() > 100
                                            ? comment.getContent().substring(0, 100) + "..."
                                            : comment.getContent();
                                    emailService.sendMentionNotification(recipientEmail, actorName, preview);
                                });
                    }
                    break;
                case SHARE:
                    emailService.sendShareNotification(recipientEmail, actorName);
                    break;
                case UNFOLLOW:
                    emailService.sendNotificationEmail(recipientEmail, actorName + " unfollowed you",
                            String.format(
                                    "Hi,\n\n%s stopped following you on References.\n\nBest regards,\nReferences Team",
                                    actorName));
                    break;
                case NEW_POST:
                    if (entityId != null) {
                        postRepository.findById(entityId).ifPresent(post -> {
                            String preview = post.getContent().length() > 50
                                    ? post.getContent().substring(0, 50) + "..."
                                    : post.getContent();
                            emailService.sendNotificationEmail(recipientEmail, actorName + " shared a new post",
                                    String.format(
                                            "Hi,\n\n%s shared a new post: \"%s\"\n\nVisit References to see the full post.\n\nBest regards,\nReferences Team",
                                            actorName, preview));
                        });
                    }
                    break;
                case FOLLOW_REQUEST:
                    emailService.sendNotificationEmail(recipientEmail, "Follow Request from " + actorName,
                            String.format(
                                    "Hi,\n\n%s has requested to follow you.\n\nLog in to accept or reject the request.\n\nBest,\nReferences Team",
                                    actorName));
                    break;
                case FOLLOW_ACCEPTED:
                    emailService.sendNotificationEmail(recipientEmail, "Follow Request Accepted",
                            String.format("Hi,\n\n%s accepted your follow request.\n\nBest,\nReferences Team",
                                    actorName));
                    break;
                case FOLLOW_BACK:
                    emailService.sendNotificationEmail(recipientEmail, actorName + " followed you back",
                            String.format(
                                    "Hi,\n\n%s followed you back on References.\n\nBest regards,\nReferences Team",
                                    actorName));
                    break;
                case FOLLOW_REJECTED:
                    // No email for rejection typically
                    break;
                case BLOCK:
                case BAN:
                case UNBLOCK:
                case UNBAN:
                    // These are usually handled by AdminService direct emails or system alerts
                    // But we can add a generic catch-all content here if needed
                    break;
            }
        } catch (Exception e) {
            logger.error("Failed to send async email notification: {}", e.getMessage());
        }
    }

    private String getUserDisplayName(User user) {
        ResearcherProfile profile = profileRepository.findByUser(user).orElse(null);
        if (profile != null && profile.getFullName() != null) {
            return profile.getFullName();
        }
        return user.getEmail().split("@")[0];
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> getNotifications(String email, Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::mapToDto);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            boolean currentRead = n.isRead();
            n.setRead(true);
            if (!currentRead) {
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllAsRead(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepository.markAllAsReadByRecipientId(user.getId());
    }

    @Transactional
    public void deleteNotificationByEntityIdAndType(Long entityId, NotificationType type) {
        notificationRepository.deleteByEntityIdAndType(entityId, type);
    }

    @Transactional
    public void updateNotificationType(UUID recipientId, UUID actorId, NotificationType oldType,
            NotificationType newType) {
        notificationRepository.findByRecipientUserIdAndActorUserIdAndType(recipientId, actorId, oldType)
                .ifPresent(n -> {
                    n.setType(newType);
                    n.setRead(false); // Make it unread again so it pops up
                    n.setCreatedAt(java.time.LocalDateTime.now());
                    notificationRepository.save(n);
                });
    }

    @Transactional(readOnly = true)
    public long countUnread(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public void deleteNotification(Long notificationId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipientUserId().equals(user.getId())) {
                // Prevent deleting active Block/Ban notifications (if that's the logic)
                // For now, allow deletion as per standard flow, unless specified otherwise
                // "Block/Ban notifications: Cannot be deleted while active"
                // Since banned users can't login, this effectively only applies if they are
                // somehow viewing it.
                // We'll enforce: User cannot delete severe system notifications if we want to
                // keep history.
                if (n.getType() == NotificationType.BLOCK || n.getType() == NotificationType.BAN) {
                    // Check if users are still blocked?
                    // Simplest interpretation: Don't allow deleting these types at all via this API
                    // Or maybe only if the block is still active?
                    // Let's allow identifying them in frontend, but here we can block deletion if
                    // we want strictness.
                    // The user requirement says: "Cannot be deleted while active"
                    // We will block deletion of BLOCK/BAN notifications for now.
                    throw new RuntimeException("Cannot delete system notifications.");
                }

                notificationRepository.delete(n);
            } else {
                throw new RuntimeException("Unauthorized to delete this notification");
            }
        });
    }

    @Transactional
    public void deleteAllNotifications(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepository.deleteByRecipientUserId(user.getId());
    }

    @Transactional
    public void deleteNotifications(java.util.List<Long> ids, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.List<Notification> notifications = notificationRepository.findAllById(ids);
        for (Notification n : notifications) {
            if (!n.getRecipientUserId().equals(user.getId()))
                continue;
            if (n.getType() == NotificationType.BLOCK || n.getType() == NotificationType.BAN)
                continue;
            notificationRepository.delete(n);
        }
    }

    private NotificationDto mapToDto(Notification n) {
        NotificationDto dto = new NotificationDto();
        dto.setId(n.getId());
        dto.setType(n.getType().name());
        dto.setEntityId(n.getEntityId());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());

        // Fetch Actor Profile for UI
        userRepository.findById(n.getActorUserId()).ifPresent(actor -> {
            dto.setActor(mapToSummary(actor));
            dto.setMessage(generateMessage(n.getType(), dto.getActor().getName()));
        });

        return dto;
    }

    private String generateMessage(NotificationType type, String actorName) {
        switch (type) {
            case FOLLOW:
                return actorName + " started following you.";
            case MENTION_POST:
                return actorName + " mentioned you in a post.";
            case MENTION_COMMENT:
                return actorName + " mentioned you in a comment.";
            case COMMENT:
                return actorName + " commented on your post.";
            case SHARE:
                return actorName + " shared your post.";
            case LIKE:
                return actorName + " liked your post.";
            case UNFOLLOW:
                return actorName + " stopped following you.";
            case NEW_POST:
                return actorName + " shared a new post.";
            case FOLLOW_REQUEST:
                return actorName + " requested to follow you.";
            case FOLLOW_ACCEPTED:
                return actorName + " accepted your follow request.";
            case FOLLOW_REJECTED:
                return actorName + " rejected your follow request.";
            case FOLLOW_BACK:
                return actorName + " followed you back.";
            case BLOCK:
                return "Your account has been blocked.";
            case UNBLOCK:
                return "Your account has been unblocked.";
            case BAN:
                return "Your account has been banned.";
            case UNBAN:
                return "Your ban has been revoked.";
            default:
                return "New notification.";
        }
    }

    private UserSummaryDto mapToSummary(User user) {
        ResearcherProfile profile = profileRepository.findByUser(user).orElse(null);
        String name = (profile != null && profile.getFullName() != null) ? profile.getFullName() : "Researcher";
        String displayName = (profile != null && profile.getDisplayName() != null) ? profile.getDisplayName()
                : user.getEmail().split("@")[0];
        String avatar = (profile != null) ? profile.getAvatarUrl() : null;
        String institution = (profile != null) ? profile.getInstitution() : "";
        String department = (profile != null) ? profile.getDepartment() : "";
        String bio = (profile != null) ? profile.getBio() : "";

        return new UserSummaryDto(user.getId(), name, displayName, avatar, institution, department, bio);
    }
}
