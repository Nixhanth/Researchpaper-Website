package com.researcher.tool.repository;

import com.researcher.tool.model.AdminSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface AdminSessionRepository extends JpaRepository<AdminSession, UUID> {
    Optional<AdminSession> findByTokenSignature(String tokenSignature);

    List<AdminSession> findByAdminUsernameAndIsValidTrue(String adminUsername);

    void deleteByTokenSignature(String tokenSignature);
}
