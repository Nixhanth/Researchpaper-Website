package com.researcher.tool.repository;

import com.researcher.tool.model.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findByEmailAndTokenAndPurpose(String email, String token, OtpToken.OtpPurpose purpose);

    Optional<OtpToken> findByEmailAndPurpose(String email, OtpToken.OtpPurpose purpose);

    @Transactional
    void deleteByEmailAndPurpose(String email, OtpToken.OtpPurpose purpose);
}
