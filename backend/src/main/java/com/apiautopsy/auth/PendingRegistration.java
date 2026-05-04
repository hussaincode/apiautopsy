package com.apiautopsy.auth;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pending_registrations")
public class PendingRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @Column(nullable = false, unique = true)
    public String email;
    @Column(nullable = false)
    public String name;
    @Column(nullable = false)
    public String passwordHash;
    @Column(nullable = false)
    public String otpHash;
    @Column(nullable = false)
    public Instant expiresAt;
    @Column(nullable = false)
    public int attempts;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
