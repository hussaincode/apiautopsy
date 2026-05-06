package com.apiautopsy.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CryptoServiceTest {
    private final CryptoService crypto = new CryptoService("0123456789abcdef0123456789abcdef");

    @Test
    void encryptsAndDecryptsValuesWithRandomIv() {
        String first = crypto.encrypt("secret-api-key");
        String second = crypto.encrypt("secret-api-key");

        assertThat(first).isNotEqualTo("secret-api-key");
        assertThat(first).isNotEqualTo(second);
        assertThat(crypto.decrypt(first)).isEqualTo("secret-api-key");
        assertThat(crypto.decrypt(second)).isEqualTo("secret-api-key");
    }

    @Test
    void keepsBlankValuesNull() {
        assertThat(crypto.encrypt(" ")).isNull();
        assertThat(crypto.decrypt("")).isNull();
    }

    @Test
    void rejectsTamperedCiphertext() {
        String encrypted = crypto.encrypt("token");
        String tampered = encrypted.substring(0, encrypted.length() - 2) + "aa";

        assertThatThrownBy(() -> crypto.decrypt(tampered))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Decryption failed");
    }
}

