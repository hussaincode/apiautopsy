package com.apiautopsy.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class OAuthDtos {
    private OAuthDtos() {}

    public record ClientPreviewResponse(String clientId, String name, List<String> scopes, String redirectUri) {}

    public record AuthorizeRequest(
        @NotBlank String clientId,
        @NotBlank String redirectUri,
        String scope,
        String state,
        String codeChallenge,
        String codeChallengeMethod
    ) {}

    public record AuthorizeResponse(String redirectUri, String code, String state, int expiresIn) {}

    public record TokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") int expiresIn,
        String scope
    ) {}
}
