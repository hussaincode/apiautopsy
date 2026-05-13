package com.apiautopsy.integrations;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.apiautopsy.integrations.IntegrationApiKeyDtos.ApiKeyResponse;
import static com.apiautopsy.integrations.IntegrationApiKeyDtos.CreatedApiKeyResponse;
import static com.apiautopsy.integrations.IntegrationApiKeyDtos.CreateApiKeyRequest;

@RestController
@RequestMapping("/api/integration-keys")
public class IntegrationApiKeyController {
    private final IntegrationApiKeyService service;

    public IntegrationApiKeyController(IntegrationApiKeyService service) {
        this.service = service;
    }

    @GetMapping
    public List<ApiKeyResponse> list() {
        return service.list(SecurityUtils.currentUser().id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedApiKeyResponse create(@Valid @RequestBody CreateApiKeyRequest request) {
        return service.create(SecurityUtils.currentUser(), request);
    }

    @DeleteMapping("/{keyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID keyId) {
        service.revoke(SecurityUtils.currentUser(), keyId);
    }
}
