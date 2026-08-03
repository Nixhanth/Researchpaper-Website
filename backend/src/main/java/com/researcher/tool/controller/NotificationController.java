package com.researcher.tool.controller;

import com.researcher.tool.dto.NotificationDto;
import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<NotificationDto>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        return ResponseEntity.ok(new PageResponse<>(
                notificationService.getNotifications(getEmail(authentication), PageRequest.of(page, size))));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        notificationService.markAllAsRead(getEmail(authentication));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id, Authentication authentication) {
        notificationService.deleteNotification(id, getEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAllNotifications(Authentication authentication) {
        notificationService.deleteAllNotifications(getEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<java.util.Map<String, Long>> getUnreadCount(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.ok(java.util.Collections.singletonMap("count", 0L));
            }
            Long count = notificationService.countUnread(getEmail(authentication));
            return ResponseEntity.ok(java.util.Collections.singletonMap("count", count));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.singletonMap("count", 0L));
        }
    }

    @PostMapping("/delete-batch")
    public ResponseEntity<Void> deleteNotifications(@RequestBody java.util.List<Long> ids,
            Authentication authentication) {
        notificationService.deleteNotifications(ids, getEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    private String getEmail(Authentication authentication) {
        if (authentication == null)
            throw new RuntimeException("Not authenticated");
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User) {
            return ((OAuth2User) principal).getAttribute("email");
        }
        return (String) principal;
    }
}
