package com.apiautopsy.schedules;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.alerts.AlertService;
import com.apiautopsy.collections.Collection;
import com.apiautopsy.collections.CollectionRepository;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.executions.ExecutionDtos;
import com.apiautopsy.executions.ExecutionRepository;
import com.apiautopsy.executions.ExecutionService;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.requests.ApiRequestRepository;
import com.apiautopsy.users.UserRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import com.apiautopsy.workflows.WorkflowService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Comparator;
import java.util.UUID;

@Service
public class ScheduleService {
    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);
    private final ScheduleRepository schedules;
    private final ApiRequestRepository requests;
    private final CollectionRepository collections;
    private final WorkspaceService workspaceService;
    private final ExecutionService executionService;
    private final ExecutionRepository executions;
    private final WorkflowService workflowService;
    private final AlertService alertService;
    private final UserRepository users;

    public ScheduleService(ScheduleRepository schedules, ApiRequestRepository requests, CollectionRepository collections, WorkspaceService workspaceService, ExecutionService executionService, ExecutionRepository executions, WorkflowService workflowService, AlertService alertService, UserRepository users) {
        this.schedules = schedules;
        this.requests = requests;
        this.collections = collections;
        this.workspaceService = workspaceService;
        this.executionService = executionService;
        this.executions = executions;
        this.workflowService = workflowService;
        this.alertService = alertService;
        this.users = users;
    }

    public List<ScheduleDtos.ScheduleResponse> list(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return schedules.findByWorkspaceId(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ScheduleDtos.ScheduleResponse create(UUID userId, UUID workspaceId, ScheduleDtos.ScheduleRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = new Schedule();
        schedule.createdBy = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        applyTarget(schedule, workspaceId, dto);
        apply(schedule, dto);
        schedules.save(schedule);
        return toResponse(schedule);
    }

    @Transactional
    public void delete(UUID userId, UUID workspaceId, UUID scheduleId) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = requireSchedule(workspaceId, scheduleId);
        schedules.delete(schedule);
    }

    public ScheduleDtos.ScheduleDetailResponse detail(UUID userId, UUID workspaceId, UUID scheduleId) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = requireSchedule(workspaceId, scheduleId);
        List<Execution> recent = executions.findTop100ByScheduleIdOrderByExecutedAtDesc(scheduleId);
        Object[] row = flattenAggregate(executions.aggregateSchedule(scheduleId, Instant.now().minus(Duration.ofDays(30))));
        long total = row[0] == null ? 0 : ((Number) row[0]).longValue();
        long success = row[1] == null ? 0 : ((Number) row[1]).longValue();
        double avg = row[2] == null ? 0 : ((Number) row[2]).doubleValue();
        long failed = total - success;
        double successRate = total == 0 ? 0 : success * 100.0 / total;
        ScheduleDtos.ScheduleMetrics metrics = metrics(schedule, executions.findTop500ByScheduleIdOrderByExecutedAtDesc(scheduleId), total, success, failed, successRate, total == 0 ? 0 : failed * 100.0 / total, avg);
        return new ScheduleDtos.ScheduleDetailResponse(toResponse(schedule), metrics, recent.stream().map(this::executionResponse).toList());
    }

    @Transactional
    public ScheduleDtos.ScheduleResponse update(UUID userId, UUID workspaceId, UUID scheduleId, ScheduleDtos.ScheduleRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.workspace.id.equals(workspaceId)) throw new NotFoundException("Schedule not found");
        applyTarget(schedule, workspaceId, dto);
        apply(schedule, dto);
        schedule.updatedAt = Instant.now();
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleDtos.ScheduleResponse updateEnabled(UUID userId, UUID workspaceId, UUID scheduleId, boolean enabled) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = requireSchedule(workspaceId, scheduleId);
        schedule.enabled = enabled;
        schedule.nextRunAt = computeNext(schedule);
        schedule.updatedAt = Instant.now();
        return toResponse(schedule);
    }

    @Scheduled(fixedDelayString = "${app.scheduler.poll-ms}")
    @Transactional
    public void runDueSchedules() {
        List<Schedule> due = schedules.findTop25ByEnabledTrueAndNextRunAtLessThanEqualOrderByNextRunAtAsc(Instant.now());
        for (Schedule schedule : due) {
            try {
                if (schedule.targetType == ScheduleTargetType.WORKFLOW) workflowService.runScheduled(schedule.workspace.id, schedule.collection.id, schedule);
                else {
                    Execution execution = executionService.executeScheduled(schedule.apiRequest, schedule);
                    alertService.evaluateScheduleExecution(schedule, execution);
                }
            } catch (RuntimeException ex) {
                log.error("Scheduled run failed for schedule {}", schedule.id, ex);
            } finally {
                schedule.lastRunAt = Instant.now();
                schedule.nextRunAt = computeNext(schedule);
                schedule.updatedAt = Instant.now();
            }
        }
    }

    private void apply(Schedule schedule, ScheduleDtos.ScheduleRequest dto) {
        schedule.name = dto.name();
        schedule.scheduleType = dto.scheduleType();
        schedule.intervalMinutes = dto.intervalMinutes();
        schedule.cronExpression = dto.cronExpression();
        schedule.enabled = dto.enabled();
        schedule.sloUptimeTarget = dto.sloUptimeTarget() == null ? schedule.sloUptimeTarget : dto.sloUptimeTarget();
        schedule.sloLatencyP95Ms = dto.sloLatencyP95Ms() == null ? schedule.sloLatencyP95Ms : dto.sloLatencyP95Ms();
        schedule.publicStatusEnabled = dto.publicStatusEnabled();
        schedule.publicSlug = normalizeSlug(dto.publicSlug());
        validate(schedule);
        schedule.nextRunAt = computeNext(schedule);
    }

    private void applyTarget(Schedule schedule, UUID workspaceId, ScheduleDtos.ScheduleRequest dto) {
        ScheduleTargetType targetType = dto.targetType() == null ? ScheduleTargetType.REQUEST : dto.targetType();
        schedule.targetType = targetType;
        if (targetType == ScheduleTargetType.WORKFLOW) {
            if (dto.collectionId() == null) throw new IllegalArgumentException("Workflow schedules require collectionId");
            Collection collection = collections.findById(dto.collectionId()).orElseThrow(() -> new NotFoundException("Collection not found"));
            if (!collection.workspace.id.equals(workspaceId)) throw new NotFoundException("Collection not found");
            schedule.workspace = collection.workspace;
            schedule.collection = collection;
            schedule.apiRequest = null;
        } else {
            if (dto.apiRequestId() == null) throw new IllegalArgumentException("Request schedules require apiRequestId");
            ApiRequest request = requests.findByIdAndWorkspaceId(dto.apiRequestId(), workspaceId).orElseThrow(() -> new NotFoundException("API request not found"));
            schedule.workspace = request.workspace;
            schedule.apiRequest = request;
            schedule.collection = null;
        }
    }

    private void validate(Schedule schedule) {
        if (schedule.scheduleType == ScheduleType.INTERVAL && (schedule.intervalMinutes == null || schedule.intervalMinutes < 1)) {
            throw new IllegalArgumentException("Interval schedules require intervalMinutes >= 1");
        }
        if (schedule.scheduleType == ScheduleType.CRON && (schedule.cronExpression == null || !CronExpression.isValidExpression(schedule.cronExpression))) {
            throw new IllegalArgumentException("Invalid cron expression");
        }
        if (schedule.sloUptimeTarget < 0 || schedule.sloUptimeTarget > 100) throw new IllegalArgumentException("SLO uptime target must be between 0 and 100");
        if (schedule.sloLatencyP95Ms < 1) throw new IllegalArgumentException("SLO p95 latency target must be greater than 0");
        if (schedule.publicStatusEnabled && (schedule.publicSlug == null || schedule.publicSlug.isBlank())) throw new IllegalArgumentException("Public status requires a public slug");
    }

    private Schedule requireSchedule(UUID workspaceId, UUID scheduleId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.workspace.id.equals(workspaceId)) throw new NotFoundException("Schedule not found");
        return schedule;
    }

    private Instant computeNext(Schedule schedule) {
        if (!schedule.enabled) return Instant.now().plusSeconds(31536000);
        if (schedule.scheduleType == ScheduleType.INTERVAL) return Instant.now().plusSeconds(schedule.intervalMinutes * 60L);
        ZonedDateTime next = CronExpression.parse(schedule.cronExpression).next(ZonedDateTime.now(ZoneOffset.UTC));
        if (next == null) throw new IllegalArgumentException("Cron expression has no next run");
        return next.toInstant();
    }

    private ScheduleDtos.ScheduleResponse toResponse(Schedule s) {
        return new ScheduleDtos.ScheduleResponse(s.id, s.apiRequest == null ? null : s.apiRequest.id, s.collection == null ? null : s.collection.id, s.targetType, s.name, s.scheduleType, s.intervalMinutes, s.cronExpression, s.enabled, s.nextRunAt, s.lastRunAt, s.sloUptimeTarget, s.sloLatencyP95Ms, s.publicStatusEnabled, s.publicSlug);
    }

    private ExecutionDtos.ExecutionResponse executionResponse(Execution e) {
        return new ExecutionDtos.ExecutionResponse(e.id, e.apiRequest.id, e.schedule == null ? null : e.schedule.id, e.statusCode, e.success, e.responseTimeMs, e.responseHeaders, e.responseBody, e.errorMessage, e.executedAt, e.responseSizeBytes, e.assertionPassed, e.assertionResults);
    }

    private ScheduleDtos.ScheduleMetrics metrics(Schedule schedule, List<Execution> window, long total, long success, long failed, double successRate, double failureRate, double avg) {
        List<Long> latencies = window.stream().map(execution -> execution.responseTimeMs).sorted(Comparator.naturalOrder()).toList();
        double p50 = percentile(latencies, 50);
        double p90 = percentile(latencies, 90);
        double p95 = percentile(latencies, 95);
        double p99 = percentile(latencies, 99);
        double errorBudget = Math.max(0, 100.0 - schedule.sloUptimeTarget);
        double usedError = Math.max(0, 100.0 - successRate);
        double remaining = errorBudget == 0 ? (usedError == 0 ? 100 : 0) : Math.max(0, (errorBudget - usedError) * 100.0 / errorBudget);
        return new ScheduleDtos.ScheduleMetrics(total, success, failed, successRate, failureRate, avg, p50, p90, p95, p99, remaining, total == 0 || successRate >= schedule.sloUptimeTarget, total == 0 || p95 <= schedule.sloLatencyP95Ms);
    }

    private double percentile(List<Long> values, int percentile) {
        if (values.isEmpty()) return 0;
        int index = (int) Math.ceil(percentile / 100.0 * values.size()) - 1;
        return values.get(Math.max(0, Math.min(index, values.size() - 1)));
    }

    private String normalizeSlug(String slug) {
        if (slug == null || slug.isBlank()) return null;
        return slug.trim().toLowerCase();
    }

    private Object[] flattenAggregate(Object[] row) {
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) return nested;
        return row == null ? new Object[0] : row;
    }
}
