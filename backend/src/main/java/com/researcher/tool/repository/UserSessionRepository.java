package com.researcher.tool.repository;

import com.researcher.tool.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    List<UserSession> findByUserIdAndIsValidTrue(UUID userId);

    List<UserSession> findByUserEmailAndIsValidTrue(String userEmail);

    @Modifying
    @Transactional
    @Query("UPDATE UserSession s SET s.isValid = false WHERE s.userId = :userId")
    int invalidateAllSessionsForUser(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE UserSession s SET s.isValid = false WHERE s.userEmail = :email")
    int invalidateAllSessionsByEmail(@Param("email") String email);

    @Query("SELECT COUNT(s) FROM UserSession s WHERE s.userId = :userId AND s.isValid = true")
    long countActiveSessionsByUserId(@Param("userId") UUID userId);
}
