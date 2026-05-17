package com.apiautopsy.alerts;

import com.apiautopsy.auth.EmailService;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.executions.ExecutionRepository;
import com.apiautopsy.executions.SsrfGuard;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.schedules.ScheduleRepository;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.workspaces.WorkspaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AlertService {
    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRuleRepository rules;
    private final AlertIncidentRepository incidents;
    private final ScheduleRepository schedules;
    private final ExecutionRepository executions;
    private final WorkspaceService workspaceService;
    private final EmailService emailService;
    private final CryptoService cryptoService;
    private final SsrfGuard ssrfGuard;
    private final RestClient restClient = RestClient.create();

    public AlertService(AlertRuleRepository rules, AlertIncidentRepository incidents, ScheduleRepository schedules, ExecutionRepository executions, WorkspaceService workspaceService, EmailService emailService, CryptoService cryptoService, SsrfGuard ssrfGuard) {
        this.rules = rules;
        this.incidents = incidents;
        this.schedules = schedules;
        this.executions = executions;
        this.workspaceService = workspaceService;
        this.emailService = emailService;
        this.cryptoService = cryptoService;
        this.ssrfGuard = ssrfGuard;
    }

    public List<AlertDtos.AlertRuleResponse> listRules(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return rules.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream().map(this::toRuleResponse).toList();
    }

    @Transactional
    public AlertDtos.AlertRuleResponse saveRule(UUID userId, UUID workspaceId, UUID scheduleId, AlertDtos.AlertRuleRequest request) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = requireSchedule(workspaceId, scheduleId);
        AlertRule rule = rules.findByScheduleId(scheduleId).orElseGet(AlertRule::new);
        if (rule.id == null) {
            rule.workspace = schedule.workspace;
            rule.schedule = schedule;
            rule.createdAt = Instant.now();
        }
        rule.enabled = request.enabled();
        rule.alertOnFailure = request.alertOnFailure();
        rule.latencyThresholdMs = request.latencyThresholdMs();
        rule.consecutiveFailuresThreshold = Math.max(1, request.consecutiveFailuresThreshold());
        rule.emailRecipients = cleanRecipients(request.emailRecipients());
        if (request.webhookUrl() != null) rule.webhookUrlEncrypted = encryptWebhook(request.webhookUrl());
        if (request.slackWebhookUrl() != null) rule.slackWebhookUrlEncrypted = encryptWebhook(request.slackWebhookUrl());
        if (request.discordWebhookUrl() != null) rule.discordWebhookUrlEncrypted = encryptWebhook(request.discordWebhookUrl());
        if (request.teamsWebhookUrl() != null) rule.teamsWebhookUrlEncrypted = encryptWebhook(request.teamsWebhookUrl());
        rule.updatedAt = Instant.now();
        return toRuleResponse(rules.save(rule));
    }

    public List<AlertDtos.AlertIncidentResponse> listIncidents(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return incidents.findTop100ByWorkspaceIdOrderByOpenedAtDesc(workspaceId).stream().map(this::toIncidentResponse).toList();
    }

    @Transactional
    public AlertRule ensureDefaultRule(Schedule schedule) {
        return rules.findByScheduleId(schedule.id).orElseGet(() -> {
            AlertRule rule = new AlertRule();
            rule.workspace = schedule.workspace;
            rule.schedule = schedule;
            rule.enabled = true;
            rule.alertOnFailure = true;
            rule.consecutiveFailuresThreshold = 1;
            rule.createdAt = Instant.now();
            rule.updatedAt = Instant.now();
            return rules.save(rule);
        });
    }

    @Transactional
    public AlertDtos.AlertIncidentResponse resolveIncident(UUID userId, UUID workspaceId, UUID incidentId) {
        workspaceService.requireMember(workspaceId, userId);
        AlertIncident incident = incidents.findById(incidentId).orElseThrow(() -> new NotFoundException("Alert incident not found"));
        if (!incident.workspace.id.equals(workspaceId)) throw new NotFoundException("Alert incident not found");
        if (incident.status == AlertIncidentStatus.OPEN) {
            incident.status = AlertIncidentStatus.RESOLVED;
            incident.resolvedAt = Instant.now();
        }
        return toIncidentResponse(incident);
    }

    @Transactional
    public void evaluateScheduleExecution(Schedule schedule, Execution execution) {
        try {
            AlertRule rule = ensureDefaultRule(schedule);
            if (!rule.enabled) return;
            List<String> reasons = reasons(rule, execution);
            if (reasons.isEmpty()) {
                resolveOpenIncident(rule, execution);
                return;
            }
            triggerIncident(rule, execution, String.join("; ", reasons));
        } catch (RuntimeException ex) {
            log.error("Alert evaluation failed for schedule {}", schedule.id, ex);
        }
    }

    private List<String> reasons(AlertRule rule, Execution execution) {
        List<String> reasons = new ArrayList<>();
        if (rule.alertOnFailure && !execution.success) {
            reasons.add("Request failed with status " + (execution.statusCode == null ? "N/A" : execution.statusCode));
        }
        if (!execution.assertionPassed) {
            reasons.add("One or more response assertions failed");
        }
        if (rule.latencyThresholdMs != null && execution.responseTimeMs > rule.latencyThresholdMs) {
            reasons.add("Latency " + execution.responseTimeMs + " ms exceeded " + rule.latencyThresholdMs + " ms");
        }
        int consecutiveFailures = consecutiveFailures(rule.schedule.id);
        if (consecutiveFailures >= rule.consecutiveFailuresThreshold && !execution.success) {
            reasons.add(consecutiveFailures + " consecutive failures detected");
        }
        return reasons;
    }

    private int consecutiveFailures(UUID scheduleId) {
        int count = 0;
        for (Execution execution : executions.findTop100ByScheduleIdOrderByExecutedAtDesc(scheduleId)) {
            if (execution.success) break;
            count++;
        }
        return count;
    }

    private void triggerIncident(AlertRule rule, Execution execution, String reason) {
        AlertIncident incident = incidents.findFirstByScheduleIdAndStatusOrderByOpenedAtDesc(rule.schedule.id, AlertIncidentStatus.OPEN).orElseGet(() -> {
            AlertIncident created = new AlertIncident();
            created.workspace = rule.workspace;
            created.schedule = rule.schedule;
            created.alertRule = rule;
            created.openedAt = Instant.now();
            return created;
        });
        boolean isNew = incident.id == null;
        incident.execution = execution;
        incident.status = AlertIncidentStatus.OPEN;
        incident.reason = reason;
        incident.lastTriggeredAt = Instant.now();
        incident.lastStatusCode = execution.statusCode;
        incident.lastLatencyMs = execution.responseTimeMs;
        incident.lastErrorMessage = execution.errorMessage;
        if (!isNew) incident.triggerCount++;
        incidents.save(incident);
        if (isNew) {
            emailService.sendAlertTriggered(recipients(rule), rule.schedule.name, reason);
            sendWebhooks(rule, "triggered", reason, execution);
        }
    }

    private void resolveOpenIncident(AlertRule rule, Execution execution) {
        incidents.findFirstByScheduleIdAndStatusOrderByOpenedAtDesc(rule.schedule.id, AlertIncidentStatus.OPEN).ifPresent(incident -> {
            incident.execution = execution;
            incident.status = AlertIncidentStatus.RESOLVED;
            incident.resolvedAt = Instant.now();
            incident.lastTriggeredAt = Instant.now();
            incidents.save(incident);
            emailService.sendAlertResolved(recipients(rule), rule.schedule.name);
            sendWebhooks(rule, "resolved", "Monitor recovered", execution);
        });
    }

    private void sendWebhooks(AlertRule rule, String event, String reason, Execution execution) {
        java.util.Map<String, Object> genericPayload = alertPayload(rule, event, reason, execution);
        sendWebhook(rule, "generic", rule.webhookUrlEncrypted, genericPayload);
        String summary = rule.schedule.name + " " + event + ": " + reason + " (" + execution.responseTimeMs + " ms, status " + (execution.statusCode == null ? "N/A" : execution.statusCode) + ")";
        sendWebhook(rule, "slack", rule.slackWebhookUrlEncrypted, java.util.Map.of("text", summary));
        sendWebhook(rule, "discord", rule.discordWebhookUrlEncrypted, java.util.Map.of("content", summary));
        sendWebhook(rule, "teams", rule.teamsWebhookUrlEncrypted, java.util.Map.of("text", summary));
    }

    private void sendWebhook(AlertRule rule, String channel, String encryptedUrl, java.util.Map<String, Object> payload) {
        if (encryptedUrl == null || encryptedUrl.isBlank()) return;
        try {
            String webhookUrl = cryptoService.decrypt(encryptedUrl);
            restClient.post()
                .uri(ssrfGuard.validateExternalHttpUrl(webhookUrl))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        } catch (RuntimeException ex) {
            log.warn("Alert {} webhook delivery failed for schedule {}", channel, rule.schedule.id, ex);
        }
    }

    private java.util.Map<String, Object> alertPayload(AlertRule rule, String event, String reason, Execution execution) {
        return java.util.Map.of(
            "event", event,
            "scheduleId", rule.schedule.id.toString(),
            "scheduleName", rule.schedule.name,
            "reason", reason,
            "statusCode", execution.statusCode == null ? "N/A" : execution.statusCode,
            "latencyMs", execution.responseTimeMs,
            "executedAt", execution.executedAt.toString()
        );
    }

    private String encryptWebhook(String webhookUrl) {
        if (webhookUrl == null || webhookUrl.isBlank()) return null;
        ssrfGuard.validateExternalHttpUrl(webhookUrl);
        return cryptoService.encrypt(webhookUrl.trim());
    }

    private List<String> recipients(AlertRule rule) {
        List<String> recipients = new ArrayList<>();
        if (rule.schedule.createdBy != null && rule.schedule.createdBy.email != null) {
            recipients.add(rule.schedule.createdBy.email);
        } else if (rule.schedule.workspace.owner != null && rule.schedule.workspace.owner.email != null) {
            recipients.add(rule.schedule.workspace.owner.email);
        }
        recipients.addAll(rule.emailRecipients == null ? List.of() : rule.emailRecipients);
        return cleanRecipients(recipients);
    }

    private Schedule requireSchedule(UUID workspaceId, UUID scheduleId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.workspace.id.equals(workspaceId)) throw new NotFoundException("Schedule not found");
        return schedule;
    }

    private List<String> cleanRecipients(List<String> recipients) {
        if (recipients == null) return List.of();
        return recipients.stream().map(String::trim).filter(email -> !email.isBlank()).distinct().toList();
    }

    private AlertDtos.AlertRuleResponse toRuleResponse(AlertRule rule) {
        return new AlertDtos.AlertRuleResponse(
            rule.id,
            rule.schedule.id,
            rule.enabled,
            rule.alertOnFailure,
            rule.latencyThresholdMs,
            rule.consecutiveFailuresThreshold,
            rule.emailRecipients,
            null,
            isConfigured(rule.webhookUrlEncrypted),
            isConfigured(rule.slackWebhookUrlEncrypted),
            isConfigured(rule.discordWebhookUrlEncrypted),
            isConfigured(rule.teamsWebhookUrlEncrypted),
            rule.createdAt,
            rule.updatedAt
        );
    }

    private AlertDtos.AlertIncidentResponse toIncidentResponse(AlertIncident incident) {
        Instant end = incident.resolvedAt == null ? Instant.now() : incident.resolvedAt;
        long durationSeconds = incident.openedAt == null ? 0 : Math.max(0, Duration.between(incident.openedAt, end).toSeconds());
        return new AlertDtos.AlertIncidentResponse(
            incident.id,
            incident.schedule.id,
            incident.alertRule.id,
            incident.execution == null ? null : incident.execution.id,
            incident.status,
            incident.reason,
            incident.openedAt,
            incident.resolvedAt,
            incident.lastTriggeredAt,
            incident.triggerCount,
            incident.lastStatusCode,
            incident.lastLatencyMs,
            incident.lastErrorMessage,
            durationSeconds,
            incident.status == AlertIncidentStatus.OPEN ? "Currently down" : "Recovered"
        );
    }

    private boolean isConfigured(String encryptedValue) {
        return encryptedValue != null && !encryptedValue.isBlank();
    }
}
