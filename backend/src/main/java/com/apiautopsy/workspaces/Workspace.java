package com.apiautopsy.workspaces;

import com.apiautopsy.users.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
public class Workspace {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @Column(nullable = false)
    public String name;
    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id")
    public User owner;
    public Instant createdAt = Instant.now();
}
