package com.researcher.tool.repository;

import com.researcher.tool.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, java.util.UUID> {
        Optional<User> findByEmail(String email);

        Boolean existsByEmail(String email);

        Optional<User> findByProviderId(String providerId);

        Optional<User> findByAuthProviderAndProviderId(com.researcher.tool.model.AuthProvider authProvider,
                        String providerId);

        long countByStatus(com.researcher.tool.model.AccountStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
                        "(:status IS NULL OR u.status = :status) AND " +
                        "(:role IS NULL OR :role = '' OR :role = 'All Roles' OR EXISTS (SELECT p FROM ResearcherProfile p WHERE p.user = u AND LOWER(p.role) = LOWER(:role))) AND ("
                        +
                        "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "EXISTS (SELECT p FROM ResearcherProfile p WHERE p.user = u AND (" +
                        "LOWER(p.displayName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%'))))" +
                        ")")
        org.springframework.data.domain.Page<User> searchUsers(
                        @org.springframework.data.repository.query.Param("query") String query,
                        @org.springframework.data.repository.query.Param("status") com.researcher.tool.model.AccountStatus status,
                        @org.springframework.data.repository.query.Param("role") String role,
                        org.springframework.data.domain.Pageable pageable);

        // Profile completion filtering
        org.springframework.data.domain.Page<User> findByStatus(
                        com.researcher.tool.model.AccountStatus status,
                        org.springframework.data.domain.Pageable pageable);

        java.util.List<User> findByStatus(com.researcher.tool.model.AccountStatus status);
}
