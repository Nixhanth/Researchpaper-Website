package com.researcher.tool.controller;

import com.researcher.tool.dto.CreatePostDto;
import com.researcher.tool.dto.PostDto;
import com.researcher.tool.dto.CommentDto;
import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.service.PostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping("/posts")
    public ResponseEntity<PostDto> createPost(@RequestBody CreatePostDto createPostDto) {
        String email = getAuthenticatedEmail();
        return ResponseEntity.ok(postService.createPost(email, createPostDto.getContent()));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId) {
        String email = getAuthenticatedEmail();
        postService.deletePost(email, postId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<PostDto> getPost(@PathVariable Long postId) {
        String email = null;
        try {
            email = getAuthenticatedEmail();
        } catch (Exception e) {
            // allows public read if auth fails or not present (simple toggle)
        }
        return ResponseEntity.ok(postService.getPost(email, postId));
    }

    @GetMapping("/feed")
    public ResponseEntity<PageResponse<PostDto>> getFeed(
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "25") int limit) {
        String email = getAuthenticatedEmail();

        // Enforce max 25 posts per batch (Instagram/LinkedIn style)
        int batchSize = Math.min(limit, 25);

        return ResponseEntity.ok(postService.getFeedWithCursor(email, cursor, batchSize));
    }

    @GetMapping("/users/{userId}/posts")
    public ResponseEntity<PageResponse<PostDto>> getUserPosts(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String email = null;
        try {
            email = getAuthenticatedEmail();
        } catch (Exception e) {
        }
        return ResponseEntity.ok(postService.getUserPosts(email, userId, page, size));
    }

    // Comments
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentDto> addComment(@PathVariable Long postId, @RequestBody Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        String content = payload.get("content");
        return ResponseEntity.ok(postService.addComment(email, postId, content));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentDto>> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(postService.getComments(postId));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentDto> updateComment(@PathVariable Long commentId,
            @RequestBody Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        String content = payload.get("content");
        return ResponseEntity.ok(postService.updateComment(email, commentId, content));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        String email = getAuthenticatedEmail();
        postService.deleteComment(email, commentId);
        return ResponseEntity.ok().build();
    }

    // Shares
    @PostMapping("/posts/{postId}/share")
    public ResponseEntity<Void> sharePost(@PathVariable Long postId) {
        String email = getAuthenticatedEmail();
        postService.sharePost(email, postId);
        return ResponseEntity.ok().build();
    }

    // Likes
    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Void> likePost(@PathVariable Long postId) {
        String email = getAuthenticatedEmail();
        postService.likePost(email, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/posts/{postId}/like")
    public ResponseEntity<Void> unlikePost(@PathVariable Long postId) {
        String email = getAuthenticatedEmail();
        postService.unlikePost(email, postId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/posts/{postId}/likes/count")
    public ResponseEntity<Map<String, Object>> getLikeCount(@PathVariable Long postId) {
        long count = postService.getLikeCount(postId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/posts/{postId}/likes/me")
    public ResponseEntity<Map<String, Object>> checkIfLiked(@PathVariable Long postId) {
        String email = getAuthenticatedEmail();
        boolean isLiked = postService.isPostLikedByUser(email, postId);
        return ResponseEntity.ok(Map.of("isLiked", isLiked));
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
            String email = (String) principal;
            if ("anonymousUser".equals(email))
                throw new RuntimeException("User not authenticated");
            return email;
        }
        throw new RuntimeException("User not authenticated");
    }
}
