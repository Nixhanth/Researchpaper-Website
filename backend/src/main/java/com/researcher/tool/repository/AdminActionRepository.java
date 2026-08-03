package com.researcher.tool.repository;

import com.researcher.tool.model.AdminAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AdminActionRepository extends JpaRepository<AdminAction, UUID> {
    Page<AdminAction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AdminAction> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);

}
