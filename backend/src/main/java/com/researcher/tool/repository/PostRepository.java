package com.researcher.tool.repository;

import com.researcher.tool.model.Post;
import com.researcher.tool.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByUserOrderByCreatedAtDesc(User user);

    Page<Post> findByUser(User user, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.user.id = :userId " +
            "OR p.user.id IN (SELECT uf.following.id FROM UserFollow uf WHERE uf.follower.id = :userId) " +
            "OR p.id IN (SELECT ps.post.id FROM PostShare ps WHERE ps.sharedByUser.id IN (SELECT uf2.following.id FROM UserFollow uf2 WHERE uf2.follower.id = :userId)) "
            +
            "ORDER BY p.createdAt DESC")
    Page<Post> findFeedByUserId(java.util.UUID userId, Pageable pageable);

    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // Cursor-based pagination methods for Instagram/LinkedIn-style feed
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC, p.id DESC")
    List<Post> findTopNByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.id < :cursor ORDER BY p.createdAt DESC, p.id DESC")
    List<Post> findByIdLessThanOrderByCreatedAtDesc(Long cursor, Pageable pageable);
}
