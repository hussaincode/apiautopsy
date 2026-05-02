package com.apiautopsy.environments;

import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "environments")
public class Environment {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @Column(nullable = false)
    public String name;
    @Convert(converter = JsonbConverter.class)
    @Column(columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> variables = new LinkedHashMap<>();
    public Instant createdAt = Instant.now();
}
