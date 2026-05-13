package com.apiautopsy.integrations;

import com.apiautopsy.users.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "integration_api_keys")
public class IntegrationApiKey {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(nullable = false, length = 120)
    public String name;

    @Column(nullable = false, length = 24)
    public String keyPrefix;

    @Column(nullable = false, unique = true, length = 64)
    public String keyHash;

    @Column(nullable = false, length = 64)
    public String scope = "MCP_CONNECTOR";

    @Column(nullable = false)
    public Instant createdAt = Instant.now();

    public Instant lastUsedAt;
    public Instant revokedAt;
}
