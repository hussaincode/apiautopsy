package com.apiautopsy.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {
    @Test
    void allowedOriginsAlwaysIncludeProductionDomainsWhenEnvironmentOverridesDefaults() {
        List<String> origins = SecurityConfig.allowedOrigins(" https://custom-preview.example.com ,http://localhost:5173");

        assertThat(origins)
            .contains("https://apiautopsy.com", "https://www.apiautopsy.com", "https://custom-preview.example.com")
            .doesNotHaveDuplicates();
    }
}
