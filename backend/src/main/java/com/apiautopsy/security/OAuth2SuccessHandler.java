package com.apiautopsy.security;

import com.apiautopsy.auth.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(AuthService authService, @Value("${app.cors.allowed-origins}") String origins) {
        this.authService = authService;
        this.frontendUrl = origins.split(",")[0];
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        String token = authService.loginWithGoogle(principal.getAttribute("email"), principal.getAttribute("name"), principal.getAttribute("sub"));
        response.sendRedirect(frontendUrl + "/oauth/callback?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));
    }
}
