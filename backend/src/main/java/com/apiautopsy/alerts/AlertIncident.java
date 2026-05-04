package com.apiautopsy.alerts;

import com.apiautopsy.executions.Execution;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_incidents")
public class AlertIncident {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @ManyToOne(optional = false) @JoinColumn(name = "schedule_id")
    public Schedule schedule;

    @ManyToOne(optional = false) @JoinColumn(name = "alert_rule_id")
    public AlertRule alertRule;

    @ManyToOne @JoinColumn(name = "execution_id")
    public Execution execution;

    @Enumerated(EnumType.STRING)
    public AlertIncidentStatus status = AlertIncidentStatus.OPEN;

    public String reason;
    public Instant openedAt = Instant.now();
    public Instant resolvedAt;
    public Instant lastTriggeredAt = Instant.now();
    public int triggerCount = 1;
    public Integer lastStatusCode;
    public Long lastLatencyMs;
    public String lastErrorMessage;
}
