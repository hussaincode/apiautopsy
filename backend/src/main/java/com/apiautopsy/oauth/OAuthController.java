package com.apiautopsy.oauth;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.apiautopsy.oauth.OAuthDtos.*;

@RestController
@RequestMapping("/api/oauth")
public class OAuthController {
    private final OAuthAuthorizationService service;

    public OAuthController(OAuthAuthorizationService service) {
        this.service = service;
    }

    @GetMapping("/authorize/preview")
    public ClientPreviewResponse preview(@RequestParam("client_id") String clientId, @RequestParam("redirect_uri") String redirectUri, @RequestParam(value = "scope", required = false) String scope) {
        return service.preview(clientId, redirectUri, scope);
    }

    @PostMapping("/authorize")
    public AuthorizeResponse authorize(@Valid @RequestBody AuthorizeRequest request) {
        return service.authorize(SecurityUtils.currentUser(), request);
    }

    @GetMapping("/connected-apps")
    public List<ConnectedAppResponse> connectedApps() {
        return service.connectedApps(SecurityUtils.currentUser().id());
    }

    @DeleteMapping("/connected-apps/{tokenId}")
    public void revokeConnectedApp(@PathVariable UUID tokenId) {
        service.revokeConnectedApp(SecurityUtils.currentUser(), tokenId);
    }

    @PostMapping(value = "/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public TokenResponse token(
        @RequestParam("grant_type") String grantType,
        @RequestParam("client_id") String clientId,
        @RequestParam("code") String code,
        @RequestParam("redirect_uri") String redirectUri,
        @RequestParam(value = "code_verifier", required = false) String codeVerifier
    ) {
        return service.exchangeCode(grantType, clientId, code, redirectUri, codeVerifier);
    }
}
