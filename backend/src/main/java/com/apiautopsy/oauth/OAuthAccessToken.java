package com.apiautopsy.oauth;

import com.apiautopsy.users.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "oauth_access_tokens")
public class OAuthAccessToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false, unique = true, length = 64)
    public String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    public OAuthClient client;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(nullable = false, length = 500)
    public String scopes;

    @Column(nullable = false)
    public Instant expiresAt;

    public Instant lastUsedAt;
    public Instant revokedAt;

    @Column(nullable = false)
    public Instant createdAt = Instant.now();
}
