package com.researcher.tool.repository;

import com.researcher.tool.model.Post;
import com.researcher.tool.model.PostShare;
import com.researcher.tool.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, Long> {
    List<PostShare> findBySharedByUserOrderByCreatedAtDesc(User sharedByUser);

    void deleteByPost(Post post);
}
