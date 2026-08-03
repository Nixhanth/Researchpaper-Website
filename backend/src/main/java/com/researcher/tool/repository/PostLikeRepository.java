package com.researcher.tool.repository;

import com.researcher.tool.model.Post;
import com.researcher.tool.model.PostLike;
import com.researcher.tool.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByPostAndUser(Post post, User user);

    Optional<PostLike> findByPostAndUser(Post post, User user);

    long countByPost(Post post);

    void deleteByPost(Post post);
}
