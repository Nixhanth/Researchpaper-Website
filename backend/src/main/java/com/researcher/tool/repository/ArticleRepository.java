package com.researcher.tool.repository;

import com.researcher.tool.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    Optional<Article> findByPubmedId(String pubmedId);

    boolean existsByDoi(String doi);
}
