package com.apiautopsy.monitoring;

import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_assertions")
public class ScheduleAssertion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;

    @ManyToOne(optional = false) @JoinColumn(name = "schedule_id")
    public Schedule schedule;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public AssertionType type;

    @Column(nullable = false)
    public String name;

    public boolean enabled = true;
    public Integer expectedStatusCode;
    public String jsonPath;
    public String expectedValue;
    public String containsText;
    public Long maxLatencyMs;
    public Long maxResponseSizeBytes;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
