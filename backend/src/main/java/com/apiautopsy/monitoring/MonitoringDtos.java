package com.apiautopsy.monitoring;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class MonitoringDtos {
    public record AssertionRequest(
        @NotNull AssertionType type,
        @NotBlank String name,
        boolean enabled,
        Integer expectedStatusCode,
        String jsonPath,
        String expectedValue,
        String containsText,
        String headerName,
        @Min(1) Long maxLatencyMs,
        @Min(1) Long maxResponseSizeBytes
    ) {}

    public record AssertionResponse(
        UUID id,
        UUID scheduleId,
        AssertionType type,
        String name,
        boolean enabled,
        Integer expectedStatusCode,
        String jsonPath,
        String expectedValue,
        String containsText,
        String headerName,
        Long maxLatencyMs,
        Long maxResponseSizeBytes,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record AssertionResult(String assertionId, String name, AssertionType type, boolean passed, String message) {}

    public record PublicStatusResponse(
        String name,
        String method,
        String url,
        String status,
        @Min(0) @Max(100) double successRate,
        double avgLatencyMs,
        double p95LatencyMs,
        double uptimeTarget,
        long totalRuns,
        Instant lastRunAt,
        List<PublicExecutionResponse> recentExecutions,
        List<PublicIncidentResponse> incidents
    ) {}

    public record PublicExecutionResponse(Instant executedAt, boolean success, Integer statusCode, long responseTimeMs) {}
    public record PublicIncidentResponse(
        UUID id,
        UUID executionId,
        String status,
        String stateLabel,
        String reason,
        Instant openedAt,
        Instant resolvedAt,
        Instant lastTriggeredAt,
        long durationSeconds
    ) {}
}
