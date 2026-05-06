package com.apiautopsy.schedules;

import com.apiautopsy.executions.ExecutionDtos;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ScheduleDtos {
    public record ScheduleRequest(UUID apiRequestId, UUID collectionId, ScheduleTargetType targetType, @NotBlank String name, @NotNull ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled, @DecimalMin("0.0") @DecimalMax("100.0") Double sloUptimeTarget, @Min(1) Long sloLatencyP95Ms, boolean publicStatusEnabled, @Pattern(regexp = "^[a-z0-9][a-z0-9-]{2,78}[a-z0-9]$|^$") String publicSlug) {}
    public record ToggleScheduleRequest(boolean enabled) {}
    public record ScheduleResponse(UUID id, UUID apiRequestId, UUID collectionId, ScheduleTargetType targetType, String name, ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled, Instant nextRunAt, Instant lastRunAt, double sloUptimeTarget, long sloLatencyP95Ms, boolean publicStatusEnabled, String publicSlug) {}
    public record ScheduleMetrics(long totalRuns, long successfulRuns, long failedRuns, double successRate, double failureRate, double avgLatencyMs, double p50LatencyMs, double p90LatencyMs, double p95LatencyMs, double p99LatencyMs, double errorBudgetRemainingPercent, boolean uptimeSloMet, boolean latencySloMet) {}
    public record ScheduleDetailResponse(ScheduleResponse schedule, ScheduleMetrics metrics, List<ExecutionDtos.ExecutionResponse> executions) {}
}
