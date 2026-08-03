package com.researcher.tool.repository;

import com.researcher.tool.model.AuthProvider;
import com.researcher.tool.model.OnboardingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingSessionRepository extends JpaRepository<OnboardingSession, UUID> {

    Optional<OnboardingSession> findBySessionToken(String sessionToken);

    Optional<OnboardingSession> findByEmail(String email);

    Optional<OnboardingSession> findByAuthProviderAndProviderId(AuthProvider authProvider, String providerId);

    void deleteByEmail(String email);

    void deleteBySessionToken(String sessionToken);
}
