package com.apiautopsy.environments;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

public class EnvironmentDtos {
    public record EnvironmentRequest(@NotBlank String name, Map<String, Object> variables) {}
    public record EnvironmentResponse(UUID id, String name, Map<String, Object> variables) {}
}
