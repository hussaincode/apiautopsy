package com.apiautopsy.integrations;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationApiKeyRepository extends JpaRepository<IntegrationApiKey, UUID> {
    List<IntegrationApiKey> findByUser_IdOrderByCreatedAtDesc(UUID userId);
    Optional<IntegrationApiKey> findByKeyHashAndRevokedAtIsNull(String keyHash);
}
