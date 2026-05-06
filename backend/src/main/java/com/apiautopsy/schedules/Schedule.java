package com.apiautopsy.schedules;

import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.collections.Collection;
import com.apiautopsy.users.User;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedules")
public class Schedule {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne @JoinColumn(name = "created_by_user_id")
    public User createdBy;
    @ManyToOne @JoinColumn(name = "api_request_id")
    public ApiRequest apiRequest;
    @ManyToOne @JoinColumn(name = "collection_id")
    public Collection collection;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public ScheduleTargetType targetType = ScheduleTargetType.REQUEST;
    @Column(nullable = false)
    public String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public ScheduleType scheduleType;
    public Integer intervalMinutes;
    public String cronExpression;
    public boolean enabled = true;
    @Column(name = "slo_uptime_target")
    public double sloUptimeTarget = 99.0;
    @Column(name = "slo_latency_p95_ms")
    public long sloLatencyP95Ms = 1000;
    @Column(name = "public_status_enabled")
    public boolean publicStatusEnabled;
    @Column(name = "public_slug")
    public String publicSlug;
    public Instant nextRunAt;
    public Instant lastRunAt;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
