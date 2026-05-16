package com.apiautopsy.oauth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OAuthTokenGeneratorTest {
    private final OAuthTokenGenerator generator = new OAuthTokenGenerator();

    @Test
    void createsDistinctPrefixedCredentials() {
        assertThat(generator.authorizationCode()).startsWith("aac_");
        assertThat(generator.accessToken()).startsWith("aao_live_");
        assertThat(generator.authorizationCode()).isNotEqualTo(generator.authorizationCode());
    }

    @Test
    void hashesAndPkceChallengesAreDeterministic() {
        assertThat(generator.hash("secret")).hasSize(64);
        assertThat(generator.s256("verifier")).isEqualTo(generator.s256("verifier"));
        assertThat(generator.s256("verifier")).doesNotContain("verifier");
    }
}
