package com.researcher.tool.controller;

import com.researcher.tool.dto.FollowStatsDto;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.service.FollowService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class FollowController {

    private final FollowService followService;

    public FollowController(FollowService followService) {
        this.followService = followService;
    }

    @PostMapping("/follow/{userId}")
    public ResponseEntity<Map<String, String>> followUser(@PathVariable UUID userId) {
        String email = getAuthenticatedEmail();
        String status = followService.followUser(email, userId);
        Map<String, String> response = new HashMap<>();
        response.put("status", status);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/follow/cancel/{userId}")
    public ResponseEntity<?> cancelFollowRequest(@PathVariable UUID userId) {
        String email = getAuthenticatedEmail();
        followService.cancelFollowRequest(email, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/follow/request/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long requestId) {
        String email = getAuthenticatedEmail();
        followService.acceptFollowRequest(email, requestId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/follow/request/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId) {
        String email = getAuthenticatedEmail();
        followService.rejectFollowRequest(email, requestId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/unfollow/{userId}")
    public ResponseEntity<?> unfollowUser(@PathVariable @org.springframework.lang.NonNull UUID userId) {
        String email = getAuthenticatedEmail();
        followService.unfollowUser(email, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/follower/{userId}")
    public ResponseEntity<?> removeFollower(@PathVariable UUID userId) {
        String email = getAuthenticatedEmail();
        followService.removeFollower(email, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/followers")
    public ResponseEntity<List<UserSummaryDto>> getFollowers(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    @GetMapping("/users/{userId}/following")
    public ResponseEntity<List<UserSummaryDto>> getFollowing(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    @GetMapping("/users/{userId}/sent-requests")
    public ResponseEntity<List<UserSummaryDto>> getSentRequests(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getSentRequests(userId));
    }

    @GetMapping("/users/{userId}/follow-stats")
    public ResponseEntity<FollowStatsDto> getStats(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getStats(userId));
    }

    // New Endpoint for UI State
    @GetMapping("/users/{userId}/relationship")
    public ResponseEntity<Map<String, String>> getRelationshipStatus(@PathVariable UUID userId) {
        String email = getAuthenticatedEmail();
        String status = followService.getRelationshipStatus(email, userId);
        Map<String, String> response = new HashMap<>();
        response.put("status", status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{userId}/is-following")
    public ResponseEntity<Map<String, Boolean>> isFollowing(@PathVariable UUID userId) {
        String email = getAuthenticatedEmail();
        boolean isFollowing = followService.isFollowing(email, userId);
        Map<String, Boolean> response = new HashMap<>();
        response.put("isFollowing", isFollowing);
        return ResponseEntity.ok(response);
    }

    private String getAuthenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new RuntimeException("User not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User) {
            return ((OAuth2User) principal).getAttribute("email");
        } else if (principal instanceof String) {
            return (String) principal;
        }
        throw new RuntimeException("User not authenticated");
    }
}
