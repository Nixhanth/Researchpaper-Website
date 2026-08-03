package com.researcher.tool.repository;

import com.researcher.tool.model.Mention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentionRepository extends JpaRepository<Mention, Long> {
        List<Mention> findByPostId(Long postId);

        List<Mention> findByCommentId(Long commentId);

        @Query("SELECT p.displayName FROM Mention m JOIN ResearcherProfile p ON m.mentionedUser = p.user WHERE m.post.id = :postId")
        List<String> findUsernamesByPostId(@Param("postId") Long postId);

        @Query("SELECT p.displayName FROM Mention m JOIN ResearcherProfile p ON m.mentionedUser = p.user WHERE m.comment.id = :commentId")
        List<String> findUsernamesByCommentId(@Param("commentId") Long commentId);

        void deleteByPostId(Long postId);

        void deleteByCommentId(Long commentId);
}
