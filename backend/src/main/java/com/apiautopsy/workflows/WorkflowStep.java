package com.apiautopsy.workflows;

import com.apiautopsy.collections.Collection;
import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow_steps")
public class WorkflowStep {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne(optional = false) @JoinColumn(name = "collection_id")
    public Collection collection;
    @ManyToOne(optional = false) @JoinColumn(name = "api_request_id")
    public ApiRequest apiRequest;
    public int stepOrder;
    @ManyToOne @JoinColumn(name = "depends_on_step_id")
    public WorkflowStep dependsOnStep;
    public boolean stopOnFailure = true;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> extractionRules = new LinkedHashMap<>();
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
