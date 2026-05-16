package com.apiautopsy.oauth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OAuthAccessTokenRepository extends JpaRepository<OAuthAccessToken, UUID> {
    Optional<OAuthAccessToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);
}
