package com.apiautopsy.security;

import java.util.UUID;

public record CurrentUser(UUID id, String email, String role, String authType) {
    public static final String AUTH_TYPE_JWT = "JWT";
    public static final String AUTH_TYPE_API_KEY = "API_KEY";

    public CurrentUser(UUID id, String email, String role) {
        this(id, email, role, AUTH_TYPE_JWT);
    }
}
