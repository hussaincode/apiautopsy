package com.apiautopsy.oauth;

import com.apiautopsy.common.ForbiddenException;
import com.apiautopsy.security.CurrentUser;
import com.apiautopsy.users.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class OAuthAccessTokenService {
    private final OAuthAccessTokenRepository repository;
    private final OAuthTokenGenerator tokenGenerator;

    public OAuthAccessTokenService(OAuthAccessTokenRepository repository, OAuthTokenGenerator tokenGenerator) {
        this.repository = repository;
        this.tokenGenerator = tokenGenerator;
    }

    @Transactional
    public CurrentUser authenticate(String token) {
        OAuthAccessToken accessToken = repository.findByTokenHashAndRevokedAtIsNull(tokenGenerator.hash(token))
            .orElseThrow(() -> new ForbiddenException("Invalid OAuth access token"));
        if (accessToken.expiresAt.isBefore(Instant.now())) throw new ForbiddenException("OAuth access token expired");
        accessToken.lastUsedAt = Instant.now();
        User user = accessToken.user;
        return new CurrentUser(user.id, user.email, user.role.name(), CurrentUser.AUTH_TYPE_OAUTH);
    }
}
