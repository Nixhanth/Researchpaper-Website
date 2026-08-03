package com.researcher.tool.service;

import com.researcher.tool.dto.PageResponse;
import com.researcher.tool.dto.PostDto;
import com.researcher.tool.dto.CommentDto;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.model.Post;
import com.researcher.tool.model.PostComment;
import com.researcher.tool.model.PostLike;
import com.researcher.tool.model.PostShare;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.model.User;
import com.researcher.tool.model.Notification.NotificationType;
import com.researcher.tool.repository.PostRepository;
import com.researcher.tool.repository.PostCommentRepository;
import com.researcher.tool.repository.PostLikeRepository;
import com.researcher.tool.repository.PostShareRepository;
import com.researcher.tool.repository.ResearcherProfileRepository;
import com.researcher.tool.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ResearcherProfileRepository profileRepository;
    private final com.researcher.tool.repository.MentionRepository mentionRepository;
    private final PostCommentRepository commentRepository;
    private final PostShareRepository shareRepository;
    private final PostLikeRepository likeRepository;
    private final NotificationService notificationService;

    private final FollowService followService;

    public PostService(PostRepository postRepository, UserRepository userRepository,
            ResearcherProfileRepository profileRepository,
            com.researcher.tool.repository.MentionRepository mentionRepository,
            PostCommentRepository commentRepository,
            PostShareRepository shareRepository,
            PostLikeRepository likeRepository,
            NotificationService notificationService,
            FollowService followService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.mentionRepository = mentionRepository;
        this.commentRepository = commentRepository;
        this.shareRepository = shareRepository;
        this.likeRepository = likeRepository;
        this.notificationService = notificationService;
        this.followService = followService;
    }

    @Transactional
    public PostDto createPost(String email, String content) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Post content cannot be empty");
        }

        if (content.length() > 2000) {
            throw new RuntimeException("Post content too long (max 2000 chars)");
        }

        Post post = new Post(user, content);
        Post savedPost = postRepository.save(post);

        // Handle Mentions: @username
        processMentions(content, savedPost, null, user);

        // Notify Followers
        try {
            Long postId = savedPost.getId();
            UUID actorId = user.getId();
            followService.getFollowers(actorId).forEach(follower -> {
                notificationService.createNotification(follower.getId(), actorId, NotificationType.NEW_POST, postId);
            });
        } catch (Exception e) {
            System.err.println("Failed to notify followers: " + e.getMessage());
        }

        return mapToDto(savedPost, user);
    }

    @Transactional(readOnly = true)
    public PostDto getPost(String email, Long postId) {
        User user = null;
        if (email != null) {
            user = userRepository.findByEmail(email).orElse(null);
        }

        if (postId == null)
            throw new RuntimeException("Post ID cannot be null");
        @SuppressWarnings("null")
        Long nonNullId = postId;
        Post post = postRepository.findById(nonNullId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        return mapToDto(post, user);
    }

    @Transactional
    public void deletePost(String email, Long postId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (postId == null)
            throw new RuntimeException("Post ID cannot be null");
        @SuppressWarnings("null")
        Long nonNullId = postId;
        Post post = postRepository.findById(nonNullId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You can only delete your own posts");
        }

        // Cleanup dependencies
        mentionRepository.deleteByPostId(postId);
        likeRepository.deleteByPost(post);
        commentRepository.deleteByPost(post);
        shareRepository.deleteByPost(post);

        postRepository.delete(post);
    }

    @Transactional
    public CommentDto addComment(String email, Long postId, String content) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        PostComment comment = new PostComment(post, user, content);
        PostComment savedComment = commentRepository.save(comment);

        // Notify Post Owner
        if (!post.getUser().getId().equals(user.getId())) {
            notificationService.createNotification(post.getUser().getId(), user.getId(), NotificationType.COMMENT,
                    post.getId());
        }

        // Process Mentions in Comment
        processMentions(content, post, savedComment, user);

        return mapToCommentDto(savedComment);
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getComments(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(this::mapToCommentDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentDto updateComment(String email, Long commentId, String content) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You can only edit your own comments");
        }

        comment.setContent(content);
        // Clear old mentions for this comment and re-process
        mentionRepository.deleteByCommentId(commentId);
        processMentions(content, comment.getPost(), comment, user);

        return mapToCommentDto(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(String email, Long commentId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You can only delete your own comments");
        }

        mentionRepository.deleteByCommentId(commentId);
        commentRepository.delete(comment);
    }

    @Transactional
    public void sharePost(String email, Long postId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        PostShare share = new PostShare(post, user);
        shareRepository.save(share);

        // Notify Post Owner
        if (!post.getUser().getId().equals(user.getId())) {
            notificationService.createNotification(post.getUser().getId(), user.getId(), NotificationType.SHARE,
                    post.getId());
        }
    }

    @Transactional
    public void likePost(String email, Long postId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (likeRepository.existsByPostAndUser(post, user)) {
            return; // Already liked
        }

        PostLike like = new PostLike(post, user);
        likeRepository.save(like);

        // Notify Post Owner
        if (!post.getUser().getId().equals(user.getId())) {
            notificationService.createNotification(post.getUser().getId(), user.getId(), NotificationType.LIKE,
                    post.getId());
        }
    }

    @Transactional
    public void unlikePost(String email, Long postId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        likeRepository.findByPostAndUser(post, user).ifPresent(like -> {
            likeRepository.delete(like);
        });
    }

    private void processMentions(String content, Post post, PostComment comment, User actor) {
        try {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("@(\\w+)");
            java.util.regex.Matcher matcher = pattern.matcher(content);
            java.util.Set<String> mentionedUsernames = new java.util.HashSet<>();

            while (matcher.find()) {
                mentionedUsernames.add(matcher.group(1));
            }

            for (String username : mentionedUsernames) {
                profileRepository.findByDisplayNameIgnoreCase(username).ifPresent(profile -> {
                    com.researcher.tool.model.Mention mention = new com.researcher.tool.model.Mention();
                    mention.setPost(post);
                    mention.setMentionedUser(profile.getUser());

                    if (comment != null) {
                        mention.setComment(comment);
                        // Notify
                        if (!profile.getUser().getId().equals(actor.getId())) {
                            notificationService.createNotification(profile.getUser().getId(), actor.getId(),
                                    NotificationType.MENTION_COMMENT, comment.getPost().getId());
                        }
                    } else {
                        // Notify for Post mention
                        if (!profile.getUser().getId().equals(actor.getId())) {
                            notificationService.createNotification(profile.getUser().getId(), actor.getId(),
                                    NotificationType.MENTION_POST, post.getId());
                        }
                    }
                    mention.setCreatedAt(java.time.LocalDateTime.now());
                    mentionRepository.save(mention);
                });
            }
        } catch (Exception e) {
            System.err.println("Failed to process mentions: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<PostDto> getFeed(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        // Use Global Feed as requested to ensure everyone sees posts
        Page<Post> posts = postRepository.findAllByOrderByCreatedAtDesc(pageable);

        return new PageResponse<>(posts.map(p -> mapToDto(p, user)));
    }

    @Transactional(readOnly = true)
    public PageResponse<PostDto> getFeedWithCursor(String email, Long cursor, int limit) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Post> posts;
        if (cursor == null) {
            // First load: get latest posts
            posts = postRepository.findTopNByOrderByCreatedAtDesc(PageRequest.of(0, limit));
        } else {
            // Subsequent load: get posts older than cursor
            posts = postRepository.findByIdLessThanOrderByCreatedAtDesc(cursor, PageRequest.of(0, limit));
        }

        List<PostDto> postDtos = posts.stream()
                .map(p -> mapToDto(p, user))
                .collect(Collectors.toList());

        // Determine if there are more posts
        boolean hasMore = posts.size() >= limit;
        Long nextCursor = posts.isEmpty() ? null : posts.get(posts.size() - 1).getId();

        // Create PageResponse with cursor information
        PageResponse<PostDto> response = new PageResponse<>();
        response.setContent(postDtos);
        response.setTotalElements((long) postDtos.size());
        response.setTotalPages(hasMore ? 2 : 1); // Indicate if there are more pages
        response.setLast(!hasMore);
        response.setFirst(cursor == null);
        response.setNumber(0);
        response.setSize(limit);
        response.setEmpty(postDtos.isEmpty());
        response.setCursor(nextCursor); // For next page loading

        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<PostDto> getUserPosts(String viewerEmail, UUID userId, int page, int size) {
        User viewer = viewerEmail != null ? userRepository.findByEmail(viewerEmail).orElse(null) : null;

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Sort by createdAt desc by default
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> posts = postRepository.findByUser(targetUser, pageable);

        return new PageResponse<>(posts.map(p -> mapToDto(p, viewer)));
    }

    private PostDto mapToDto(Post post, User currentUser) {
        PostDto dto = new PostDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setAuthor(mapToSummary(post.getUser()));

        // Interactions Meta
        dto.setLikeCount(likeRepository.countByPost(post));
        dto.setCommentCount(commentRepository.findByPostIdOrderByCreatedAtAsc(post.getId()).size()); // Optimizable
        dto.setShareCount(0); // Add share repo count later if needed, assume 0 or low prio

        if (currentUser != null) {
            dto.setLiked(likeRepository.existsByPostAndUser(post, currentUser));
        }

        // Populating mentions
        dto.setMentionedUsernames(mentionRepository.findUsernamesByPostId(post.getId()));

        return dto;
    }

    private CommentDto mapToCommentDto(PostComment comment) {
        CommentDto dto = new CommentDto();
        dto.setId(comment.getId());
        dto.setPostId(comment.getPost().getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setUser(mapToSummary(comment.getUser()));

        // Populating mentions
        dto.setMentionedUsernames(mentionRepository.findUsernamesByCommentId(comment.getId()));

        return dto;
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

    // Additional helper methods
    @Transactional(readOnly = true)
    public long getLikeCount(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return likeRepository.countByPost(post);
    }

    @Transactional(readOnly = true)
    public boolean isPostLikedByUser(String email, Long postId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return likeRepository.existsByPostAndUser(post, user);
    }

}
