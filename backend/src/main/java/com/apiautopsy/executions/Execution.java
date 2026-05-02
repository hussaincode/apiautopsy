package com.apiautopsy.executions;

import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "executions")
public class Execution {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne(optional = false) @JoinColumn(name = "api_request_id")
    public ApiRequest apiRequest;
    @ManyToOne @JoinColumn(name = "schedule_id")
    public Schedule schedule;
    public Integer statusCode;
    public boolean success;
    public long responseTimeMs;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> responseHeaders = new LinkedHashMap<>();
    public String responseBody;
    public String errorMessage;
    public Instant executedAt = Instant.now();
}
