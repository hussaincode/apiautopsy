package com.apiautopsy.oauth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "oauth_clients")
public class OAuthClient {
    @Id
    @Column(length = 80)
    public String clientId;

    @Column(nullable = false, length = 160)
    public String name;

    @Column(nullable = false, length = 1000)
    public String redirectUris;

    @Column(nullable = false, length = 500)
    public String scopes;

    @Column(nullable = false)
    public boolean publicClient = true;

    @Column(nullable = false)
    public Instant createdAt = Instant.now();
}
