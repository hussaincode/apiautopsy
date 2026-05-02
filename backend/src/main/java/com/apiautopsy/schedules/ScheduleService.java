package com.apiautopsy.schedules;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.executions.ExecutionService;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.requests.ApiRequestRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ScheduleService {
    private final ScheduleRepository schedules;
    private final ApiRequestRepository requests;
    private final WorkspaceService workspaceService;
    private final ExecutionService executionService;

    public ScheduleService(ScheduleRepository schedules, ApiRequestRepository requests, WorkspaceService workspaceService, ExecutionService executionService) {
        this.schedules = schedules;
        this.requests = requests;
        this.workspaceService = workspaceService;
        this.executionService = executionService;
    }

    public List<ScheduleDtos.ScheduleResponse> list(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return schedules.findByWorkspaceId(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ScheduleDtos.ScheduleResponse create(UUID userId, UUID workspaceId, ScheduleDtos.ScheduleRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        ApiRequest request = requests.findByIdAndWorkspaceId(dto.apiRequestId(), workspaceId).orElseThrow(() -> new NotFoundException("API request not found"));
        Schedule schedule = new Schedule();
        schedule.workspace = request.workspace;
        schedule.apiRequest = request;
        apply(schedule, dto);
        schedules.save(schedule);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleDtos.ScheduleResponse update(UUID userId, UUID workspaceId, UUID scheduleId, ScheduleDtos.ScheduleRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.workspace.id.equals(workspaceId)) throw new NotFoundException("Schedule not found");
        apply(schedule, dto);
        schedule.updatedAt = Instant.now();
        return toResponse(schedule);
    }

    @Scheduled(fixedDelayString = "${app.scheduler.poll-ms}")
    @Transactional
    public void runDueSchedules() {
        List<Schedule> due = schedules.findTop25ByEnabledTrueAndNextRunAtLessThanEqualOrderByNextRunAtAsc(Instant.now());
        for (Schedule schedule : due) {
            executionService.executeScheduled(schedule.apiRequest, schedule);
            schedule.lastRunAt = Instant.now();
            schedule.nextRunAt = computeNext(schedule);
            schedule.updatedAt = Instant.now();
        }
    }

    private void apply(Schedule schedule, ScheduleDtos.ScheduleRequest dto) {
        schedule.name = dto.name();
        schedule.scheduleType = dto.scheduleType();
        schedule.intervalMinutes = dto.intervalMinutes();
        schedule.cronExpression = dto.cronExpression();
        schedule.enabled = dto.enabled();
        validate(schedule);
        schedule.nextRunAt = computeNext(schedule);
    }

    private void validate(Schedule schedule) {
        if (schedule.scheduleType == ScheduleType.INTERVAL && (schedule.intervalMinutes == null || schedule.intervalMinutes < 1)) {
            throw new IllegalArgumentException("Interval schedules require intervalMinutes >= 1");
        }
        if (schedule.scheduleType == ScheduleType.CRON && (schedule.cronExpression == null || !CronExpression.isValidExpression(schedule.cronExpression))) {
            throw new IllegalArgumentException("Invalid cron expression");
        }
    }

    private Instant computeNext(Schedule schedule) {
        if (!schedule.enabled) return Instant.now().plusSeconds(31536000);
        if (schedule.scheduleType == ScheduleType.INTERVAL) return Instant.now().plusSeconds(schedule.intervalMinutes * 60L);
        ZonedDateTime next = CronExpression.parse(schedule.cronExpression).next(ZonedDateTime.now(ZoneOffset.UTC));
        if (next == null) throw new IllegalArgumentException("Cron expression has no next run");
        return next.toInstant();
    }

    private ScheduleDtos.ScheduleResponse toResponse(Schedule s) {
        return new ScheduleDtos.ScheduleResponse(s.id, s.apiRequest.id, s.name, s.scheduleType, s.intervalMinutes, s.cronExpression, s.enabled, s.nextRunAt, s.lastRunAt);
    }
}
