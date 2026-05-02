package com.apiautopsy.schedules;

import com.apiautopsy.requests.ApiRequest;
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
    @ManyToOne(optional = false) @JoinColumn(name = "api_request_id")
    public ApiRequest apiRequest;
    @Column(nullable = false)
    public String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public ScheduleType scheduleType;
    public Integer intervalMinutes;
    public String cronExpression;
    public boolean enabled = true;
    public Instant nextRunAt;
    public Instant lastRunAt;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
