package com.apiautopsy.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {
    public record RegisterRequest(@Email String email, @NotBlank String password, @NotBlank String name) {}
    public record RegisterStartResponse(String email, String message) {}
    public record VerifyRegistrationRequest(@Email String email, @NotBlank String otp) {}
    public record LoginRequest(@Email String email, @NotBlank String password) {}
    public record AuthResponse(String token, String email, String name, String role) {}
}
