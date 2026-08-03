package com.researcher.tool.repository;

import com.researcher.tool.model.PostMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostMentionRepository extends JpaRepository<PostMention, Long> {
}
