package com.apiautopsy.alerts;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AlertDtos {
    public record AlertRuleRequest(
        boolean enabled,
        boolean alertOnFailure,
        @Min(1) Long latencyThresholdMs,
        @Min(1) int consecutiveFailuresThreshold,
        List<@Email String> emailRecipients,
        @URL(protocol = "https") String webhookUrl,
        @URL(protocol = "https") String slackWebhookUrl,
        @URL(protocol = "https") String discordWebhookUrl,
        @URL(protocol = "https") String teamsWebhookUrl
    ) {}

    public record AlertRuleResponse(
        UUID id,
        UUID scheduleId,
        boolean enabled,
        boolean alertOnFailure,
        Long latencyThresholdMs,
        int consecutiveFailuresThreshold,
        List<String> emailRecipients,
        String webhookUrl,
        boolean genericWebhookConfigured,
        boolean slackWebhookConfigured,
        boolean discordWebhookConfigured,
        boolean teamsWebhookConfigured,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record AlertIncidentResponse(
        UUID id,
        UUID scheduleId,
        UUID alertRuleId,
        UUID executionId,
        AlertIncidentStatus status,
        String reason,
        Instant openedAt,
        Instant resolvedAt,
        Instant lastTriggeredAt,
        int triggerCount,
        Integer lastStatusCode,
        Long lastLatencyMs,
        String lastErrorMessage,
        long durationSeconds,
        String stateLabel
    ) {}
}
