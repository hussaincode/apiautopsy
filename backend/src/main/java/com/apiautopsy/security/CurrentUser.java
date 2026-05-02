package com.apiautopsy.security;

import java.util.UUID;

public record CurrentUser(UUID id, String email, String role) {}
