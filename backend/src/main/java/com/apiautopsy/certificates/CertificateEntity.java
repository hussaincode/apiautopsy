package com.apiautopsy.certificates;

import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "certificates")
public class CertificateEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @Column(nullable = false)
    public String name;
    @Column(nullable = false)
    public String certificatePemEncrypted;
    public String privateKeyPemEncrypted;
    public Instant createdAt = Instant.now();
}
