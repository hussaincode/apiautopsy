package com.apiautopsy.security;

import com.apiautopsy.integrations.IntegrationApiKeyService;
import com.apiautopsy.oauth.OAuthAccessTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final IntegrationApiKeyService apiKeyService;
    private final OAuthAccessTokenService oAuthAccessTokenService;

    public JwtAuthenticationFilter(JwtService jwtService, IntegrationApiKeyService apiKeyService, OAuthAccessTokenService oAuthAccessTokenService) {
        this.jwtService = jwtService;
        this.apiKeyService = apiKeyService;
        this.oAuthAccessTokenService = oAuthAccessTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                String token = header.substring(7);
                CurrentUser user = parseUser(token);
                var auth = new UsernamePasswordAuthenticationToken(user, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private CurrentUser parseUser(String token) {
        if (token.startsWith("aat_")) return apiKeyService.authenticate(token);
        if (token.startsWith("aao_")) return oAuthAccessTokenService.authenticate(token);
        return jwtService.parse(token);
    }
}
