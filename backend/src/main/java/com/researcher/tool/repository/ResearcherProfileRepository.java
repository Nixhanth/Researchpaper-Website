package com.researcher.tool.repository;

import com.researcher.tool.model.ResearcherProfile;
import com.researcher.tool.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResearcherProfileRepository extends JpaRepository<ResearcherProfile, Long> {
        Optional<ResearcherProfile> findByUser(User user);

        Optional<ResearcherProfile> findByDisplayName(String displayName);

        Optional<ResearcherProfile> findByDisplayNameIgnoreCase(String displayName);

        Boolean existsByDisplayName(String displayName);

        @Query("SELECT DISTINCT p FROM ResearcherProfile p LEFT JOIN p.researchInterests ri WHERE " +
                        "(:currentUserId IS NULL OR p.user.id != :currentUserId) " +
                        "AND (:query IS NULL OR " +
                        "LOWER(p.displayName) LIKE :query OR " +
                        "LOWER(p.fullName) LIKE :query OR " +
                        "LOWER(p.bio) LIKE :query OR " +
                        "LOWER(p.currentTitle) LIKE :query OR " +
                        "LOWER(p.institution) LIKE :query) " +
                        "AND (:department IS NULL OR p.department = :department) " +
                        "AND (:institution IS NULL OR LOWER(p.institution) LIKE :institution) " +
                        "AND (:domain IS NULL OR ri = :domain) " +
                        "AND (:expertise IS NULL OR LOWER(p.bio) LIKE :expertise) " +
                        "AND (:country IS NULL OR LOWER(p.country) LIKE :country)")
        Page<ResearcherProfile> search(@Param("currentUserId") java.util.UUID currentUserId,
                        @Param("query") String query,
                        @Param("department") String department,
                        @Param("institution") String institution,
                        @Param("domain") String domain,
                        @Param("expertise") String expertise,
                        @Param("country") String country,
                        Pageable pageable);

        @Query(value = "SELECT p.* FROM researcher_profiles p " +
                        "JOIN users u ON p.user_id = u.id " +
                        "WHERE (p.user_id <> :currentUserId OR :currentUserId IS NULL) " +
                        "AND u.status NOT IN ('BLOCKED', 'BANNED', 'TEMP_BANNED', 'PERMANENT_BANNED', 'DELETED') " +
                        "AND (:currentUserId IS NULL OR p.user_id NOT IN (SELECT uf.following_id FROM user_follows uf WHERE uf.follower_id = :currentUserId)) "
                        +
                        "AND (:currentUserId IS NULL OR p.user_id NOT IN (SELECT fr.receiver_id FROM follow_requests fr WHERE fr.sender_id = :currentUserId AND fr.status = 'PENDING')) "
                        +
                        "AND (:department IS NULL OR p.department = :department) " +
                        "AND (:institution IS NULL OR LOWER(p.institution) LIKE LOWER(CONCAT('%', :institution, '%'))) "
                        +
                        "AND (:country IS NULL OR LOWER(p.country) LIKE LOWER(CONCAT('%', :country, '%'))) " +
                        "AND (:domain IS NULL OR EXISTS (SELECT 1 FROM profile_interests pi WHERE pi.profile_id = p.id AND pi.interest = :domain)) "
                        +
                        "ORDER BY RANDOM()", nativeQuery = true)
        Page<ResearcherProfile> discover(@Param("currentUserId") java.util.UUID currentUserId,
                        @Param("department") String department,
                        @Param("institution") String institution,
                        @Param("domain") String domain,
                        @Param("country") String country,
                        Pageable pageable);

        @Query(value = "SELECT p.* FROM researcher_profiles p " +
                        "JOIN users u ON p.user_id = u.id " +
                        "WHERE p.user_id <> :userId " +
                        "AND u.status NOT IN ('BLOCKED', 'BANNED', 'TEMP_BANNED', 'PERMANENT_BANNED', 'DELETED') " +
                        "AND p.user_id NOT IN (SELECT uf.following_id FROM user_follows uf WHERE uf.follower_id = :userId) "
                        +
                        "AND p.user_id NOT IN (SELECT fr.receiver_id FROM follow_requests fr WHERE fr.sender_id = :userId AND fr.status = 'PENDING') "
                        +
                        "ORDER BY RANDOM()", nativeQuery = true)
        java.util.List<ResearcherProfile> findSuggestions(@Param("userId") java.util.UUID userId,
                        Pageable pageable);

        @Query("SELECT p FROM ResearcherProfile p WHERE " +
                        "p.user.id <> :currentUserId " +
                        "AND (LOWER(p.displayName) LIKE LOWER(CONCAT(:query, '%')) " +
                        "OR LOWER(p.fullName) LIKE LOWER(CONCAT(:query, '%')))")
        java.util.List<ResearcherProfile> findMentions(@Param("currentUserId") java.util.UUID currentUserId,
                        @Param("query") String query,
                        Pageable pageable);
}
