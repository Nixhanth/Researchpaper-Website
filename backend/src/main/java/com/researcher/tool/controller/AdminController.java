package com.researcher.tool.controller;

import com.researcher.tool.dto.AdminUserDto;
import com.researcher.tool.dto.UserDetailDto;
import com.researcher.tool.dto.ProfileCompletionUserDto;
import com.researcher.tool.model.AdminAction;
import com.researcher.tool.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            String ipAddress = httpRequest.getRemoteAddr();
            String userAgent = httpRequest.getHeader("User-Agent");

            String token = adminService.login(
                    request.get("username"),
                    request.get("password"),
                    ipAddress,
                    userAgent);

            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserDto>> getUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) com.researcher.tool.model.AccountStatus status,
            @RequestParam(required = false) String role,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminService.searchUsers(query, status, role, pageable));
    }

    @GetMapping("/users/{userId}/detail")
    public ResponseEntity<UserDetailDto> getUserDetail(@PathVariable UUID userId) {
        try {
            UserDetailDto detail = adminService.getUserDetail(userId);
            return ResponseEntity.ok(detail);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{userId}/block")
    public ResponseEntity<?> blockUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> request) {
        int days = (int) request.getOrDefault("days", 7);
        String reason = (String) request.getOrDefault("reason", "");
        String key = (String) request.getOrDefault("key", "");
        adminService.blockUser(userId, days, reason, key);
        return ResponseEntity.ok(Map.of("success", true, "message", "User blocked successfully"));
    }

    @PostMapping("/users/{userId}/unblock")
    public ResponseEntity<?> unblockUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> request) {
        String reason = (String) request.getOrDefault("reason", "");
        String key = (String) request.getOrDefault("key", "");
        adminService.unblockUser(userId, reason, key);
        return ResponseEntity.ok(Map.of("success", true, "message", "User unblocked successfully"));
    }

    @PostMapping("/users/{userId}/ban")
    public ResponseEntity<?> banUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> request) {
        String reason = (String) request.getOrDefault("reason", "");
        String key = (String) request.getOrDefault("key", "");
        adminService.banUser(userId, reason, key);
        return ResponseEntity.ok(Map.of("success", true, "message", "User banned successfully"));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> request) {
        String reason = (String) request.getOrDefault("reason", "");
        String key = (String) request.getOrDefault("key", "");
        adminService.deleteUser(userId, reason, key);
        return ResponseEntity.ok(Map.of("success", true, "message", "User deleted successfully"));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AdminAction>> getAuditLogs(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminService.getAuditLogs(pageable));
    }

    @PostMapping("/users/{userId}/notify")
    public ResponseEntity<?> sendNotification(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request) {
        String type = request.get("type");
        String message = request.get("message");
        try {
            adminService.sendNotification(userId, type, message);
            return ResponseEntity.ok(Map.of("success", true, "message", "Notification sent"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/users/{userId}/email-reminder")
    public ResponseEntity<?> sendEmailReminder(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request) {
        String templateType = request.get("templateType");
        String customMessage = request.get("customMessage");
        try {
            adminService.sendEmailReminder(userId, templateType, customMessage);
            return ResponseEntity.ok(Map.of("success", true, "message", "Email reminder sent"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Profile Completion Alert Endpoints
    @GetMapping("/profile-completion/users")
    public ResponseEntity<Page<ProfileCompletionUserDto>> getUsersByProfileCompletion(
            @RequestParam(defaultValue = "0") int minCompletion,
            @RequestParam(defaultValue = "100") int maxCompletion,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "ACTIVE") String status,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity
                .ok(adminService.getUsersByProfileCompletion(minCompletion, maxCompletion, role, status, pageable));
    }

    @GetMapping("/profile-completion/stats")
    public ResponseEntity<Map<String, Object>> getProfileCompletionStats() {
        return ResponseEntity.ok(adminService.getProfileCompletionStats());
    }

    @PostMapping("/profile-completion/send-bulk-email")
    public ResponseEntity<Map<String, Object>> sendBulkProfileCompletionEmail(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> userIdStrings = (List<String>) request.get("userIds");
            List<UUID> userIds = userIdStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
            String subject = (String) request.get("subject");
            String body = (String) request.get("body");

            Map<String, Object> result = adminService.sendBulkProfileCompletionEmail(userIds, subject, body);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============ SESSION MANAGEMENT ENDPOINTS ============

    @GetMapping("/sessions")
    public ResponseEntity<?> getActiveSessions(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            return ResponseEntity.ok(adminService.getActiveSessions(token));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<?> invalidateSession(
            @PathVariable UUID sessionId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            adminService.invalidateSession(sessionId, token);
            return ResponseEntity.ok(Map.of("success", true, "message", "Session invalidated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/sessions/all-except-current")
    public ResponseEntity<?> invalidateAllOtherSessions(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            int count = adminService.invalidateAllOtherSessions(token);
            return ResponseEntity.ok(Map.of("success", true, "message", "Invalidated " + count + " sessions"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
