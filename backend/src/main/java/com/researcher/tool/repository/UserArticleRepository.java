package com.researcher.tool.repository;

import com.researcher.tool.model.Article;
import com.researcher.tool.model.User;
import com.researcher.tool.model.UserArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserArticleRepository extends JpaRepository<UserArticle, Long> {
    Page<UserArticle> findByUserOrderByAddedAtDesc(User user, Pageable pageable);

    Page<UserArticle> findByUserAndArticleConfirmedOrderByAddedAtDesc(User user, Boolean confirmed, Pageable pageable);

    boolean existsByUserAndArticle(User user, Article article);

    Optional<UserArticle> findByUserAndArticle(User user, Article article);

    long countByUser(User user);

    java.util.List<UserArticle> findByUser(User user);
}
