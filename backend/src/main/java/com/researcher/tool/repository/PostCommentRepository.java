package com.researcher.tool.repository;

import com.researcher.tool.model.Post;
import com.researcher.tool.model.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    void deleteByPost(Post post);
}
