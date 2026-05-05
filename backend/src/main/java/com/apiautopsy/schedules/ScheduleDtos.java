package com.apiautopsy.schedules;

import com.apiautopsy.executions.ExecutionDtos;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ScheduleDtos {
    public record ScheduleRequest(UUID apiRequestId, UUID collectionId, ScheduleTargetType targetType, @NotBlank String name, @NotNull ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled) {}
    public record ToggleScheduleRequest(boolean enabled) {}
    public record ScheduleResponse(UUID id, UUID apiRequestId, UUID collectionId, ScheduleTargetType targetType, String name, ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled, Instant nextRunAt, Instant lastRunAt) {}
    public record ScheduleMetrics(long totalRuns, long successfulRuns, long failedRuns, double successRate, double failureRate, double avgLatencyMs) {}
    public record ScheduleDetailResponse(ScheduleResponse schedule, ScheduleMetrics metrics, List<ExecutionDtos.ExecutionResponse> executions) {}
}
