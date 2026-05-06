package com.apiautopsy.executions;

import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SsrfGuardTest {
    private final SsrfGuard guard = new SsrfGuard();

    @Test
    void allowsExternalHttpUrls() {
        URI uri = guard.validateExternalHttpUrl("https://93.184.216.34/users?page=1");

        assertThat(uri.getScheme()).isEqualTo("https");
        assertThat(uri.getHost()).isEqualTo("93.184.216.34");
    }

    @Test
    void blocksNonHttpSchemes() {
        assertThatThrownBy(() -> guard.validateExternalHttpUrl("file:///etc/passwd"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Only http and https");
    }

    @Test
    void blocksLoopbackAndPrivateTargets() {
        assertThatThrownBy(() -> guard.validateExternalHttpUrl("http://127.0.0.1:8080"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Internal network targets are blocked");

        assertThatThrownBy(() -> guard.validateExternalHttpUrl("http://10.0.0.10"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Internal network targets are blocked");
    }
}
