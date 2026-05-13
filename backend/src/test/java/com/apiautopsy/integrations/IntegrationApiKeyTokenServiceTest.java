package com.apiautopsy.integrations;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IntegrationApiKeyTokenServiceTest {
    private final IntegrationApiKeyTokenService tokenService = new IntegrationApiKeyTokenService();

    @Test
    void generatesOpaqueApiAutopsyToken() {
        String token = tokenService.generateToken();

        assertThat(token).startsWith("aat_live_");
        assertThat(token).hasSizeGreaterThan(40);
        assertThat(tokenService.displayPrefix(token)).isEqualTo(token.substring(0, 16));
    }

    @Test
    void hashesTokensWithoutLeakingSecretMaterial() {
        String token = "aat_live_test-token-value";

        String hash = tokenService.hash(token);

        assertThat(hash).hasSize(64);
        assertThat(hash).doesNotContain(token);
        assertThat(tokenService.hash(token)).isEqualTo(hash);
    }
}
