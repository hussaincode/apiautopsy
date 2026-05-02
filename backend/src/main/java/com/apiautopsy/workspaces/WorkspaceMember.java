package com.apiautopsy.workspaces;

import com.apiautopsy.users.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workspace_members")
public class WorkspaceMember {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id")
    public User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public WorkspaceRole role;
    public String invitedEmail;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public MembershipStatus status = MembershipStatus.ACTIVE;
    public Instant createdAt = Instant.now();
}
