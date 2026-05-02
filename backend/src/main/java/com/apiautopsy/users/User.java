package com.apiautopsy.users;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @Column(nullable = false, unique = true)
    public String email;
    public String passwordHash;
    @Column(nullable = false)
    public String name;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Role role = Role.USER;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public AuthProvider provider = AuthProvider.LOCAL;
    public String providerSubject;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
