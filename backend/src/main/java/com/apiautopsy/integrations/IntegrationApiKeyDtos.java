package com.apiautopsy.integrations;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class IntegrationApiKeyDtos {
    private IntegrationApiKeyDtos() {}

    public record CreateApiKeyRequest(
        @NotBlank @Size(max = 120) String name
    ) {}

    public record ApiKeyResponse(
        UUID id,
        String name,
        String keyPrefix,
        String scope,
        Instant createdAt,
        Instant lastUsedAt,
        Instant revokedAt
    ) {}

    public record CreatedApiKeyResponse(
        UUID id,
        String name,
        String keyPrefix,
        String scope,
        Instant createdAt,
        Instant lastUsedAt,
        Instant revokedAt,
        String token
    ) {}
}
