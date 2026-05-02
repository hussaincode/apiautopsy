package com.apiautopsy.executions;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class ExecutionDtos {
    public record ExecutionResponse(UUID id, UUID apiRequestId, UUID scheduleId, Integer statusCode, boolean success, long responseTimeMs, Map<String, Object> responseHeaders, String responseBody, String errorMessage, Instant executedAt) {}
    public record ReportResponse(long total, long success, double successRate, double errorRate, double avgLatencyMs) {}
}
