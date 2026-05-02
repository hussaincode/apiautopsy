package com.apiautopsy.collections;

import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collections")
public class Collection {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne @JoinColumn(name = "parent_id")
    public Collection parent;
    @Column(nullable = false)
    public String name;
    public String description;
    public Instant createdAt = Instant.now();
}
