package com.apiautopsy.oauth;

import com.apiautopsy.common.ForbiddenException;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.CurrentUser;
import com.apiautopsy.users.User;
import com.apiautopsy.users.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static com.apiautopsy.oauth.OAuthDtos.*;

@Service
public class OAuthAuthorizationService {
    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration TOKEN_TTL = Duration.ofHours(12);
    private final OAuthClientRepository clientRepository;
    private final OAuthAuthorizationCodeRepository codeRepository;
    private final OAuthAccessTokenRepository tokenRepository;
    private final OAuthTokenGenerator tokenGenerator;
    private final UserRepository userRepository;
    private final String defaultScopes;

    public OAuthAuthorizationService(
        OAuthClientRepository clientRepository,
        OAuthAuthorizationCodeRepository codeRepository,
        OAuthAccessTokenRepository tokenRepository,
        OAuthTokenGenerator tokenGenerator,
        UserRepository userRepository,
        @Value("${app.oauth.default-scopes:workspaces:read requests:read requests:execute schedules:read reports:read status:read}") String defaultScopes
    ) {
        this.clientRepository = clientRepository;
        this.codeRepository = codeRepository;
        this.tokenRepository = tokenRepository;
        this.tokenGenerator = tokenGenerator;
        this.userRepository = userRepository;
        this.defaultScopes = defaultScopes;
    }

    @Transactional(readOnly = true)
    public ClientPreviewResponse preview(String clientId, String redirectUri, String requestedScope) {
        OAuthClient client = clientRepository.findById(clientId).orElseThrow(() -> new NotFoundException("OAuth client not found"));
        validateRedirectUri(client, redirectUri);
        String scope = normalizeScopes(client, requestedScope);
        return new ClientPreviewResponse(client.clientId, client.name, splitScopes(scope), redirectUri);
    }

    @Transactional(readOnly = true)
    public List<ConnectedAppResponse> connectedApps(UUID userId) {
        return tokenRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
            .map(token -> new ConnectedAppResponse(
                token.id,
                token.client.clientId,
                token.client.name,
                splitScopes(token.scopes),
                token.createdAt,
                token.lastUsedAt,
                token.expiresAt,
                token.revokedAt
            ))
            .toList();
    }

    @Transactional
    public void revokeConnectedApp(CurrentUser currentUser, UUID tokenId) {
        OAuthAccessToken token = tokenRepository.findById(tokenId).orElseThrow(() -> new NotFoundException("Connected app not found"));
        if (!token.user.id.equals(currentUser.id())) throw new ForbiddenException("Connected app belongs to another user");
        token.revokedAt = Instant.now();
    }

    @Transactional
    public AuthorizeResponse authorize(CurrentUser currentUser, AuthorizeRequest request) {
        OAuthClient client = clientRepository.findById(request.clientId()).orElseThrow(() -> new NotFoundException("OAuth client not found"));
        validateRedirectUri(client, request.redirectUri());
        String scope = normalizeScopes(client, request.scope());
        User user = userRepository.findById(currentUser.id()).orElseThrow(() -> new NotFoundException("User not found"));
        String code = tokenGenerator.authorizationCode();

        OAuthAuthorizationCode authCode = new OAuthAuthorizationCode();
        authCode.client = client;
        authCode.user = user;
        authCode.codeHash = tokenGenerator.hash(code);
        authCode.redirectUri = request.redirectUri();
        authCode.scopes = scope;
        authCode.codeChallenge = normalizeOptional(request.codeChallenge());
        authCode.codeChallengeMethod = normalizeOptional(request.codeChallengeMethod());
        authCode.expiresAt = Instant.now().plus(CODE_TTL);
        codeRepository.save(authCode);

        return new AuthorizeResponse(buildRedirectUri(request.redirectUri(), code, request.state()), code, request.state(), (int) CODE_TTL.toSeconds());
    }

    @Transactional
    public TokenResponse exchangeCode(String grantType, String clientId, String code, String redirectUri, String codeVerifier) {
        if (!"authorization_code".equals(grantType)) throw new IllegalArgumentException("Unsupported grant_type");
        OAuthAuthorizationCode authCode = codeRepository.findByCodeHash(tokenGenerator.hash(code)).orElseThrow(() -> new ForbiddenException("Invalid authorization code"));
        if (authCode.consumedAt != null || authCode.expiresAt.isBefore(Instant.now())) throw new ForbiddenException("Authorization code expired");
        if (!authCode.client.clientId.equals(clientId)) throw new ForbiddenException("Client mismatch");
        if (!authCode.redirectUri.equals(redirectUri)) throw new ForbiddenException("Redirect URI mismatch");
        validatePkce(authCode, codeVerifier);
        authCode.consumedAt = Instant.now();

        String token = tokenGenerator.accessToken();
        OAuthAccessToken accessToken = new OAuthAccessToken();
        accessToken.client = authCode.client;
        accessToken.user = authCode.user;
        accessToken.scopes = authCode.scopes;
        accessToken.tokenHash = tokenGenerator.hash(token);
        accessToken.expiresAt = Instant.now().plus(TOKEN_TTL);
        tokenRepository.save(accessToken);

        return new TokenResponse(token, "Bearer", (int) TOKEN_TTL.toSeconds(), authCode.scopes);
    }

    private void validatePkce(OAuthAuthorizationCode authCode, String verifier) {
        if (!StringUtils.hasText(authCode.codeChallenge)) return;
        if (!StringUtils.hasText(verifier)) throw new ForbiddenException("code_verifier is required");
        String method = Optional.ofNullable(authCode.codeChallengeMethod).orElse("plain");
        String expected = "S256".equalsIgnoreCase(method) ? tokenGenerator.s256(verifier) : verifier;
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), authCode.codeChallenge.getBytes(StandardCharsets.US_ASCII))) {
            throw new ForbiddenException("Invalid code_verifier");
        }
    }

    private void validateRedirectUri(OAuthClient client, String redirectUri) {
        URI uri = URI.create(redirectUri);
        if (!Set.of("https", "http").contains(uri.getScheme())) throw new IllegalArgumentException("Redirect URI must be http or https");
        if (!splitLines(client.redirectUris).contains(redirectUri)) throw new ForbiddenException("Redirect URI is not allowed");
    }

    private String normalizeScopes(OAuthClient client, String requestedScope) {
        Set<String> allowed = new LinkedHashSet<>(splitScopes(StringUtils.hasText(client.scopes) ? client.scopes : defaultScopes));
        List<String> requested = splitScopes(StringUtils.hasText(requestedScope) ? requestedScope : String.join(" ", allowed));
        if (!allowed.containsAll(requested)) throw new ForbiddenException("Requested scope is not allowed");
        return String.join(" ", requested);
    }

    private String buildRedirectUri(String redirectUri, String code, String state) {
        String separator = redirectUri.contains("?") ? "&" : "?";
        StringBuilder builder = new StringBuilder(redirectUri)
            .append(separator)
            .append("code=")
            .append(URLEncoder.encode(code, StandardCharsets.UTF_8));
        if (StringUtils.hasText(state)) {
            builder.append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
        }
        return builder.toString();
    }

    static List<String> splitScopes(String value) {
        return Arrays.stream(Optional.ofNullable(value).orElse("").trim().split("\\s+")).filter(StringUtils::hasText).distinct().toList();
    }

    private static List<String> splitLines(String value) {
        return Arrays.stream(Optional.ofNullable(value).orElse("").split("\\R")).map(String::trim).filter(StringUtils::hasText).toList();
    }

    private static String normalizeOptional(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
