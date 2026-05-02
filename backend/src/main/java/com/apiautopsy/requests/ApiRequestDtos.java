package com.apiautopsy.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

public class ApiRequestDtos {
    public record UpsertRequest(
        UUID collectionId,
        @NotBlank String name,
        @NotNull HttpMethodType method,
        @NotBlank String url,
        Map<String, Object> headers,
        Map<String, Object> queryParams,
        BodyType bodyType,
        Map<String, Object> body,
        AuthType authType,
        Map<String, Object> auth,
        UUID certificateId
    ) {}

    public record ApiRequestResponse(
        UUID id, UUID collectionId, String name, HttpMethodType method, String url,
        Map<String, Object> headers, Map<String, Object> queryParams, BodyType bodyType,
        Map<String, Object> body, AuthType authType, UUID certificateId
    ) {}
}
