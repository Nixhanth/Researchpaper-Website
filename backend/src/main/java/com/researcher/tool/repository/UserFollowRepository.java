package com.researcher.tool.repository;

import com.researcher.tool.model.User;
import com.researcher.tool.model.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {
    Optional<UserFollow> findByFollowerAndFollowing(User follower, User following);

    boolean existsByFollowerAndFollowing(User follower, User following);

    List<UserFollow> findByFollower(User follower);

    List<UserFollow> findByFollowing(User following);

    long countByFollower(User follower);

    long countByFollowing(User following);

    void deleteByFollowerAndFollowing(User follower, User following);
}
