package com.researcher.tool.service;

import com.researcher.tool.dto.FollowStatsDto;
import com.researcher.tool.dto.UserSummaryDto;
import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.model.User;
import com.researcher.tool.model.UserFollow;
import com.researcher.tool.model.FollowRequest;
import com.researcher.tool.model.Notification.NotificationType;
import com.researcher.tool.repository.ResearcherProfileRepository;
import com.researcher.tool.repository.UserFollowRepository;
import com.researcher.tool.repository.FollowRequestRepository;
import com.researcher.tool.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FollowService {

        private final UserFollowRepository followRepository;
        private final UserRepository userRepository;
        private final ResearcherProfileRepository profileRepository;
        private final NotificationService notificationService;
        private final FollowRequestRepository followRequestRepository;

        public FollowService(UserFollowRepository followRepository, UserRepository userRepository,
                        ResearcherProfileRepository profileRepository, NotificationService notificationService,
                        FollowRequestRepository followRequestRepository) {
                this.followRepository = followRepository;
                this.userRepository = userRepository;
                this.profileRepository = profileRepository;
                this.notificationService = notificationService;
                this.followRequestRepository = followRequestRepository;
        }

        @Transactional
        public String followUser(String followerEmail, UUID followingId) {
                User follower = userRepository.findByEmail(followerEmail)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User following = userRepository.findById(followingId)
                                .orElseThrow(() -> new RuntimeException("User to follow not found"));

                if (follower.getId().equals(following.getId())) {
                        throw new RuntimeException("You cannot follow yourself");
                }

                // Check if already following
                if (followRepository.existsByFollowerAndFollowing(follower, following)) {
                        return "FOLLOWING";
                }

                // Check if request already exists (Enforce Single Follow Request Per User Pair)
                Optional<FollowRequest> existingRequest = followRequestRepository.findBySenderAndReceiver(follower,
                                following);
                if (existingRequest.isPresent()) {
                        FollowRequest req = existingRequest.get();
                        if (req.getStatus() == FollowRequest.RequestStatus.PENDING) {
                                return "REQUESTED";
                        }
                        if (req.getStatus() == FollowRequest.RequestStatus.REJECTED) {
                                // Cooldown period (24 hours) to prevent re-request spam
                                if (req.getCreatedAt().isAfter(LocalDateTime.now().minusHours(24))) {
                                        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                                                        "You can't send another request right now. Please wait 24 hours.");
                                }
                                // Reset to PENDING if cooldown passed
                                req.setStatus(FollowRequest.RequestStatus.PENDING);
                                req.setCreatedAt(LocalDateTime.now());
                                followRequestRepository.save(req);
                                notificationService.createNotification(following.getId(), follower.getId(),
                                                NotificationType.FOLLOW_REQUEST, req.getId());
                                return "REQUESTED";
                        }
                        // Status must be ACCEPTED (relationship handled above by exists check)
                }

                // Check if the other user already follows current user (FOLLOW BACK CASE)
                if (followRepository.existsByFollowerAndFollowing(following, follower)) {
                        UserFollow follow = new UserFollow(follower, following);
                        followRepository.save(follow);
                        updateProfileCounters(follower);
                        updateProfileCounters(following);

                        // Also clean up any pending/rejected requests if they exist
                        followRequestRepository.findBySenderAndReceiver(follower, following)
                                        .ifPresent(followRequestRepository::delete);

                        // Notify Target
                        notificationService.createNotification(following.getId(), follower.getId(),
                                        NotificationType.FOLLOW_BACK, null);
                        return "FOLLOWING";
                }

                // Create New Request
                FollowRequest request = new FollowRequest(follower, following);
                request = followRequestRepository.save(request);
                notificationService.createNotification(following.getId(), follower.getId(),
                                NotificationType.FOLLOW_REQUEST, request.getId());
                return "REQUESTED";
        }

        @Transactional
        public void acceptFollowRequest(String userEmail, Long requestId) {
                User user = userRepository.findByEmail(userEmail)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
                FollowRequest request = followRequestRepository.findById(requestId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Request not found"));

                if (!request.getReceiver().getId().equals(user.getId())) {
                        throw new RuntimeException("Not authorized to accept this request");
                }

                request.setStatus(FollowRequest.RequestStatus.ACCEPTED);
                followRequestRepository.save(request);

                // Create Relationship
                UserFollow follow = new UserFollow(request.getSender(), request.getReceiver());
                followRepository.save(follow);
                updateProfileCounters(request.getSender());
                updateProfileCounters(request.getReceiver());

                // Notify Sender (User A) that User B accepted
                notificationService.createNotification(request.getSender().getId(), user.getId(),
                                NotificationType.FOLLOW_ACCEPTED, null);

                // Transform original FOLLOW_REQUEST notification for User B into a FOLLOW
                // notification
                // This allows User B to see the "Follow Back" button in the same place
                notificationService.updateNotificationType(user.getId(), request.getSender().getId(),
                                NotificationType.FOLLOW_REQUEST, NotificationType.FOLLOW);
        }

        @Transactional
        public void rejectFollowRequest(String userEmail, Long requestId) {
                User user = userRepository.findByEmail(userEmail)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
                FollowRequest request = followRequestRepository.findById(requestId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Request not found"));

                if (!request.getReceiver().getId().equals(user.getId())) {
                        throw new RuntimeException("Not authorized to reject this request");
                }

                request.setStatus(FollowRequest.RequestStatus.REJECTED);
                request.setCreatedAt(LocalDateTime.now()); // Update timestamp for cooldown tracking
                followRequestRepository.save(request);

                // Remove follow request notification completely from receiver
                notificationService.deleteNotificationByEntityIdAndType(requestId, NotificationType.FOLLOW_REQUEST);

                // No notification sent to requester (Silent Rejection)
        }

        @Transactional
        public void cancelFollowRequest(String senderEmail, UUID receiverId) {
                User sender = userRepository.findByEmail(senderEmail)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                User receiver = userRepository.findById(receiverId)
                                .orElseThrow(() -> new RuntimeException("Receiver not found"));

                Optional<FollowRequest> request = followRequestRepository.findBySenderAndReceiver(sender, receiver);
                request.ifPresent(req -> {
                        followRequestRepository.delete(req);
                        notificationService.deleteNotificationByEntityIdAndType(req.getId(),
                                        NotificationType.FOLLOW_REQUEST);
                });
        }

        @Transactional
        public void unfollowUser(String followerEmail, @org.springframework.lang.NonNull java.util.UUID followingId) {
                User follower = userRepository.findByEmail(followerEmail)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User following = userRepository.findById(followingId)
                                .orElseThrow(() -> new RuntimeException("User to unfollow not found"));

                followRepository.deleteByFollowerAndFollowing(follower, following);
                updateProfileCounters(follower);
                updateProfileCounters(following);

                // Also clean up any accepted requests so they don't linger
                followRequestRepository.deleteBySenderAndReceiver(follower, following);

                // Notify (Optional in prompt it says "No notification sent", but existing logic
                // had it. Prompt says "No notification sent (Instagram behavior)". Removing.)
                // notificationService.createNotification(following.getId(), follower.getId(),
                // NotificationType.UNFOLLOW, null);
        }

        @Transactional(readOnly = true)
        public FollowStatsDto getStats(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                long followers = followRepository.countByFollowing(user);
                long following = followRepository.countByFollower(user);

                return new FollowStatsDto(followers, following);
        }

        @Transactional(readOnly = true)
        public String getRelationshipStatus(String followerEmail, UUID targetUserId) {
                User follower = userRepository.findByEmail(followerEmail)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User target = userRepository.findById(targetUserId)
                                .orElseThrow(() -> new RuntimeException("Target user not found"));

                if (followRepository.existsByFollowerAndFollowing(follower, target)) {
                        return "FOLLOWING";
                }

                if (followRequestRepository.existsBySenderAndReceiverAndStatus(follower, target,
                                FollowRequest.RequestStatus.PENDING)) {
                        return "REQUESTED";
                }

                if (followRepository.existsByFollowerAndFollowing(target, follower)) {
                        return "FOLLOW_BACK";
                }

                return "NONE";
        }

        // Use for backward compatibility if needed, but updated Controller should use
        // getRelationshipStatus
        @Transactional(readOnly = true)
        public boolean isFollowing(String followerEmail, UUID userId) {
                User follower = userRepository.findByEmail(followerEmail)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User following = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return followRepository.existsByFollowerAndFollowing(follower, following);
        }

        @Transactional
        public void removeFollower(String followingEmail, UUID followerId) {
                User following = userRepository.findByEmail(followingEmail)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                User follower = userRepository.findById(followerId)
                                .orElseThrow(() -> new RuntimeException("Follower to remove not found"));

                followRepository.deleteByFollowerAndFollowing(follower, following);
                updateProfileCounters(follower);
                updateProfileCounters(following);

                // No notification sent for removing a follower (Instagram behavior)
        }

        @Transactional(readOnly = true)
        public List<UserSummaryDto> getFollowers(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return followRepository.findByFollowing(user).stream()
                                .map(follow -> mapToSummary(follow.getFollower()))
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<UserSummaryDto> getFollowing(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return followRepository.findByFollower(user).stream()
                                .map(follow -> mapToSummary(follow.getFollowing()))
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<UserSummaryDto> getSentRequests(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return followRequestRepository.findBySenderAndStatus(user, FollowRequest.RequestStatus.PENDING)
                                .stream()
                                .map(request -> mapToSummary(request.getReceiver()))
                                .collect(Collectors.toList());
        }

        private UserSummaryDto mapToSummary(User user) {
                ResearcherProfile profile = profileRepository.findByUser(user).orElse(null);
                String name = (profile != null && profile.getFullName() != null) ? profile.getFullName() : "Researcher";
                String displayName = (profile != null && profile.getDisplayName() != null) ? profile.getDisplayName()
                                : user.getEmail().split("@")[0]; // Fallback
                String avatar = (profile != null) ? profile.getAvatarUrl() : null;
                String institution = (profile != null) ? profile.getInstitution() : "";
                String department = (profile != null) ? profile.getDepartment() : "";
                String bio = (profile != null) ? profile.getBio() : "";

                return new UserSummaryDto(user.getId(), name, displayName, avatar, institution, department, bio);
        }

        private void updateProfileCounters(User user) {
                ResearcherProfile profile = profileRepository.findByUser(user).orElse(null);
                if (profile != null) {
                        profile.setFollowers((int) followRepository.countByFollowing(user));
                        profile.setFollowing((int) followRepository.countByFollower(user));
                        profileRepository.save(profile);
                }
        }
}
