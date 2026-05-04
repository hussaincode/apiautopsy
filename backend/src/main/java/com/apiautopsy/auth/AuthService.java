package com.apiautopsy.auth;

import com.apiautopsy.security.JwtService;
import com.apiautopsy.users.AuthProvider;
import com.apiautopsy.users.Role;
import com.apiautopsy.users.User;
import com.apiautopsy.users.UserRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserRepository users;
    private final PendingRegistrationRepository pendingRegistrations;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final WorkspaceService workspaces;
    private final EmailService emailService;

    public AuthService(UserRepository users, PendingRegistrationRepository pendingRegistrations, PasswordEncoder encoder, JwtService jwt, WorkspaceService workspaces, EmailService emailService) {
        this.users = users;
        this.pendingRegistrations = pendingRegistrations;
        this.encoder = encoder;
        this.jwt = jwt;
        this.workspaces = workspaces;
        this.emailService = emailService;
    }

    @Transactional
    public AuthDtos.RegisterStartResponse register(AuthDtos.RegisterRequest request) {
        String email = request.email().toLowerCase();
        users.findByEmailIgnoreCase(email).ifPresent(u -> { throw new IllegalArgumentException("Email already registered"); });

        String otp = "%06d".formatted(RANDOM.nextInt(1_000_000));
        PendingRegistration pending = pendingRegistrations.findByEmailIgnoreCase(email).orElseGet(PendingRegistration::new);
        pending.email = email;
        pending.name = request.name();
        pending.passwordHash = encoder.encode(request.password());
        pending.otpHash = encoder.encode(otp);
        pending.expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);
        pending.attempts = 0;
        pending.updatedAt = Instant.now();
        pendingRegistrations.save(pending);
        emailService.sendRegistrationOtp(email, otp);

        return new AuthDtos.RegisterStartResponse(email, "Verification code sent to your email.");
    }

    @Transactional
    public AuthDtos.AuthResponse verifyRegistration(AuthDtos.VerifyRegistrationRequest request) {
        String email = request.email().toLowerCase();
        users.findByEmailIgnoreCase(email).ifPresent(u -> { throw new IllegalArgumentException("Email already registered"); });

        PendingRegistration pending = pendingRegistrations.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new IllegalArgumentException("Verification code expired. Please register again."));
        if (pending.expiresAt.isBefore(Instant.now())) {
            pendingRegistrations.delete(pending);
            throw new IllegalArgumentException("Verification code expired. Please register again.");
        }
        if (pending.attempts >= 5) {
            pendingRegistrations.delete(pending);
            throw new IllegalArgumentException("Too many attempts. Please register again.");
        }
        if (!encoder.matches(request.otp(), pending.otpHash)) {
            pending.attempts += 1;
            pending.updatedAt = Instant.now();
            pendingRegistrations.save(pending);
            throw new IllegalArgumentException("Invalid verification code.");
        }

        User user = new User();
        user.email = email;
        user.name = pending.name;
        user.passwordHash = pending.passwordHash;
        user.role = Role.USER;
        users.save(user);
        workspaces.createPersonalWorkspace(user);
        pendingRegistrations.delete(pending);
        return response(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email()).orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (user.passwordHash == null || !encoder.matches(request.password(), user.passwordHash)) throw new IllegalArgumentException("Invalid credentials");
        return response(user);
    }

    @Transactional
    public String loginWithGoogle(String email, String name, String subject) {
        User user = users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User created = new User();
            created.email = email.toLowerCase();
            created.name = name == null ? email : name;
            created.provider = AuthProvider.GOOGLE;
            created.providerSubject = subject;
            created.role = Role.USER;
            users.save(created);
            workspaces.createPersonalWorkspace(created);
            return created;
        });
        return jwt.issue(user);
    }

    private AuthDtos.AuthResponse response(User user) {
        return new AuthDtos.AuthResponse(jwt.issue(user), user.email, user.name, user.role.name());
    }
}
