package com.apiautopsy.monitoring;

import com.apiautopsy.alerts.AlertIncident;
import com.apiautopsy.alerts.AlertIncidentRepository;
import com.apiautopsy.alerts.AlertIncidentStatus;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.executions.ExecutionRepository;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.schedules.ScheduleRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class PublicStatusService {
    private final ScheduleRepository schedules;
    private final ExecutionRepository executions;
    private final AlertIncidentRepository incidents;

    public PublicStatusService(ScheduleRepository schedules, ExecutionRepository executions, AlertIncidentRepository incidents) {
        this.schedules = schedules;
        this.executions = executions;
        this.incidents = incidents;
    }

    public MonitoringDtos.PublicStatusResponse get(String slug) {
        Schedule schedule = schedules.findByPublicSlugAndPublicStatusEnabledTrue(slug.toLowerCase()).orElseThrow(() -> new NotFoundException("Status page not found"));
        List<Execution> recent = executions.findTop100ByScheduleIdOrderByExecutedAtDesc(schedule.id);
        long total = recent.size();
        long success = recent.stream().filter(execution -> execution.success).count();
        double successRate = total == 0 ? 0 : success * 100.0 / total;
        double avg = total == 0 ? 0 : recent.stream().mapToLong(execution -> execution.responseTimeMs).average().orElse(0);
        double p95 = percentile(recent.stream().map(execution -> execution.responseTimeMs).sorted(Comparator.naturalOrder()).toList(), 95);
        String status = total == 0 ? "UNKNOWN" : successRate >= schedule.sloUptimeTarget && p95 <= schedule.sloLatencyP95Ms ? "OPERATIONAL" : successRate >= Math.max(0, schedule.sloUptimeTarget - 5) ? "DEGRADED" : "DOWN";
        return new MonitoringDtos.PublicStatusResponse(
            schedule.name,
            schedule.apiRequest == null ? "WORKFLOW" : schedule.apiRequest.method.name(),
            schedule.apiRequest == null ? null : schedule.apiRequest.url,
            status,
            successRate,
            avg,
            p95,
            schedule.sloUptimeTarget,
            total,
            schedule.lastRunAt,
            recent.stream().limit(20).map(execution -> new MonitoringDtos.PublicExecutionResponse(execution.executedAt, execution.success, execution.statusCode, execution.responseTimeMs)).toList(),
            incidents.findTop10ByScheduleIdOrderByOpenedAtDesc(schedule.id).stream().map(this::incidentResponse).toList()
        );
    }

    private MonitoringDtos.PublicIncidentResponse incidentResponse(AlertIncident incident) {
        Instant end = incident.resolvedAt == null ? Instant.now() : incident.resolvedAt;
        long durationSeconds = incident.openedAt == null ? 0 : Math.max(0, Duration.between(incident.openedAt, end).toSeconds());
        return new MonitoringDtos.PublicIncidentResponse(
            incident.id,
            incident.execution == null ? null : incident.execution.id,
            incident.status.name(),
            incident.status == AlertIncidentStatus.OPEN ? "Currently down" : "Recovered",
            incident.reason,
            incident.openedAt,
            incident.resolvedAt,
            incident.lastTriggeredAt,
            durationSeconds
        );
    }

    private double percentile(List<Long> values, int percentile) {
        if (values.isEmpty()) return 0;
        int index = (int) Math.ceil(percentile / 100.0 * values.size()) - 1;
        return values.get(Math.max(0, Math.min(index, values.size() - 1)));
    }
}
