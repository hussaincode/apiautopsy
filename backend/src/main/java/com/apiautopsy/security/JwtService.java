package com.apiautopsy.security;

import com.apiautopsy.users.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final SecretKey key;
    private final long ttlMinutes;

    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.ttl-minutes}") long ttlMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttlMinutes = ttlMinutes;
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("role", user.role.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(ttlMinutes * 60)))
            .signWith(key)
            .compact();
    }

    public CurrentUser parse(String token) {
        var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        return new CurrentUser(UUID.fromString(claims.getSubject()), claims.get("email", String.class), claims.get("role", String.class));
    }
}
