package com.apiautopsy.schedules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public class ScheduleDtos {
    public record ScheduleRequest(@NotNull UUID apiRequestId, @NotBlank String name, @NotNull ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled) {}
    public record ScheduleResponse(UUID id, UUID apiRequestId, String name, ScheduleType scheduleType, Integer intervalMinutes, String cronExpression, boolean enabled, Instant nextRunAt, Instant lastRunAt) {}
}
