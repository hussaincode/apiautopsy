package com.apiautopsy.security;

import com.apiautopsy.users.Role;
import com.apiautopsy.users.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {
    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    void issuesAndParsesSignedJwt() {
        JwtService jwt = new JwtService(SECRET, 15);
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = "founder@apiautopsy.com";
        user.role = Role.USER;

        CurrentUser parsed = jwt.parse(jwt.issue(user));

        assertThat(parsed.id()).isEqualTo(user.id);
        assertThat(parsed.email()).isEqualTo(user.email);
        assertThat(parsed.role()).isEqualTo("USER");
    }

    @Test
    void rejectsTokensSignedWithDifferentSecret() {
        JwtService issuer = new JwtService(SECRET, 15);
        JwtService parser = new JwtService("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", 15);
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = "founder@apiautopsy.com";
        user.role = Role.USER;

        assertThatThrownBy(() -> parser.parse(issuer.issue(user))).isInstanceOf(RuntimeException.class);
    }
}
