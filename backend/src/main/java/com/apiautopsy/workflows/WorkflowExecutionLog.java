package com.apiautopsy.workflows;

import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.executions.Execution;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow_execution_logs")
public class WorkflowExecutionLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workflow_execution_id")
    public WorkflowExecution workflowExecution;
    @ManyToOne(optional = false) @JoinColumn(name = "workflow_step_id")
    public WorkflowStep workflowStep;
    @ManyToOne @JoinColumn(name = "execution_id")
    public Execution execution;
    public int stepOrder;
    public String stepName;
    public boolean success;
    public long responseTimeMs;
    public Integer statusCode;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> extractedVariables = new LinkedHashMap<>();
    public String errorMessage;
    public Instant executedAt = Instant.now();
}
