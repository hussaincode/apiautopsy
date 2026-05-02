package com.apiautopsy.workflows;

import com.apiautopsy.collections.Collection;
import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow_executions")
public class WorkflowExecution {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne(optional = false) @JoinColumn(name = "collection_id")
    public Collection collection;
    @ManyToOne @JoinColumn(name = "schedule_id")
    public Schedule schedule;
    public boolean success;
    public long totalDurationMs;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> variables = new LinkedHashMap<>();
    public String errorMessage;
    public Instant startedAt = Instant.now();
    public Instant completedAt;
}
