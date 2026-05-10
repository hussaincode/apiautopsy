package com.apiautopsy.executions;

import com.apiautopsy.monitoring.AssertionService;
import com.apiautopsy.security.CryptoService;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExecutionServicePublicTest {
    private final ExecutionService service = new ExecutionService(
        null,
        null,
        null,
        new CryptoService("0123456789abcdef0123456789abcdef"),
        new SsrfGuard(),
        new AssertionService(null, null, null)
    );

    @Test
    void rejectsUnsupportedPublicHttpMethodBeforeExecution() {
        ExecutionDtos.PublicExecutionRequest request = new ExecutionDtos.PublicExecutionRequest(
            "Guest request",
            "TRACE",
            "https://example.com",
            Map.of(),
            Map.of(),
            "NONE",
            Map.of(),
            "NONE",
            Map.of()
        );

        assertThatThrownBy(() -> service.executePublic(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported HttpMethodType");
    }

    @Test
    void keepsSsrfProtectionForGuestExecution() {
        ExecutionDtos.PublicExecutionRequest request = new ExecutionDtos.PublicExecutionRequest(
            "Guest request",
            "GET",
            "http://127.0.0.1:8080/internal",
            Map.of(),
            Map.of(),
            "NONE",
            Map.of(),
            "NONE",
            Map.of()
        );

        ExecutionDtos.ExecutionResponse response = service.executePublic(request);

        org.assertj.core.api.Assertions.assertThat(response.success()).isFalse();
        org.assertj.core.api.Assertions.assertThat(response.errorMessage()).contains("Internal network targets are blocked");
    }
}
