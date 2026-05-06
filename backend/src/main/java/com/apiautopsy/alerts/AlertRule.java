package com.apiautopsy.alerts;

import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "alert_rules")
public class AlertRule {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @OneToOne(optional = false) @JoinColumn(name = "schedule_id")
    public Schedule schedule;

    public boolean enabled = true;
    public boolean alertOnFailure = true;
    public Long latencyThresholdMs;
    public int consecutiveFailuresThreshold = 1;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "email_recipients", columnDefinition = "text[]")
    public List<String> emailRecipients = new ArrayList<>();

    public String slackWebhookUrlEncrypted;
    @Column(name = "webhook_url_encrypted")
    public String webhookUrlEncrypted;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
