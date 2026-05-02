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

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final WorkspaceService workspaces;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, WorkspaceService workspaces) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.workspaces = workspaces;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        users.findByEmailIgnoreCase(request.email()).ifPresent(u -> { throw new IllegalArgumentException("Email already registered"); });
        User user = new User();
        user.email = request.email().toLowerCase();
        user.name = request.name();
        user.passwordHash = encoder.encode(request.password());
        user.role = Role.USER;
        users.save(user);
        workspaces.createPersonalWorkspace(user);
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
