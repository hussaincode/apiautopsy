package com.apiautopsy.integrations;

import com.apiautopsy.common.ForbiddenException;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.CurrentUser;
import com.apiautopsy.users.User;
import com.apiautopsy.users.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.apiautopsy.integrations.IntegrationApiKeyDtos.ApiKeyResponse;
import static com.apiautopsy.integrations.IntegrationApiKeyDtos.CreatedApiKeyResponse;
import static com.apiautopsy.integrations.IntegrationApiKeyDtos.CreateApiKeyRequest;

@Service
public class IntegrationApiKeyService {
    private final IntegrationApiKeyRepository repository;
    private final IntegrationApiKeyTokenService tokenService;
    private final UserRepository userRepository;

    public IntegrationApiKeyService(IntegrationApiKeyRepository repository, IntegrationApiKeyTokenService tokenService, UserRepository userRepository) {
        this.repository = repository;
        this.tokenService = tokenService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> list(UUID userId) {
        return repository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public CreatedApiKeyResponse create(CurrentUser currentUser, CreateApiKeyRequest request) {
        requireInteractiveUser(currentUser);
        User user = userRepository.findById(currentUser.id()).orElseThrow(() -> new NotFoundException("User not found"));
        String token = tokenService.generateToken();
        IntegrationApiKey key = new IntegrationApiKey();
        key.user = user;
        key.name = request.name().trim();
        key.keyPrefix = tokenService.displayPrefix(token);
        key.keyHash = tokenService.hash(token);
        IntegrationApiKey saved = repository.save(key);
        ApiKeyResponse response = toResponse(saved);
        return new CreatedApiKeyResponse(
            response.id(),
            response.name(),
            response.keyPrefix(),
            response.scope(),
            response.createdAt(),
            response.lastUsedAt(),
            response.revokedAt(),
            token
        );
    }

    @Transactional
    public void revoke(CurrentUser currentUser, UUID keyId) {
        requireInteractiveUser(currentUser);
        IntegrationApiKey key = repository.findById(keyId).orElseThrow(() -> new NotFoundException("API key not found"));
        if (!key.user.id.equals(currentUser.id())) throw new ForbiddenException("API key belongs to another user");
        key.revokedAt = Instant.now();
    }

    @Transactional
    public CurrentUser authenticate(String token) {
        IntegrationApiKey key = repository.findByKeyHashAndRevokedAtIsNull(tokenService.hash(token))
            .orElseThrow(() -> new ForbiddenException("Invalid API key"));
        key.lastUsedAt = Instant.now();
        User user = key.user;
        return new CurrentUser(user.id, user.email, user.role.name(), CurrentUser.AUTH_TYPE_API_KEY);
    }

    private void requireInteractiveUser(CurrentUser user) {
        if (CurrentUser.AUTH_TYPE_API_KEY.equals(user.authType())) {
            throw new ForbiddenException("API keys cannot create or revoke integration keys");
        }
    }

    private ApiKeyResponse toResponse(IntegrationApiKey key) {
        return new ApiKeyResponse(key.id, key.name, key.keyPrefix, key.scope, key.createdAt, key.lastUsedAt, key.revokedAt);
    }
}
