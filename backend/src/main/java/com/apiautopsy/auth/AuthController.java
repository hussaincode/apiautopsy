package com.apiautopsy.auth;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    AuthDtos.RegisterStartResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return service.register(request);
    }

    @PostMapping("/register/verify")
    AuthDtos.AuthResponse verifyRegistration(@Valid @RequestBody AuthDtos.VerifyRegistrationRequest request) {
        return service.verifyRegistration(request);
    }

    @PostMapping("/login")
    AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return service.login(request);
    }

    @GetMapping("/google")
    String googleLoginHint() {
        return "/oauth2/authorization/google";
    }
}
